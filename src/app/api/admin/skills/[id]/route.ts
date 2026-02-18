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

    // Use service role if available, fallback to user session (admin RLS policy exists)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let db = supabase;
    if (serviceRoleKey && supabaseUrl) {
      db = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else {
      console.warn('[ADMIN] SUPABASE_SERVICE_ROLE_KEY not set, using user session with admin RLS');
    }

    // Verify skill exists (include price and creator info)
    const { data: skill, error: fetchError } = await db
      .from('skills')
      .select('id, title, status, price, creator_id')
      .eq('id', skillId)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json(
        { error: 'Skill introuvable', details: fetchError?.message },
        { status: 404 }
      );
    }

    // Build update
    const isRejected = certification === 'rejected';

    // Check if paid skill and creator has Stripe configured
    let finalStatus: string = isRejected ? 'rejected' : 'published';
    if (!isRejected && skill.price && skill.price > 0) {
      const { data: creator } = await db
        .from('users')
        .select('stripe_account_id, stripe_onboarding_complete')
        .eq('id', skill.creator_id)
        .single();

      if (!creator?.stripe_account_id || !creator?.stripe_onboarding_complete) {
        finalStatus = 'pending_payment_setup';
      }
    }

    const updateData: Record<string, unknown> = {
      status: finalStatus,
      certification: isRejected ? 'none' : certification,
      certified_at: isRejected ? null : new Date().toISOString(),
      published_at: isRejected ? null : new Date().toISOString(),
    };

    const { error: updateError } = await db
      .from('skills')
      .update(updateData)
      .eq('id', skillId);

    if (updateError) {
      console.error('Skill certification update error:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise a jour', details: updateError.message },
        { status: 500 }
      );
    }

    // Log the action
    console.log(
      `[ADMIN] ${user.email} (${user.id}) ${isRejected ? 'rejected' : 'certified'} skill "${skill.title}" (${skillId}) as ${certification} → status: ${finalStatus}` +
        (comment ? ` — comment: ${comment}` : '')
    );

    return NextResponse.json({
      success: true,
      status: finalStatus,
      message: isRejected
        ? 'Skill rejete avec succes'
        : finalStatus === 'pending_payment_setup'
          ? `Skill certifie ${certification} — en attente configuration Stripe du createur`
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
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
