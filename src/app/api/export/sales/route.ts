import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Verify user is a creator
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'creator' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Accès réservé aux créateurs' }, { status: 403 });
    }

    // Get all purchases for creator's skills
    const serviceClient = createServiceClient();
    const { data: skills } = await supabase
      .from('skills')
      .select('id, title')
      .eq('creator_id', user.id);

    if (!skills || skills.length === 0) {
      return new NextResponse('Date,Skill,Prix TTC,Commission CF,Revenu net TTC,Statut\n', {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="clawforge-ventes-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const skillIds = skills.map(s => s.id);
    const skillNames = Object.fromEntries(skills.map(s => [s.id, s.title]));

    const { data: purchases } = await serviceClient
      .from('purchases')
      .select('skill_id, price_paid, platform_fee, creator_amount, currency, created_at, stripe_payment_intent_id, payment_status')
      .in('skill_id', skillIds)
      .order('created_at', { ascending: false });

    const PAYMENT_STATUS_LABELS: Record<string, string> = {
      pending: 'En attente (15j)',
      eligible: 'Eligible',
      paid: 'Verse',
      refunded: 'Rembourse',
    };

    // Build CSV
    const header = 'Date,Skill,Prix TTC,Commission CF (20%),Revenu net TTC (80%),Statut paiement,Statut versement';
    const rows = (purchases || []).map(p => {
      const priceTTC = (p.price_paid || 0) / 100;
      const commission = (p.platform_fee || Math.round(p.price_paid * 0.20)) / 100;
      const revenueNet = (p.creator_amount || Math.round(p.price_paid * 0.80)) / 100;
      const date = new Date(p.created_at).toLocaleDateString('fr-FR');
      const skillName = (skillNames[p.skill_id] || 'Inconnu').replace(/,/g, ' ');
      const statut = priceTTC === 0 ? 'Gratuit' : 'Paye';
      const paymentStatus = PAYMENT_STATUS_LABELS[p.payment_status] || p.payment_status || 'N/A';

      return `${date},${skillName},${priceTTC.toFixed(2)},${commission.toFixed(2)},${revenueNet.toFixed(2)},${statut},${paymentStatus}`;
    });

    const csv = [header, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="clawforge-ventes-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'export' }, { status: 500 });
  }
}
