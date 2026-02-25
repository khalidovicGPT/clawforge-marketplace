import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/skills/[id]/history
 * Historique des actions admin sur un skill.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
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

    const { data: history, error } = await serviceClient
      .from('skill_admin_history')
      .select(`
        *,
        admin:users!skill_admin_history_action_by_fkey(id, name, email)
      `)
      .eq('skill_id', id)
      .order('action_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: history || [] });
  } catch (error) {
    console.error('Admin history error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
