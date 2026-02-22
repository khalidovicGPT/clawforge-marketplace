import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { certifySkill, rejectSkill, requestSkillChanges, runSkillCertification } from '@/lib/skill-certification';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/skills/[id]/certify
 *
 * Valide, rejette ou demande des modifications sur un skill (Silver/Gold).
 * Accessible par les admins (session) ou les agents (cle API QualityClaw).
 *
 * Body:
 *   { action: 'validate' }  — lance la validation Bronze+Silver automatique (pour skills en attente)
 *   { action: 'approve', level: 'silver', notes?: string }
 *   { action: 'reject', reason: string, feedback?: string }
 *   { action: 'request_changes', feedback: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: skillId } = await params;
    let userId: string | null = null;

    // Auth: soit session admin, soit cle API agent
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      const auth = await authenticateAgentKey(apiKey);
      if (auth && (auth.creatorRole === 'admin' || auth.permissions.includes('certify'))) {
        userId = auth.creatorId;
      }
    }

    if (!userId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const serviceClient = createServiceClient();
          const { data: profile } = await serviceClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile?.role === 'admin') userId = user.id;
        }
      } catch {
        // Pas de session
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // Lancer la validation Bronze+Silver automatique sur un skill en attente
    if (action === 'validate') {
      const serviceClient = createServiceClient();
      const { data: skill } = await serviceClient
        .from('skills')
        .select('id, status')
        .eq('id', skillId)
        .single();

      if (!skill) {
        return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
      }

      if (skill.status !== 'pending' && skill.status !== 'changes_requested') {
        return NextResponse.json({
          error: `Le skill a le status '${skill.status}'. Seuls les skills en attente ou avec modifications demandees peuvent etre valides.`,
        }, { status: 400 });
      }

      const result = await runSkillCertification(skillId);

      return NextResponse.json({
        success: true,
        skill_id: skillId,
        action: 'validated',
        bronze: result.bronze,
        silver_score: result.silver?.score ?? null,
        final_status: result.finalStatus,
        certification: result.certification,
        message: result.finalStatus === 'pending_silver_review'
          ? `Validation Bronze OK. Score Silver: ${result.silver?.score}/100. En attente de review Silver.`
          : result.finalStatus === 'rejected'
          ? `Validation echouee: ${result.bronze.errors.join(', ')}`
          : `Bronze OK. Score Silver insuffisant (${result.silver?.score ?? 0}/100 < 80). Reste en Bronze.`,
      });
    }

    if (action === 'approve') {
      const { level, notes } = body;
      if (!level || !['silver', 'gold'].includes(level)) {
        return NextResponse.json({ error: 'level requis (silver ou gold)' }, { status: 400 });
      }

      const result = await certifySkill(skillId, level, userId, notes);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        skill_id: skillId,
        action: 'approved',
        level,
        certified_at: new Date().toISOString(),
        message: `Skill valide ${level.charAt(0).toUpperCase() + level.slice(1)}.`,
      });
    }

    if (action === 'reject') {
      const { reason } = body;
      if (!reason) {
        return NextResponse.json({ error: 'reason requis' }, { status: 400 });
      }

      const result = await rejectSkill(skillId, reason, userId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        skill_id: skillId,
        action: 'rejected',
        message: 'Skill rejete. Feedback envoye au createur.',
      });
    }

    if (action === 'request_changes') {
      const { feedback } = body;
      if (!feedback) {
        return NextResponse.json({ error: 'feedback requis' }, { status: 400 });
      }

      const result = await requestSkillChanges(skillId, feedback, userId);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        skill_id: skillId,
        action: 'changes_requested',
        message: 'Modifications demandees. Feedback envoye au createur.',
      });
    }

    return NextResponse.json({ error: 'action requis (approve, reject ou request_changes)' }, { status: 400 });
  } catch (error) {
    console.error('certify error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
