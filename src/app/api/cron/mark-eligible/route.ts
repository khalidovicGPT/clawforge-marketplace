import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron quotidien : marquer les achats éligibles au paiement
 *
 * Un achat devient "eligible" 15 jours après la date d'achat,
 * à condition qu'il n'ait pas été remboursé.
 *
 * Appelé par n8n/cron tous les jours à 00h00.
 * Auth: Requires x-cron-secret header
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
    const now = new Date().toISOString();

    // Marquer comme éligibles les achats dont eligible_at est passé
    const { data: updated, error, count } = await supabase
      .from('purchases')
      .update({ payment_status: 'eligible' })
      .eq('payment_status', 'pending')
      .lte('eligible_at', now)
      .gt('price_paid', 0)
      .select('id, skill_id, price_paid');

    if (error) {
      console.error('[CRON] mark-eligible error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const markedCount = updated?.length || 0;
    console.log(`[CRON] mark-eligible: ${markedCount} achats marqués éligibles`);

    return NextResponse.json({
      success: true,
      marked_eligible: markedCount,
      timestamp: now,
    });
  } catch (error) {
    console.error('[CRON] mark-eligible error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedSecret = process.env.ADMIN_SECRET_KEY || process.env.CRON_SECRET;
  if (!cronSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ service: 'mark-eligible', status: 'ok' });
}
