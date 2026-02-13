import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * POST /api/admin/promote
 * Promote the currently logged-in user to admin role.
 * Requires ADMIN_SECRET_KEY in the request body for security.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const adminSecret = process.env.ADMIN_SECRET_KEY;

    // Must provide the secret key
    if (!adminSecret || body.secret !== adminSecret) {
      return NextResponse.json({ error: 'Secret invalide' }, { status: 403 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Configuration serveur incomplete' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await supabaseAdmin
      .from('users')
      .update({ role: 'admin' })
      .eq('id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[ADMIN] User ${user.email} (${user.id}) promoted to admin`);

    return NextResponse.json({
      success: true,
      message: `${user.email} est maintenant admin`,
    });
  } catch (error) {
    console.error('Promote admin error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
