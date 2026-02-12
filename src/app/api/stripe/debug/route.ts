import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/stripe/debug
 * Diagnostic endpoint to check Stripe + env configuration.
 * Safe in test mode — remove before going to production.
 */
export async function GET() {
  const checks: Record<string, unknown> = {};

  // 1. Env vars present?
  checks.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
    ? `set (${process.env.STRIPE_SECRET_KEY.substring(0, 12)}...)`
    : 'MISSING';
  checks.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? `set (${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 12)}...)`
    : 'MISSING';
  checks.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'MISSING';
  checks.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING';

  // 2. Stripe client initialized?
  checks.stripe_client = stripe ? 'initialized' : 'null (STRIPE_SECRET_KEY missing or invalid)';

  // 3. Can we call Stripe API?
  if (stripe) {
    try {
      const balance = await stripe.balance.retrieve();
      checks.stripe_api_call = 'OK';
      checks.stripe_mode = balance.livemode ? 'LIVE' : 'TEST';
    } catch (err) {
      checks.stripe_api_call = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // 4. Can we create a Connect account? (dry check — list accounts)
  if (stripe) {
    try {
      const accounts = await stripe.accounts.list({ limit: 1 });
      checks.stripe_connect = `OK (${accounts.data.length > 0 ? 'has accounts' : 'no accounts yet'})`;
    } catch (err) {
      checks.stripe_connect = `FAILED: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // 5. Auth check
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    checks.auth = user ? `logged in as ${user.email}` : `not logged in (${error?.message || 'no session'})`;
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('stripe_account_id, stripe_onboarding_complete, role, email')
        .eq('id', user.id)
        .single();
      checks.user_profile = profile || 'not found in users table';
    }
  } catch (err) {
    checks.auth = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  return NextResponse.json({ diagnostic: checks }, { status: 200 });
}
