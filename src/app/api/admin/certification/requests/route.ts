import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/admin/certification/requests
 * Liste toutes les demandes de certification (admin uniquement).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    // Recuperer toutes les demandes avec les infos skill et createur
    const { data: requests, error } = await serviceClient
      .from('certification_requests')
      .select(`
        *,
        skill:skills(id, title, slug, certification, quality_score, creator_id),
        requester:users!certification_requests_requested_by_fkey(id, email, display_name, name),
        reviewer:users!certification_requests_reviewed_by_fkey(id, email, display_name, name)
      `)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('certification requests fetch error:', error);
      // Fallback sans jointure si FK manquante
      const { data: fallbackRequests } = await serviceClient
        .from('certification_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      // Enrichir manuellement
      const enriched = await Promise.all(
        (fallbackRequests || []).map(async (req: { skill_id: string; requested_by: string; reviewed_by: string | null }) => {
          const { data: skill } = await serviceClient
            .from('skills')
            .select('id, title, slug, certification, quality_score, creator_id')
            .eq('id', req.skill_id)
            .single();

          const { data: requester } = await serviceClient
            .from('users')
            .select('id, email, display_name, name')
            .eq('id', req.requested_by)
            .single();

          let reviewer = null;
          if (req.reviewed_by) {
            const { data: rev } = await serviceClient
              .from('users')
              .select('id, email, display_name, name')
              .eq('id', req.reviewed_by)
              .single();
            reviewer = rev;
          }

          return { ...req, skill, requester, reviewer };
        }),
      );

      return NextResponse.json(enriched);
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error('admin certification requests error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
