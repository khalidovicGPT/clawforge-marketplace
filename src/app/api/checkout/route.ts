import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
      .select('id, name, description, price, currency, creator_id')
      .eq('id', skillId)
      .eq('status', 'approved')
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
        price: 0,
        currency: skill.currency || 'EUR',
        status: 'completed',
        payment_method: 'free',
      });

      return NextResponse.json({ free: true, skillId: skill.id });
    }

    // Get user's stripe customer ID or create one
    let { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = userData?.stripe_customer_id;

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
            currency: skill.currency || 'eur',
            product_data: {
              name: skill.name,
              description: skill.description?.substring(0, 500) || 'Skill OpenClaw',
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://clawforge-marketplace.vercel.app'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://clawforge-marketplace.vercel.app'}/skills/${skillSlug}`,
      metadata: {
        skill_id: skill.id,
        user_id: user.id,
        creator_id: skill.creator_id,
      },
    });

    // Create pending purchase record
    await supabase.from('purchases').insert({
      user_id: user.id,
      skill_id: skill.id,
      price: skill.price,
      currency: skill.currency || 'EUR',
      status: 'pending',
      stripe_session_id: session.id,
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
