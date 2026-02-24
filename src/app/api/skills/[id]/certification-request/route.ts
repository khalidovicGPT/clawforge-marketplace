import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSkillCertificationStatus } from '@/lib/certification-status';
import { sendEmail } from '@/lib/n8n';
import { buildCertificationRequestEmail } from '@/lib/certification-emails';

/**
 * POST /api/skills/[id]/certification-request
 * Soumet une demande de certification Silver ou Gold.
 * Body: { requested_level: 'silver' | 'gold' }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: skillId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const { requested_level } = body;

    if (!requested_level || !['silver', 'gold'].includes(requested_level)) {
      return NextResponse.json({ error: 'requested_level requis (silver ou gold)' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    // Verifier que l'utilisateur est le createur
    const { data: skill } = await serviceClient
      .from('skills')
      .select('id, creator_id, certification, quality_score, title')
      .eq('id', skillId)
      .single();

    if (!skill) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }

    if (skill.creator_id !== user.id) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    // Verifier la hierarchie
    if (requested_level === 'silver' && skill.certification !== 'bronze') {
      return NextResponse.json({
        error: 'Le skill doit etre certifie Bronze avant de demander Silver',
      }, { status: 400 });
    }

    if (requested_level === 'gold' && skill.certification !== 'silver') {
      return NextResponse.json({
        error: 'Le skill doit etre certifie Silver avant de demander Gold',
      }, { status: 400 });
    }

    // Verifier qu'il n'y a pas deja une demande en cours
    const { data: existingRequest } = await serviceClient
      .from('certification_requests')
      .select('id, status')
      .eq('skill_id', skillId)
      .eq('status', 'pending')
      .limit(1)
      .single();

    if (existingRequest) {
      return NextResponse.json({
        error: 'Une demande de certification est deja en cours pour ce skill',
      }, { status: 409 });
    }

    // Verifier que les criteres auto sont remplis
    const status = await getSkillCertificationStatus(skillId);
    if (!status.can_request_upgrade) {
      return NextResponse.json({
        error: 'Tous les criteres automatiques ne sont pas remplis',
        missing_criteria: status.missing_criteria,
      }, { status: 400 });
    }

    // Creer la demande
    const { data: certRequest, error } = await serviceClient
      .from('certification_requests')
      .insert({
        skill_id: skillId,
        requested_level,
        requested_by: user.id,
        quality_score_at_request: skill.quality_score || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('certification request insert error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Mettre a jour le skill
    await serviceClient
      .from('skills')
      .update({ certification_requested_at: new Date().toISOString() })
      .eq('id', skillId);

    // Envoyer email de confirmation
    try {
      const { data: creator } = await serviceClient
        .from('users')
        .select('email, display_name, name')
        .eq('id', user.id)
        .single();

      if (creator?.email) {
        const creatorName = creator.display_name || creator.name || 'Createur';
        const html = buildCertificationRequestEmail(
          creatorName,
          skill.title,
          requested_level,
          skill.quality_score || 0,
          status.criteria_status.filter(c => c.status === 'passed').length,
          status.criteria_status.length,
        );
        await sendEmail(
          creator.email,
          requested_level === 'silver'
            ? 'Votre demande de certification Silver est en cours d\'etude'
            : 'Votre demande de certification Gold est en cours d\'etude',
          html,
        );
      }
    } catch (emailError) {
      console.error('certification request email error:', emailError);
    }

    return NextResponse.json({
      success: true,
      request_id: certRequest.id,
      status: 'pending',
      estimated_review_time: '2-3 jours ouvres',
    });
  } catch (error) {
    console.error('certification-request error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
