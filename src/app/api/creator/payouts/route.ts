import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET : Historique des payouts du créateur connecté
 * Inclut aussi un résumé des ventes en attente/éligibles
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Vérifier que l'utilisateur est créateur
    const { data: profile } = await serviceClient
      .from('users')
      .select('role, stripe_onboarding_complete')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'user') {
      return NextResponse.json({ error: 'Acces reserve aux createurs' }, { status: 403 });
    }

    // Historique des payouts
    const { data: payouts } = await serviceClient
      .from('creator_payouts')
      .select('*')
      .eq('creator_id', user.id)
      .order('period_start', { ascending: false });

    // Récupérer les skills du créateur pour calculer les revenus
    const { data: skills } = await serviceClient
      .from('skills')
      .select('id')
      .eq('creator_id', user.id);

    const skillIds = skills?.map(s => s.id) || [];

    // Résumé des achats par statut
    let pendingAmount = 0;
    let pendingCount = 0;
    let eligibleAmount = 0;
    let eligibleCount = 0;

    if (skillIds.length > 0) {
      // Achats en attente (< 15 jours)
      const { data: pendingPurchases } = await serviceClient
        .from('purchases')
        .select('price_paid')
        .in('skill_id', skillIds)
        .eq('payment_status', 'pending')
        .gt('price_paid', 0);

      if (pendingPurchases) {
        pendingCount = pendingPurchases.length;
        pendingAmount = pendingPurchases.reduce((sum, p) => sum + Math.round((p.price_paid || 0) * 0.8), 0);
      }

      // Achats éligibles (prêts pour le prochain payout)
      const { data: eligiblePurchases } = await serviceClient
        .from('purchases')
        .select('price_paid')
        .in('skill_id', skillIds)
        .eq('payment_status', 'eligible')
        .gt('price_paid', 0);

      if (eligiblePurchases) {
        eligibleCount = eligiblePurchases.length;
        eligibleAmount = eligiblePurchases.reduce((sum, p) => sum + Math.round((p.price_paid || 0) * 0.8), 0);
      }
    }

    // Calculer la date du prochain paiement (dernier jour du mois)
    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return NextResponse.json({
      payouts: payouts || [],
      summary: {
        pending: { count: pendingCount, amount: pendingAmount },
        eligible: { count: eligibleCount, amount: eligibleAmount },
        next_payout_date: nextPayoutDate.toISOString().split('T')[0],
        next_payout_estimated: eligibleAmount,
      },
    });
  } catch (error) {
    console.error('Creator payouts error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
