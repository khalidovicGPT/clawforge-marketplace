import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, createConnectAccount, createAccountLink } from '@/lib/stripe';

export async function POST() {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe n\'est pas configuré. Contactez l\'administrateur.' },
        { status: 503 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete, email')
      .eq('id', user.id)
      .single();

    const email = profile?.email || user.email;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    // If user already has a valid Stripe account (acct_*)
    const hasValidStripeAccount = profile?.stripe_account_id
      && profile.stripe_account_id.startsWith('acct_');

    if (hasValidStripeAccount) {
      // Check if onboarding is complete
      if (profile.stripe_onboarding_complete) {
        return NextResponse.json(
          { error: 'Vous êtes déjà inscrit comme créateur', redirect: '/dashboard' },
          { status: 400 }
        );
      }

      // Create new account link for incomplete onboarding
      const accountLink = await createAccountLink(
        profile.stripe_account_id,
        `${appUrl}/become-creator?refresh=true`,
        `${appUrl}/dashboard?onboarding=complete`
      );

      return NextResponse.json({ url: accountLink.url });
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email manquant. Vérifiez votre profil.' },
        { status: 400 }
      );
    }

    // Create a real Stripe Connect Express account
    const account = await createConnectAccount(email);

    // Save account ID and upgrade role
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false,
        role: 'creator',
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }

    // Create onboarding link to complete Stripe setup
    const accountLink = await createAccountLink(
      account.id,
      `${appUrl}/become-creator?refresh=true`,
      `${appUrl}/dashboard?onboarding=complete`
    );

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: `Erreur lors de la création du compte : ${message}` },
      { status: 500 }
    );
  }
}
