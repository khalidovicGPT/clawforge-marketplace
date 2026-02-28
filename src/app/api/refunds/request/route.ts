import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

const REFUND_WINDOW_DAYS = 15;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Vous devez être connecté' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { purchaseId, reason } = body;

    if (!purchaseId || !reason) {
      return NextResponse.json(
        { error: 'Paramètres manquants (purchaseId, reason)' },
        { status: 400 }
      );
    }

    if (reason.length < 10) {
      return NextResponse.json(
        { error: 'La raison doit contenir au moins 10 caractères' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Récupérer l'achat
    const { data: purchase, error: purchaseError } = await serviceClient
      .from('purchases')
      .select('id, user_id, skill_id, price_paid, payment_status, created_at')
      .eq('id', purchaseId)
      .eq('user_id', user.id)
      .single();

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Achat non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que l'achat est payant
    if (purchase.price_paid === 0) {
      return NextResponse.json(
        { error: 'Les téléchargements gratuits ne sont pas remboursables' },
        { status: 400 }
      );
    }

    // Vérifier que l'achat n'est pas déjà remboursé
    if (purchase.payment_status === 'refunded') {
      return NextResponse.json(
        { error: 'Cet achat a déjà été remboursé' },
        { status: 400 }
      );
    }

    // Vérifier que l'achat n'a pas déjà été versé au créateur
    if (purchase.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Le paiement a déjà été versé au créateur, le remboursement n\'est plus possible' },
        { status: 400 }
      );
    }

    // Vérifier la fenêtre de remboursement (15 jours)
    const purchasedAt = new Date(purchase.created_at);
    const refundDeadline = new Date(purchasedAt.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now > refundDeadline) {
      return NextResponse.json(
        { error: `La période de remboursement de ${REFUND_WINDOW_DAYS} jours est dépassée` },
        { status: 400 }
      );
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const { data: existingRequest } = await serviceClient
      .from('refund_requests')
      .select('id, status')
      .eq('purchase_id', purchaseId)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { error: 'Une demande de remboursement est déjà en cours pour cet achat' },
          { status: 409 }
        );
      }
      if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { error: 'Cet achat a déjà été remboursé' },
          { status: 400 }
        );
      }
      // Si rejected, on autorise une nouvelle demande (supprime l'ancienne)
      await serviceClient
        .from('refund_requests')
        .delete()
        .eq('id', existingRequest.id);
    }

    // Créer la demande de remboursement
    const { data: refundRequest, error: insertError } = await serviceClient
      .from('refund_requests')
      .insert({
        purchase_id: purchaseId,
        user_id: user.id,
        skill_id: purchase.skill_id,
        reason,
        amount: purchase.price_paid,
        status: 'pending',
      })
      .select('id, status, requested_at')
      .single();

    if (insertError) {
      console.error('Refund request insert error:', insertError);
      return NextResponse.json(
        { error: 'Erreur lors de la création de la demande' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      refund_request: refundRequest,
      message: 'Votre demande de remboursement a été enregistrée. Elle sera traitée par notre équipe.',
    });
  } catch (error) {
    console.error('Refund request error:', error);
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: 500 }
    );
  }
}

// GET : voir ses demandes de remboursement
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: requests, error } = await serviceClient
      .from('refund_requests')
      .select(`
        id, purchase_id, skill_id, reason, status, amount,
        admin_notes, requested_at, resolved_at,
        skill:skills!refund_requests_skill_id_fkey(title, slug)
      `)
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Refund requests fetch error:', error);
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 });
    }

    return NextResponse.json({ refund_requests: requests || [] });
  } catch (error) {
    console.error('Refund requests error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
