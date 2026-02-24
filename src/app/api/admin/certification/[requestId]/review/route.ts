import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { sendEmail } from '@/lib/n8n';
import {
  buildCertificationApprovedEmail,
  buildCertificationRejectedEmail,
  buildGoldApprovedEmail,
} from '@/lib/certification-emails';

/**
 * POST /api/admin/certification/[requestId]/review
 * Approuve ou rejette une demande de certification.
 * Body: { decision: 'approved' | 'rejected', feedback?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifier admin
    const { data: profile } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const { decision, feedback } = body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'decision requis (approved ou rejected)' }, { status: 400 });
    }

    // Recuperer la demande
    const { data: certRequest } = await serviceClient
      .from('certification_requests')
      .select('*, skill:skills(id, title, certification, creator_id)')
      .eq('id', requestId)
      .single();

    if (!certRequest) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    if (certRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Cette demande a deja ete traitee' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Mettre a jour la demande
    await serviceClient
      .from('certification_requests')
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: now,
        feedback: feedback || null,
      })
      .eq('id', requestId);

    // Si approuve, certifier le skill
    if (decision === 'approved') {
      await serviceClient
        .from('skills')
        .update({
          certification: certRequest.requested_level,
          certified_at: now,
          certification_reviewed_at: now,
          certification_reviewer_id: user.id,
          certification_feedback: feedback || null,
        })
        .eq('id', certRequest.skill_id);

      // Ajouter dans skill_certifications
      await serviceClient.from('skill_certifications').insert({
        skill_id: certRequest.skill_id,
        level: certRequest.requested_level,
        certified_by: user.id,
        criteria: feedback ? { notes: feedback } : null,
      });
    } else {
      // Rejete : mettre a jour le feedback
      await serviceClient
        .from('skills')
        .update({
          certification_reviewed_at: now,
          certification_reviewer_id: user.id,
          certification_feedback: feedback || null,
        })
        .eq('id', certRequest.skill_id);
    }

    // Envoyer notification email au createur
    try {
      const skill = certRequest.skill as { id: string; title: string; creator_id: string } | null;
      if (skill) {
        const { data: creator } = await serviceClient
          .from('users')
          .select('email, display_name, name')
          .eq('id', skill.creator_id)
          .single();

        if (creator?.email) {
          const creatorName = creator.display_name || creator.name || 'Createur';
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clawforge.io';

          if (decision === 'approved') {
            if (certRequest.requested_level === 'gold') {
              const html = buildGoldApprovedEmail(creatorName, skill.title, baseUrl);
              await sendEmail(creator.email, 'Excellent ! Certification Gold obtenue', html);
            } else {
              const html = buildCertificationApprovedEmail(creatorName, skill.title, certRequest.requested_level, baseUrl);
              await sendEmail(creator.email, 'Felicitations ! Votre skill est certifie Silver', html);
            }
          } else {
            const html = buildCertificationRejectedEmail(creatorName, skill.title, certRequest.requested_level, feedback || '', baseUrl);
            await sendEmail(creator.email, 'Votre skill n\'a pas encore atteint le niveau Silver', html);
          }
        }
      }
    } catch (emailError) {
      console.error('certification review email error:', emailError);
    }

    return NextResponse.json({
      success: true,
      request_id: requestId,
      decision,
      message: decision === 'approved'
        ? `Skill certifie ${certRequest.requested_level === 'gold' ? 'Gold' : 'Silver'}`
        : 'Demande rejetee, createur notifie',
    });
  } catch (error) {
    console.error('certification review error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
