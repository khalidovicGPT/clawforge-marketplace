import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createTransfer } from '@/lib/stripe';

/**
 * Cron mensuel : versement groupé aux créateurs
 *
 * Regroupe tous les achats "eligible" par créateur,
 * crée un transfert Stripe vers chaque compte Connect,
 * et enregistre le payout en base.
 *
 * Appelé par n8n/cron le dernier jour du mois à 10h00.
 * Auth: Requires x-cron-secret header
 *
 * Idempotent : vérifie qu'un payout n'existe pas déjà pour la période.
 */

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedSecret = process.env.ADMIN_SECRET_KEY || process.env.CRON_SECRET;

    if (!cronSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Déterminer la période (mois en cours)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Récupérer tous les achats éligibles non encore payés
    const { data: eligiblePurchases, error: fetchError } = await supabase
      .from('purchases')
      .select(`
        id, skill_id, price_paid, platform_fee, creator_amount,
        skill:skills!purchases_skill_id_fkey(creator_id)
      `)
      .eq('payment_status', 'eligible')
      .is('payout_id', null)
      .gt('price_paid', 0);

    if (fetchError) {
      console.error('[CRON] monthly-payout fetch error:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!eligiblePurchases || eligiblePurchases.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun achat eligible pour ce mois',
        payouts: [],
        period: { start: periodStart, end: periodEnd },
      });
    }

    // Grouper par créateur
    const creatorMap = new Map<string, {
      creatorId: string;
      totalAmount: number;
      totalFee: number;
      totalGross: number;
      purchaseIds: string[];
    }>();

    for (const purchase of eligiblePurchases) {
      const creatorId = (purchase.skill as unknown as { creator_id: string })?.creator_id;
      if (!creatorId) continue;

      const existing = creatorMap.get(creatorId) || {
        creatorId,
        totalAmount: 0,
        totalFee: 0,
        totalGross: 0,
        purchaseIds: [],
      };

      existing.totalAmount += purchase.creator_amount || 0;
      existing.totalFee += purchase.platform_fee || 0;
      existing.totalGross += purchase.price_paid;
      existing.purchaseIds.push(purchase.id);
      creatorMap.set(creatorId, existing);
    }

    const results: Array<{
      creator_id: string;
      amount: number;
      purchases_count: number;
      status: string;
      error?: string;
    }> = [];

    // Traiter chaque créateur
    for (const [creatorId, data] of creatorMap) {
      // Vérifier qu'un payout n'existe pas déjà pour cette période
      const { data: existingPayout } = await supabase
        .from('creator_payouts')
        .select('id')
        .eq('creator_id', creatorId)
        .eq('period_start', periodStart)
        .eq('period_end', periodEnd)
        .single();

      if (existingPayout) {
        results.push({
          creator_id: creatorId,
          amount: data.totalAmount,
          purchases_count: data.purchaseIds.length,
          status: 'skipped_duplicate',
        });
        continue;
      }

      // Récupérer le compte Stripe du créateur
      const { data: creator } = await supabase
        .from('users')
        .select('stripe_account_id, stripe_onboarding_complete, email')
        .eq('id', creatorId)
        .single();

      if (!creator?.stripe_account_id || !creator.stripe_onboarding_complete) {
        results.push({
          creator_id: creatorId,
          amount: data.totalAmount,
          purchases_count: data.purchaseIds.length,
          status: 'skipped_no_stripe',
        });
        continue;
      }

      // Créer le payout en DB (status: processing)
      const { data: payout, error: payoutError } = await supabase
        .from('creator_payouts')
        .insert({
          creator_id: creatorId,
          amount: data.totalAmount,
          platform_fee: data.totalFee,
          gross_amount: data.totalGross,
          purchases_count: data.purchaseIds.length,
          period_start: periodStart,
          period_end: periodEnd,
          status: 'processing',
        })
        .select('id')
        .single();

      if (payoutError || !payout) {
        console.error(`[CRON] Payout insert error for creator ${creatorId}:`, payoutError);
        results.push({
          creator_id: creatorId,
          amount: data.totalAmount,
          purchases_count: data.purchaseIds.length,
          status: 'error_db',
          error: payoutError?.message,
        });
        continue;
      }

      // Transfert Stripe
      try {
        const idempotencyKey = `payout-${creatorId}-${periodStart}-${periodEnd}`;
        const transfer = await createTransfer({
          amount: data.totalAmount,
          destination: creator.stripe_account_id,
          description: `ClawForge - Paiement ${periodStart} au ${periodEnd} (${data.purchaseIds.length} ventes)`,
          idempotencyKey,
        });

        // Marquer le payout comme complété
        await supabase
          .from('creator_payouts')
          .update({
            status: 'completed',
            stripe_transfer_id: transfer.id,
            paid_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        // Marquer les achats comme payés
        await supabase
          .from('purchases')
          .update({
            payment_status: 'paid',
            payout_id: payout.id,
          })
          .in('id', data.purchaseIds);

        results.push({
          creator_id: creatorId,
          amount: data.totalAmount,
          purchases_count: data.purchaseIds.length,
          status: 'completed',
        });

        console.log(`[CRON] Payout completed: creator=${creatorId}, amount=${data.totalAmount}c, transfer=${transfer.id}`);
      } catch (stripeError) {
        console.error(`[CRON] Stripe transfer error for creator ${creatorId}:`, stripeError);

        // Marquer le payout comme échoué
        await supabase
          .from('creator_payouts')
          .update({
            status: 'failed',
            error_message: stripeError instanceof Error ? stripeError.message : 'Erreur Stripe inconnue',
          })
          .eq('id', payout.id);

        results.push({
          creator_id: creatorId,
          amount: data.totalAmount,
          purchases_count: data.purchaseIds.length,
          status: 'error_stripe',
          error: stripeError instanceof Error ? stripeError.message : 'Unknown',
        });
      }
    }

    const completed = results.filter(r => r.status === 'completed').length;
    const failed = results.filter(r => r.status.startsWith('error')).length;

    console.log(`[CRON] monthly-payout: ${completed} reussis, ${failed} echecs, ${results.length} total`);

    return NextResponse.json({
      success: true,
      period: { start: periodStart, end: periodEnd },
      summary: { total: results.length, completed, failed },
      payouts: results,
    });
  } catch (error) {
    console.error('[CRON] monthly-payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'monthly-payout',
    status: 'ok',
    description: 'Versement mensuel groupe aux createurs via Stripe Connect',
  });
}
