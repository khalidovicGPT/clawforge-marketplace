import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAccountOnboarded } from '@/lib/stripe';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_account_id || !profile.stripe_account_id.startsWith('acct_')) {
      return NextResponse.json({ status: 'no_account' });
    }

    // Already marked as complete in our DB
    if (profile.stripe_onboarding_complete) {
      return NextResponse.json({ status: 'complete' });
    }

    // Check with Stripe if onboarding is actually complete
    const onboarded = await isAccountOnboarded(profile.stripe_account_id);

    if (onboarded) {
      // Update our DB to reflect completion
      await supabase
        .from('users')
        .update({ stripe_onboarding_complete: true })
        .eq('id', user.id);

      return NextResponse.json({ status: 'complete' });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (error) {
    console.error('Stripe Connect status error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut' },
      { status: 500 }
    );
  }
}
