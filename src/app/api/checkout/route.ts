import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/ensure-profile';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour effectuer un achat' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { skillId, skillSlug, price, currency } = body;

    if (!skillId || price === undefined) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Get skill details
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('id, title, description_short, price, creator_id')
      .eq('id', skillId)
      .eq('status', 'published')
      .single();

    if (skillError || !skill) {
      return NextResponse.json(
        { error: 'Skill non trouvé' },
        { status: 404 }
      );
    }

    // Free skill - return free flag
    if (skill.price === 0) {
      // Create purchase record for free skill
      await supabase.from('purchases').insert({
        user_id: user.id,
        skill_id: skill.id,
        type: 'free_download',
        price_paid: 0,
        currency: 'EUR',
      });

      return NextResponse.json({ free: true, skillId: skill.id });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    // Get or create user profile, then get stripe customer ID
    const userProfile = await ensureUserProfile(supabase, user);
    let customerId = userProfile.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: skill.title,
              description: skill.description_short?.substring(0, 500) || 'Skill OpenClaw',
              metadata: {
                skill_id: skill.id,
              },
            },
            unit_amount: skill.price, // Price in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/skills/${skillSlug}`,
      metadata: {
        skill_id: skill.id,
        user_id: user.id,
        creator_id: skill.creator_id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
