import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non connecté', authError }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Check if user exists in public.users
    const { data: profile, error: profileError } = await serviceClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check purchases for this user
    const { data: purchases, error: purchasesError } = await serviceClient
      .from('purchases')
      .select('*')
      .eq('user_id', user.id);

    // Count total purchases in the system
    const { count: totalPurchases } = await serviceClient
      .from('purchases')
      .select('*', { count: 'exact', head: true });

    // Count total users in the system
    const { count: totalUsers } = await serviceClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      auth_user: {
        id: user.id,
        email: user.email,
        provider: user.app_metadata?.provider,
        created_at: user.created_at,
      },
      profile_exists: !!profile,
      profile,
      profile_error: profileError?.message || null,
      purchases,
      purchases_error: purchasesError?.message || null,
      purchases_count: purchases?.length || 0,
      system_totals: {
        total_users: totalUsers,
        total_purchases: totalPurchases,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
