import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { certifySkill, rejectSkill } from '@/lib/skill-certification';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/skills/[id]/certify
 *
 * Valide ou rejette un skill (Silver/Gold).
 * Accessible par les admins (session) ou les agents (cle API QualityClaw).
 *
 * Body:
 *   { action: 'approve', level: 'silver', notes?: string }
 *   { action: 'reject', reason: string, feedback?: string }
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

    return NextResponse.json({ error: 'action requis (approve ou reject)' }, { status: 400 });
  } catch (error) {
    console.error('certify error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
