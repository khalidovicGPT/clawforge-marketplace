import { stripe, calculatePlatformFee } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { generateDownloadToken } from '@/lib/download-tokens';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const ELIGIBILITY_DELAY_DAYS = 15;

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
        const skillId = session.metadata?.skill_id;
        const customerEmail = session.customer_details?.email;
        
        if (skillId && customerEmail) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', customerEmail)
            .single();

          if (user) {
            const pricePaid = session.amount_total || 0;
            const platformFee = calculatePlatformFee(pricePaid);
            const creatorAmount = pricePaid - platformFee;
            const eligibleAt = new Date(Date.now() + ELIGIBILITY_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();

            await supabaseAdmin
              .from('purchases')
              .upsert({
                user_id: user.id,
                skill_id: skillId,
                type: 'purchase',
                price_paid: pricePaid,
                platform_fee: platformFee,
                creator_amount: creatorAmount,
                currency: session.currency?.toUpperCase() || 'EUR',
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent as string,
                payment_status: 'pending',
                eligible_at: eligibleAt,
              }, { onConflict: 'user_id,skill_id' });

            await supabaseAdmin.rpc('increment_downloads', { skill_uuid: skillId });

            // Generer un token de telechargement pour l'agent
            try {
              await generateDownloadToken(user.id, skillId);
            } catch (e) {
              console.error('Download token generation error:', e);
            }

            console.log(`Purchase recorded: user=${user.id}, skill=${skillId}`);
          }
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const isOnboarded = account.details_submitted && account.charges_enabled;

        // Update user's onboarding status
        const { data: updatedUser } = await supabaseAdmin
          .from('users')
          .update({ stripe_onboarding_complete: isOnboarded })
          .eq('stripe_account_id', account.id)
          .select('id')
          .single();

        // If onboarding just completed, auto-publish pending_payment_setup skills
        if (isOnboarded && updatedUser) {
          const { data: pendingSkills, error: pendingError } = await supabaseAdmin
            .from('skills')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
            })
            .eq('creator_id', updatedUser.id)
            .eq('status', 'pending_payment_setup')
            .select('id, title');

          if (pendingSkills && pendingSkills.length > 0) {
            console.log(
              `[STRIPE] Auto-published ${pendingSkills.length} skills for creator ${updatedUser.id}:`,
              pendingSkills.map(s => s.title)
            );
          }
          if (pendingError) {
            console.error('[STRIPE] Error auto-publishing skills:', pendingError);
          }
        }

        console.log(`Account ${account.id} updated: onboarded=${isOnboarded}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          // Marquer l'achat comme remboursé
          const { data: updated } = await supabaseAdmin
            .from('purchases')
            .update({
              payment_status: 'refunded',
              refunded_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntentId)
            .select('id, skill_id, user_id');

          if (updated && updated.length > 0) {
            console.log(`[STRIPE] Refund recorded for payment_intent=${paymentIntentId}, purchase=${updated[0].id}`);
          }
        }
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
