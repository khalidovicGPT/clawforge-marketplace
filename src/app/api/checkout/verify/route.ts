import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    if (!skillId) {
      return NextResponse.json(
        { error: 'Skill ID manquant' },
        { status: 400 }
      );
    }

    const { data: skill, error: skillError } = await supabase
      .from('skills')
      .select('id, name, description, file_url, version')
      .eq('id', skillId)
      .single();

    if (skillError || !skill) {
      return NextResponse.json(
        { error: 'Skill non trouvé' },
        { status: 404 }
      );
    }

    // Verify purchase belongs to user
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('skill_id', skillId)
      .eq('status', 'completed')
      .single();

    if (!purchase) {
      return NextResponse.json(
        { error: 'Achat non trouvé' },
        { status: 403 }
      );
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
