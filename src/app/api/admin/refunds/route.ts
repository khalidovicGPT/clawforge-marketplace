import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createRefund } from '@/lib/stripe';

/**
 * Admin : gestion des demandes de remboursement
 *
 * GET  — Liste les demandes (filtrable par status)
 * POST — Approuver ou refuser une demande
 */

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;
  return profile;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const serviceClient = createServiceClient();

    let query = serviceClient
      .from('refund_requests')
      .select(`
        id, purchase_id, user_id, skill_id, reason, status, amount,
        admin_id, admin_notes, stripe_refund_id, requested_at, resolved_at,
        user:users!refund_requests_user_id_fkey(id, email, name),
        skill:skills!refund_requests_skill_id_fkey(id, title, slug, creator_id)
      `)
      .order('requested_at', { ascending: true });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('Admin refunds fetch error:', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({ refund_requests: requests || [] });
  } catch (error) {
    console.error('Admin refunds error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { refundRequestId, action, adminNotes } = body;

    if (!refundRequestId || !action) {
      return NextResponse.json(
        { error: 'Paramètres manquants (refundRequestId, action)' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action invalide (approve ou reject)' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Récupérer la demande
    const { data: refundReq, error: reqError } = await serviceClient
      .from('refund_requests')
      .select('id, purchase_id, user_id, skill_id, amount, status')
      .eq('id', refundRequestId)
      .single();

    if (reqError || !refundReq) {
      return NextResponse.json({ error: 'Demande non trouvée' }, { status: 404 });
    }

    if (refundReq.status !== 'pending') {
      return NextResponse.json(
        { error: 'Cette demande a déjà été traitée' },
        { status: 400 }
      );
    }

    // Récupérer l'achat pour le payment_intent
    const { data: purchase } = await serviceClient
      .from('purchases')
      .select('id, stripe_payment_intent_id, payment_status')
      .eq('id', refundReq.purchase_id)
      .single();

    if (!purchase) {
      return NextResponse.json({ error: 'Achat associé non trouvé' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Vérifier que le paiement n'a pas déjà été versé au créateur
      if (purchase.payment_status === 'paid') {
        return NextResponse.json(
          { error: 'Le paiement a déjà été versé au créateur. Remboursement impossible automatiquement.' },
          { status: 400 }
        );
      }

      // Remboursement Stripe
      let stripeRefundId: string | null = null;
      if (purchase.stripe_payment_intent_id) {
        try {
          const stripeRefund = await createRefund({
            paymentIntentId: purchase.stripe_payment_intent_id,
            amount: refundReq.amount,
            reason: `Remboursement approuvé par admin pour achat ${refundReq.purchase_id}`,
          });
          stripeRefundId = stripeRefund.id;
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          return NextResponse.json(
            { error: 'Erreur lors du remboursement Stripe' },
            { status: 500 }
          );
        }
      }

      // Mettre à jour la demande de remboursement
      await serviceClient
        .from('refund_requests')
        .update({
          status: 'approved',
          admin_id: admin.id,
          admin_notes: adminNotes || null,
          stripe_refund_id: stripeRefundId,
          resolved_at: now,
        })
        .eq('id', refundRequestId);

      // Mettre à jour le statut de l'achat
      await serviceClient
        .from('purchases')
        .update({
          payment_status: 'refunded',
          refunded_at: now,
        })
        .eq('id', refundReq.purchase_id);

      return NextResponse.json({
        success: true,
        action: 'approved',
        stripe_refund_id: stripeRefundId,
        message: 'Remboursement approuvé et effectué',
      });
    }

    // Rejet
    if (!adminNotes || adminNotes.length < 5) {
      return NextResponse.json(
        { error: 'Un motif de refus est obligatoire (min 5 caractères)' },
        { status: 400 }
      );
    }

    await serviceClient
      .from('refund_requests')
      .update({
        status: 'rejected',
        admin_id: admin.id,
        admin_notes: adminNotes,
        resolved_at: now,
      })
      .eq('id', refundRequestId);

    return NextResponse.json({
      success: true,
      action: 'rejected',
      message: 'Demande de remboursement refusée',
    });
  } catch (error) {
    console.error('Admin refund action error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
