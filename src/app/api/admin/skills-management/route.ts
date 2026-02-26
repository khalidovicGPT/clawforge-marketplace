import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/admin/skills-management
 * Liste tous les skills avec filtres pour la gestion admin.
 * Query params: status, certification, creator, from, to, page, limit, sort
 */
export async function GET(request: NextRequest) {
  try {
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

    const serviceClient = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const status = searchParams.get('status');
    const certification = searchParams.get('certification');
    const creator = searchParams.get('creator');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    let query = serviceClient
      .from('skills')
      .select(`
        *,
        creator:users!skills_creator_id_fkey(id, name, email, avatar_url)
      `, { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (certification && certification !== 'all') {
      query = query.eq('certification', certification);
    }

    if (creator) {
      const sanitized = creator.replace(/[,().\\]/g, '');
      query = query.eq('creator_id', sanitized);
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    const offset = (page - 1) * limit;
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: skills, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrichir avec le nombre de ventes par skill
    const skillIds = (skills || []).map((s: { id: string }) => s.id);
    let purchaseCounts: Record<string, number> = {};
    if (skillIds.length > 0) {
      const { data: purchases } = await serviceClient
        .from('purchases')
        .select('skill_id');

      if (purchases) {
        for (const p of purchases) {
          if (skillIds.includes(p.skill_id)) {
            purchaseCounts[p.skill_id] = (purchaseCounts[p.skill_id] || 0) + 1;
          }
        }
      }
    }

    const enriched = (skills || []).map((skill: Record<string, unknown>) => ({
      ...skill,
      sales_count: purchaseCounts[skill.id as string] || 0,
    }));

    return NextResponse.json({
      skills: enriched,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Admin skills-management error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
