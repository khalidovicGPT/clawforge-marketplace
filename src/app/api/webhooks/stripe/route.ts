import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use service role for webhook handling
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(account);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const skillId = session.metadata?.skill_id;
  
  if (!skillId) {
    console.error('No skill_id in checkout session metadata');
    return;
  }

  // Get customer email to find user
  const customerEmail = session.customer_details?.email;
  
  if (!customerEmail) {
    console.error('No customer email in checkout session');
    return;
  }

  // Find user by email
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', customerEmail)
    .single();

  if (userError || !user) {
    console.error('User not found for email:', customerEmail);
    return;
  }

  // Create purchase record
  const { error: purchaseError } = await supabaseAdmin
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

  // Increment download count
  await supabaseAdmin.rpc('increment_downloads', { skill_uuid: skillId });

  console.log(`Purchase recorded: user=${user.id}, skill=${skillId}`);
}

async function handleAccountUpdated(account: Stripe.Account) {
  // Update creator's onboarding status
  const isOnboarded = account.details_submitted && account.charges_enabled;

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      stripe_onboarding_complete: isOnboarded,
    })
    .eq('stripe_account_id', account.id);

  if (error) {
    console.error('Error updating account status:', error);
    return;
  }

  console.log(`Account ${account.id} updated: onboarded=${isOnboarded}`);
}
