import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ensureUserProfile } from '@/lib/ensure-profile';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check with user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    // Use service role to bypass RLS, fallback to user session (admin RLS policy exists)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    let db = supabase;
    if (serviceRoleKey && supabaseUrl) {
      db = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    } else {
      console.warn('[ADMIN] SUPABASE_SERVICE_ROLE_KEY not set, using user session with admin RLS');
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('status') || 'pending';

    // Try with join first, fallback to no join
    let skills;
    let queryError;

    // Attempt 1: query with creator join (simple syntax, no FK hint)
    {
      let query = db
        .from('skills')
        .select(`*, creator:users(id, name, email, avatar_url)`)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (!error) {
        skills = data;
      } else {
        console.warn('Admin skills join query failed, trying without join:', error.message);
        queryError = error;
      }
    }

    // Attempt 2: if join failed, query skills without join
    if (!skills && queryError) {
      let query = db
        .from('skills')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Admin skills fetch error (no join):', error);
        return NextResponse.json(
          { error: 'Erreur base de donnees', details: error.message },
          { status: 500 }
        );
      }

      // Manually fetch creator info for each unique creator_id
      const creatorIds = [...new Set((data || []).map(s => s.creator_id))];
      const { data: creators } = creatorIds.length > 0
        ? await db
            .from('users')
            .select('id, name, email, avatar_url')
            .in('id', creatorIds)
        : { data: [] };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const creatorsMap: Record<string, any> = {};
      (creators || []).forEach((c: any) => { creatorsMap[c.id] = c; });

      skills = (data || []).map(skill => ({
        ...skill,
        creator: creatorsMap[skill.creator_id] || null,
      }));
    }

    // Fetch VirusTotal test results
    const skillIds = (skills || []).map((s: any) => s.id);
    const { data: tests } = skillIds.length > 0
      ? await db
          .from('skill_tests')
          .select('*')
          .in('skill_id', skillIds)
      : { data: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testsMap: Record<string, any> = {};
    (tests || []).forEach((t: any) => { testsMap[t.skill_id] = t; });

    const enriched = (skills || []).map((skill: any) => ({
      ...skill,
      test: testsMap[skill.id] || null,
    }));

    return NextResponse.json({ skills: enriched });
  } catch (error) {
    console.error('Admin skills API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
