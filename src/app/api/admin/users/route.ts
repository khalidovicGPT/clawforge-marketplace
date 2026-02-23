import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile } from '@/lib/ensure-profile';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Admin check
    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    // Params
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    const serviceClient = createServiceClient();

    // Build query
    let query = serviceClient
      .from('users')
      .select('id, email, name, avatar_url, role, stripe_account_id, stripe_onboarding_complete, created_at, updated_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (role && ['user', 'creator', 'admin'].includes(role)) {
      query = query.eq('role', role);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Admin users fetch error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des utilisateurs', details: error.message },
        { status: 500 }
      );
    }

    // Compter les skills par utilisateur
    const userIds = (users || []).map(u => u.id);
    let skillCounts: Record<string, number> = {};

    if (userIds.length > 0) {
      const { data: skills } = await serviceClient
        .from('skills')
        .select('creator_id')
        .in('creator_id', userIds);

      if (skills) {
        skillCounts = skills.reduce((acc: Record<string, number>, s) => {
          acc[s.creator_id] = (acc[s.creator_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const enrichedUsers = (users || []).map(u => ({
      ...u,
      skills_count: skillCounts[u.id] || 0,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
