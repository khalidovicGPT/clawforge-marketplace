import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use service role for webhook handling (only if configured)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabaseAdmin);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account, supabaseAdmin);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('Payment failed:', paymentIntent.id, paymentIntent.last_payment_error);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session, 
  supabase: ReturnType<typeof createClient>
) {
  const skillId = session.metadata?.skill_id;
  
  if (!skillId) {
    console.error('No skill_id in checkout session metadata');
    return;
  }

  const customerEmail = session.customer_details?.email;
  
  if (!customerEmail) {
    console.error('No customer email in checkout session');
    return;
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (userError || !user) {
    console.error('User not found for email:', customerEmail);
    return;
  }

  const { error: purchaseError } = await supabase
    .from('purchases')
    .upsert({
      user_id: user.id,
      skill_id: skillId,
      type: 'purchase',
      price_paid: session.amount_total,
      currency: session.currency?.toUpperCase() || 'EUR',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
    }, { onConflict: 'user_id,skill_id' });

  if (purchaseError) {
    console.error('Error creating purchase:', purchaseError);
    return;
  }

  await supabase.rpc('increment_downloads', { skill_uuid: skillId });
  console.log(`Purchase recorded: user=${user.id}, skill=${skillId}`);
}

async function handleAccountUpdated(
  account: Stripe.Account,
  supabase: ReturnType<typeof createClient>
) {
  const isOnboarded = account.details_submitted && account.charges_enabled;

  const { error } = await supabase
    .from('users')
    .update({ stripe_onboarding_complete: isOnboarded })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error('Error updating account status:', error);
    return;
  }

  console.log(`Account ${account.id} updated: onboarded=${isOnboarded}`);
}
