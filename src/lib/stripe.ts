import Stripe from 'stripe';

// Initialize Stripe only if API key is available
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null;

// Commission configuration
export const PLATFORM_FEE_PERCENT = 20; // ClawForge takes 20%, creator gets 80%

/**
 * Calculate platform fee for a given amount
 * @param amount Amount in cents
 * @returns Platform fee in cents
 */
export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
}

/**
 * Create a Stripe Checkout session for purchasing a skill
 */
export async function createCheckoutSession({
  skillId,
  skillTitle,
  priceInCents,
  creatorStripeAccountId,
  customerId,
  successUrl,
  cancelUrl,
}: {
  skillId: string;
  skillTitle: string;
  priceInCents: number;
  creatorStripeAccountId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const platformFee = calculatePlatformFee(priceInCents);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: skillTitle,
            description: `Skill ClawForge: ${skillTitle}`,
            metadata: {
              skill_id: skillId,
            },
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: platformFee,
      transfer_data: {
        destination: creatorStripeAccountId,
      },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      skill_id: skillId,
    },
  });

  return session;
}

/**
 * Create a Stripe Connect Express account for a creator
 */
export async function createConnectAccount(email: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      platform: 'clawforge',
    },
  });

  return account;
}

/**
 * Create an account link for Stripe Connect onboarding
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
}

/**
 * Check if a Connect account has completed onboarding
 */
export async function isAccountOnboarded(accountId: string): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const account = await stripe.accounts.retrieve(accountId);
  return account.details_submitted && account.charges_enabled;
}
