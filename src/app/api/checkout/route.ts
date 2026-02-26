import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile } from '@/lib/ensure-profile';
import { generateDownloadToken } from '@/lib/download-tokens';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    })
  : null;

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

    // Ensure user profile exists in public.users (required for FK on purchases)
    // Must be called before any purchase insert — OAuth users may not have a profile yet
    await ensureUserProfile(supabase, user);

    // Get skill details (use service client to bypass RLS)
    const serviceClient = createServiceClient();
    const { data: skill, error: skillError } = await serviceClient
      .from('skills')
      .select('id, title, description_short, price, creator_id, status')
      .eq('id', skillId)
      .in('status', ['published', 'pending_payment_setup'])
      .single();

    if (skillError || !skill) {
      return NextResponse.json(
        { error: 'Skill non trouvé' },
        { status: 404 }
      );
    }

    // Block purchase if creator hasn't configured Stripe yet
    if (skill.status === 'pending_payment_setup') {
      return NextResponse.json(
        { error: 'Ce skill n\'est pas encore disponible à la vente. Le créateur n\'a pas configuré ses paiements.' },
        { status: 403 }
      );
    }

    // Free skill - create purchase and return
    if (!skill.price || skill.price === 0) {
      // Check if already downloaded (UNIQUE constraint on user_id, skill_id)
      const { data: existingPurchase } = await serviceClient
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('skill_id', skill.id)
        .single();

      if (existingPurchase) {
        return NextResponse.json({ free: true, skillId: skill.id });
      }

      const { error: insertError } = await serviceClient.from('purchases').insert({
        user_id: user.id,
        skill_id: skill.id,
        type: 'purchase',
        price_paid: 0,
        currency: 'EUR',
        payment_status: 'paid',
      });

      if (insertError) {
        console.error('Free purchase insert error:', JSON.stringify(insertError));
        // Duplicate key = already downloaded, treat as success
        if (insertError.code === '23505') {
          return NextResponse.json({ free: true, skillId: skill.id });
        }
        return NextResponse.json(
          { error: `Erreur : ${insertError.message}` },
          { status: 500 }
        );
      }

      // Generer un token de telechargement pour l'agent
      try {
        await generateDownloadToken(user.id, skill.id);
      } catch (e) {
        console.error('Download token generation error:', e);
      }

      return NextResponse.json({ free: true, skillId: skill.id });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe non configuré' },
        { status: 503 }
      );
    }

    // Find or create Stripe customer by email
    let customerId: string;
    const existingCustomers = await stripe.customers.list({
      email: user.email!,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;
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
