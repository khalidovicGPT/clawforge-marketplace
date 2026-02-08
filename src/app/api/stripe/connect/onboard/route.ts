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

    // If user already has a Stripe account
    if (profile?.stripe_account_id) {
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
        `${process.env.NEXT_PUBLIC_APP_URL}/become-creator?refresh=true`,
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?onboarding=complete`
      );

      return NextResponse.json({ url: accountLink.url });
    }

    // Create new Stripe Connect account
    const account = await createConnectAccount(email!);

    // Save Stripe account ID to user profile
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false,
        role: 'creator', // Upgrade role to creator
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      // Continue anyway - we can recover from this
    }

    // Create account link for onboarding
    const accountLink = await createAccountLink(
      account.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/become-creator?refresh=true`,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?onboarding=complete`
    );

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
