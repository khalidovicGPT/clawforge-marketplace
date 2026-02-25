import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendRejectionEmail } from '@/lib/skill-management-emails';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/skills/[id]/reject
 * Rejet lors de la validation admin.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { reason, feedback } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'La raison du rejet est obligatoire' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: skill, error: fetchError } = await serviceClient
      .from('skills')
      .select('*, creator:users!skills_creator_id_fkey(id, name, email)')
      .eq('id', id)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json({ error: 'Skill non trouve' }, { status: 404 });
    }

    const previousStatus = skill.status;
    const now = new Date().toISOString();

    const { error: updateError } = await serviceClient
      .from('skills')
      .update({
        status: 'rejected',
        rejected_at: now,
        rejected_by: user.id,
        rejection_reason: reason.trim(),
        rejection_feedback: (feedback || '').trim() || null,
        is_visible: false,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Historique
    await serviceClient.from('skill_admin_history').insert({
      skill_id: id,
      action: 'rejected',
      action_by: user.id,
      reason: reason.trim(),
      previous_status: previousStatus,
      new_status: 'rejected',
    });

    // Email au createur
    try {
      if (skill.creator?.email) {
        await sendRejectionEmail(
          skill.creator.email,
          skill.creator.name || 'Createur',
          skill.title,
          reason.trim(),
          (feedback || '').trim(),
        );
      }
    } catch (emailError) {
      console.error('Erreur envoi email rejet:', emailError);
    }

    return NextResponse.json({ success: true, message: 'Skill rejete' });
  } catch (error) {
    console.error('Admin reject error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
