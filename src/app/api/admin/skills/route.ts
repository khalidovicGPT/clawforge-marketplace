import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { ensureUserProfile } from '@/lib/ensure-profile';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('status') || 'pending';

    let query = supabase
      .from('skills')
      .select(`
        *,
        creator:users!skills_creator_id_fkey(id, display_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data: skills, error } = await query;

    if (error) {
      console.error('Admin skills fetch error:', error);
      return NextResponse.json({ error: 'Erreur base de donnees' }, { status: 500 });
    }

    // Fetch VirusTotal test results for each skill
    const skillIds = (skills || []).map(s => s.id);
    const { data: tests } = skillIds.length > 0
      ? await supabase
          .from('skill_tests')
          .select('*')
          .in('skill_id', skillIds)
      : { data: [] };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testsMap: Record<string, any> = {};
    (tests || []).forEach((t: any) => {
      testsMap[t.skill_id] = t;
    });

    const enriched = (skills || []).map(skill => ({
      ...skill,
      test: testsMap[skill.id] || null,
    }));

    return NextResponse.json({ skills: enriched });
  } catch (error) {
    console.error('Admin skills API error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
