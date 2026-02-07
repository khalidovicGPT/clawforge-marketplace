import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  skillId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillId } = checkoutSchema.parse(body);

    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get skill details
    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select(`
        *,
        creator:users!creator_id(id, stripe_account_id, stripe_onboarding_complete)
      `)
      .eq('id', skillId)
      .eq('status', 'published')
      .single();

    if (skillError || !skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Check if skill is free
    if (skill.price_type === 'free' || !skill.price) {
      // Handle free download
      const { error: purchaseError } = await supabase
        .from('purchases')
        .upsert({
          user_id: user.id,
          skill_id: skillId,
          type: 'free_download',
          price_paid: 0,
        }, { onConflict: 'user_id,skill_id' });

      if (purchaseError) {
        console.error('Error creating free download:', purchaseError);
        return NextResponse.json({ error: 'Failed to process download' }, { status: 500 });
      }

      return NextResponse.json({ 
        type: 'free',
        redirectUrl: `/skills/${skill.slug}/download` 
      });
    }

    // Check if creator has completed Stripe onboarding
    if (!skill.creator?.stripe_account_id || !skill.creator?.stripe_onboarding_complete) {
      return NextResponse.json({ 
        error: 'Creator has not completed payment setup' 
      }, { status: 400 });
    }

    // Check if user already purchased
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('skill_id', skillId)
      .single();

    if (existingPurchase) {
      return NextResponse.json({ 
        type: 'already_purchased',
        redirectUrl: `/skills/${skill.slug}/download` 
      });
    }

    // Create Stripe Checkout session
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;
    
    const session = await createCheckoutSession({
      skillId: skill.id,
      skillTitle: skill.title,
      priceInCents: skill.price,
      creatorStripeAccountId: skill.creator.stripe_account_id,
      successUrl: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/skills/${skill.slug}`,
    });

    return NextResponse.json({ 
      type: 'checkout',
      sessionId: session.id,
      url: session.url 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
