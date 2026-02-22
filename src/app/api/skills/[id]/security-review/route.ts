import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/skills/[id]/security-review
 *
 * Soumet une analyse de securite pour un skill (par QualityClaw ou admin).
 *
 * Body: {
 *   reviewer?: string,
 *   findings: { critical: [], high: [], medium: [], low: [] },
 *   network_calls?: string[],
 *   file_access?: string[],
 *   recommendations?: string[],
 *   score: number,
 *   verdict: 'approve' | 'reject' | 'request_changes'
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: skillId } = await params;
    let userId: string | null = null;

    // Auth
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      const auth = await authenticateAgentKey(apiKey);
      if (auth && (auth.creatorRole === 'admin' || auth.permissions.includes('certify') || auth.permissions.includes('review'))) {
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
    const { findings, network_calls, file_access, recommendations, score, verdict } = body;

    if (!verdict || !['approve', 'reject', 'request_changes'].includes(verdict)) {
      return NextResponse.json({ error: 'verdict requis (approve, reject, request_changes)' }, { status: 400 });
    }

    if (score === undefined || score < 0 || score > 100) {
      return NextResponse.json({ error: 'score requis (0-100)' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('skill_security_reviews')
      .insert({
        skill_id: skillId,
        reviewer_id: userId,
        reviewer_name: body.reviewer || 'Admin',
        findings,
        network_calls: network_calls || [],
        file_access: file_access || [],
        recommendations: recommendations || [],
        score,
        verdict,
      });

    if (error) {
      console.error('security-review insert error:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      skill_id: skillId,
      verdict,
      score,
      message: `Analyse de securite enregistree (verdict: ${verdict})`,
    });
  } catch (error) {
    console.error('security-review error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
