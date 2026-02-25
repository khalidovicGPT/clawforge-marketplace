import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendReactivationEmail } from '@/lib/skill-management-emails';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/skills/[id]/reactivate
 * Reactivation d'un skill retire/rejete/bloque.
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
    const { note } = body;

    const serviceClient = createServiceClient();

    const { data: skill, error: fetchError } = await serviceClient
      .from('skills')
      .select('*, creator:users!skills_creator_id_fkey(id, name, email)')
      .eq('id', id)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json({ error: 'Skill non trouve' }, { status: 404 });
    }

    if (!['withdrawn', 'rejected', 'blocked'].includes(skill.status)) {
      return NextResponse.json(
        { error: 'Seul un skill retire, rejete ou bloque peut etre reactive' },
        { status: 400 },
      );
    }

    const previousStatus = skill.status;
    const now = new Date().toISOString();

    // Determiner le statut de retour
    // Si le skill etait publie avant le retrait, on le remet en published
    // Sinon on le met en pending pour re-validation
    const newStatus = skill.published_at && skill.certified_at ? 'published' : 'pending';

    const { error: updateError } = await serviceClient
      .from('skills')
      .update({
        status: newStatus,
        reactivated_at: now,
        reactivated_by: user.id,
        is_visible: newStatus === 'published',
        // Reset des champs de blocage/retrait
        withdrawn_by: null,
        withdrawn_at: null,
        withdrawn_reason: null,
        blocked_at: null,
        blocked_by: null,
        blocked_reason: null,
        blocked_permanently: false,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Historique
    await serviceClient.from('skill_admin_history').insert({
      skill_id: id,
      action: 'reactivated',
      action_by: user.id,
      reason: (note || '').trim() || null,
      previous_status: previousStatus,
      new_status: newStatus,
    });

    // Email au createur
    try {
      if (skill.creator?.email) {
        await sendReactivationEmail(
          skill.creator.email,
          skill.creator.name || 'Createur',
          skill.title,
        );
      }
    } catch (emailError) {
      console.error('Erreur envoi email reactivation:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: `Skill reactive (statut: ${newStatus})`,
      newStatus,
    });
  } catch (error) {
    console.error('Admin reactivate error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
