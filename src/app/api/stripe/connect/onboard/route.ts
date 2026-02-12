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
        `${appUrl}/become-creator?refresh=true`,
        `${appUrl}/dashboard?onboarding=complete`
      );

      return NextResponse.json({ url: accountLink.url });
    }

    // TEMPORAIRE : Stripe Connect n'est pas encore activé
    // On crée juste le profil creator sans compte Stripe pour l'instant
    const { error: updateError } = await supabase
      .from('users')
      .update({
        stripe_account_id: 'pending',
        stripe_onboarding_complete: false,
        role: 'creator', // Upgrade role to creator
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du profil' },
        { status: 500 }
      );
    }

    // Redirection vers le dashboard seller (Stripe sera configuré plus tard)
    return NextResponse.json({ 
      url: `${appUrl}/dashboard/seller`,
      message: 'Compte créateur activé. Bienvenue sur votre dashboard vendeur !'
    });
  } catch (error) {
    console.error('Stripe Connect onboarding error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte. Veuillez réessayer.' },
      { status: 500 }
    );
  }
}
