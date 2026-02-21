import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID manquant' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Retrieve Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Paiement non confirmé' },
        { status: 400 }
      );
    }

    // Get skill details
    const skillId = session.metadata?.skill_id;
    const creatorId = session.metadata?.creator_id;
    
    if (!skillId) {
      return NextResponse.json(
        { error: 'Skill ID manquant' },
        { status: 400 }
      );
    }

    // Use service client to bypass RLS for reading skill data
    const serviceClient = createServiceClient();
    const { data: skill, error: skillError } = await serviceClient
      .from('skills')
      .select('id, title, description_short, file_url, version')
      .eq('id', skillId)
      .single();

    if (skillError || !skill) {
      return NextResponse.json(
        { error: 'Skill non trouvé' },
        { status: 404 }
      );
    }

    // Check if purchase exists (use service client to bypass RLS)
    const { data: existingPurchase } = await serviceClient
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('skill_id', skillId)
      .single();

    // Create purchase if not exists
    if (!existingPurchase) {
      const pricePaid = session.amount_total || 0;

      const { error: purchaseError } = await serviceClient
        .from('purchases')
        .insert({
          user_id: user.id,
          skill_id: skillId,
          type: 'purchase',
          price_paid: pricePaid,
          currency: session.currency?.toUpperCase() || 'EUR',
          stripe_checkout_session_id: sessionId,
          stripe_payment_intent_id: session.payment_intent as string,
        });

      if (purchaseError) {
        console.error('Purchase creation error:', purchaseError);
        // Continue anyway, don't block the user
      }
    }

    return NextResponse.json({ skill });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    );
  }
}
