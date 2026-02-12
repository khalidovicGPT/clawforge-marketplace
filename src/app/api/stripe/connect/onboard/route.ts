import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, createConnectAccount, createAccountLink } from '@/lib/stripe';
import { ensureUserProfile } from '@/lib/ensure-profile';

export async function POST(request: NextRequest) {
  const step = { current: 'init' };
  try {
    // Step 1: Check Stripe configured
    step.current = 'stripe_check';
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe n\'est pas configuré. Vérifiez STRIPE_SECRET_KEY.', step: step.current },
        { status: 503 }
      );
    }

    // Step 2: Auth
    step.current = 'auth';
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: `Vous devez être connecté. ${authError?.message || ''}`, step: step.current },
        { status: 401 }
      );
    }

    // Step 3: Get or create profile
    step.current = 'ensure_profile';
    const profile = await ensureUserProfile(supabase, user);

    const email = profile.email || user.email;

    // Step 4: App URL (auto-detect from request if env var missing)
    step.current = 'app_url_check';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
    if (!appUrl || appUrl === 'https://null') {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_APP_URL non configuré et détection auto impossible', step: step.current },
        { status: 500 }
      );
    }

    // Step 5: Check existing Stripe account
    step.current = 'existing_account_check';
    const existingId = profile.stripe_account_id;
    const hasValidStripeAccount = existingId && existingId.startsWith('acct_');

    if (hasValidStripeAccount) {
      if (profile.stripe_onboarding_complete) {
        return NextResponse.json(
          { error: 'Vous êtes déjà inscrit comme créateur', redirect: '/dashboard' },
          { status: 400 }
        );
      }

      // Resume onboarding for existing valid account
      step.current = 'resume_onboarding';
      const accountLink = await createAccountLink(
        existingId,
        `${appUrl}/dashboard/seller?refresh=true`,
        `${appUrl}/dashboard/seller?onboarding=complete`
      );
      return NextResponse.json({ url: accountLink.url });
    }

    // Step 6: Validate email
    step.current = 'email_check';
    if (!email) {
      return NextResponse.json(
        { error: 'Email manquant sur le profil et sur l\'auth.', step: step.current },
        { status: 400 }
      );
    }

    // Step 7: Create Stripe Connect account
    step.current = 'create_connect_account';
    const account = await createConnectAccount(email);

    // Step 8: Save to DB
    step.current = 'save_to_db';
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false,
        role: 'creator',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('DB update error:', updateError);
      return NextResponse.json(
        { error: `Erreur DB : ${updateError.message}`, step: step.current },
        { status: 500 }
      );
    }

    // Step 9: Create onboarding link
    step.current = 'create_account_link';
    const accountLink = await createAccountLink(
      account.id,
      `${appUrl}/dashboard/seller?refresh=true`,
      `${appUrl}/dashboard/seller?onboarding=complete`
    );

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error(`Stripe onboarding error at step [${step.current}]:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Échec à l'étape "${step.current}" : ${message}`, step: step.current },
      { status: 500 }
    );
  }
}
