import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ensureUserProfile } from '@/lib/ensure-profile';

const certifySchema = z.object({
  certification: z.enum(['bronze', 'silver', 'gold', 'rejected']),
  comment: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: skillId } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Admin check
    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const parsed = certifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { certification, comment } = parsed.data;

    // Service role for bypassing RLS
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplete' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify skill exists
    const { data: skill, error: fetchError } = await supabaseAdmin
      .from('skills')
      .select('id, title, status')
      .eq('id', skillId)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }

    // Build update
    const now = new Date().toISOString();
    const isRejected = certification === 'rejected';

    const updateData: Record<string, unknown> = {
      status: isRejected ? 'rejected' : 'certified',
      certification: isRejected ? 'none' : certification,
      certified_at: isRejected ? null : now,
      updated_at: now,
    };

    const { error: updateError } = await supabaseAdmin
      .from('skills')
      .update(updateData)
      .eq('id', skillId);

    if (updateError) {
      console.error('Skill certification update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour' },
        { status: 500 }
      );
    }

    // Log the action
    console.log(
      `[ADMIN] ${user.email} (${user.id}) ${isRejected ? 'rejected' : 'certified'} skill "${skill.title}" (${skillId}) as ${certification}` +
        (comment ? ` — comment: ${comment}` : '')
    );

    return NextResponse.json({
      success: true,
      message: isRejected
        ? 'Skill rejete avec succes'
        : `Skill certifie ${certification} avec succes`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Donnees invalides', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Certify API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
