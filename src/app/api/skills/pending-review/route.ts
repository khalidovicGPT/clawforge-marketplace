import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/skills/pending-review
 *
 * Liste les skills en attente de validation Silver/Gold.
 * Accessible par les admins (session) ou les agents (cle API).
 */
export async function GET(request: NextRequest) {
  try {
    // Auth: soit session admin, soit cle API agent
    let isAuthorized = false;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      const auth = await authenticateAgentKey(apiKey);
      if (auth && (auth.creatorRole === 'admin' || auth.permissions.includes('skills:certify'))) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
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
          if (profile?.role === 'admin') isAuthorized = true;
        }
      } catch {
        // Pas de session
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // Skills en attente Silver
    const { data: silverQueue } = await supabase
      .from('skill_validation_queue')
      .select(`
        skill_id,
        status,
        silver_score,
        silver_criteria,
        created_at,
        skills(id, title, slug, version, creator_id, file_url)
      `)
      .eq('status', 'pending_silver_review')
      .order('created_at', { ascending: true });

    // Skills eligibles Gold (Silver + 50 ventes + note > 4.5)
    const { data: goldCandidates } = await supabase
      .from('skills')
      .select('id, title, slug, version, downloads_count, rating_avg, rating_count, certification')
      .eq('certification', 'silver')
      .gte('downloads_count', 50)
      .gte('rating_avg', 4.5);

    // Skills rejetes recemment
    const { data: rejected } = await supabase
      .from('skill_validation_queue')
      .select(`
        skill_id,
        rejection_reason,
        processed_at,
        skills(id, title, slug)
      `)
      .eq('status', 'rejected')
      .order('processed_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      silver_queue: (silverQueue || []).map(q => {
        const skill = q.skills as unknown as Record<string, unknown> | null;
        return {
          skill_id: q.skill_id,
          name: skill?.title,
          slug: skill?.slug,
          version: skill?.version,
          silver_score: q.silver_score,
          criteria: q.silver_criteria,
          submitted_at: q.created_at,
        };
      }),
      gold_eligible: (goldCandidates || []).map(s => ({
        skill_id: s.id,
        name: s.title,
        sales: s.downloads_count,
        rating: s.rating_avg,
        rating_count: s.rating_count,
      })),
      rejected: (rejected || []).map(r => {
        const skill = r.skills as unknown as Record<string, unknown> | null;
        return {
          skill_id: r.skill_id,
          name: skill?.title,
          reason: r.rejection_reason,
          rejected_at: r.processed_at,
        };
      }),
    });
  } catch (error) {
    console.error('pending-review error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
