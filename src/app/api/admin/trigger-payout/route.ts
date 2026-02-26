import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST : Déclencher manuellement le payout mensuel
 *
 * Proxy admin authentifié → appelle le cron monthly-payout avec le vrai secret.
 * Nécessaire car le secret n'est pas exposable côté client.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const cronSecret = process.env.ADMIN_SECRET_KEY || process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json({ error: 'Secret cron non configuré' }, { status: 503 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const res = await fetch(`${baseUrl}/api/cron/monthly-payout`, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Admin trigger payout error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
