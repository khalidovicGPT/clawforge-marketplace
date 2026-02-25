import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendWithdrawByAdminEmail } from '@/lib/skill-management-emails';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/skills/[id]/withdraw
 * Retrait force par l'admin.
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
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'La raison du retrait est obligatoire' }, { status: 400 });
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

    if (skill.status === 'withdrawn') {
      return NextResponse.json({ error: 'Ce skill est deja retire' }, { status: 400 });
    }

    if (skill.status === 'blocked') {
      return NextResponse.json({ error: 'Ce skill est bloque, utilisez la reactivation' }, { status: 400 });
    }

    const previousStatus = skill.status;
    const now = new Date().toISOString();

    const { error: updateError } = await serviceClient
      .from('skills')
      .update({
        status: 'withdrawn',
        withdrawn_by: 'admin',
        withdrawn_at: now,
        withdrawn_reason: reason.trim(),
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
      action: 'withdrawn',
      action_by: user.id,
      reason: reason.trim(),
      previous_status: previousStatus,
      new_status: 'withdrawn',
    });

    // Email au createur
    try {
      if (skill.creator?.email) {
        await sendWithdrawByAdminEmail(
          skill.creator.email,
          skill.creator.name || 'Createur',
          skill.title,
          reason.trim(),
        );
      }
    } catch (emailError) {
      console.error('Erreur envoi email retrait:', emailError);
    }

    return NextResponse.json({ success: true, message: 'Skill retire avec succes' });
  } catch (error) {
    console.error('Admin withdraw error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
