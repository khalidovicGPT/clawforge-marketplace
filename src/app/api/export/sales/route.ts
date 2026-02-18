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
      .select('skill_id, price_paid, currency, created_at, stripe_payment_intent_id')
      .in('skill_id', skillIds)
      .order('created_at', { ascending: false });

    // Build CSV
    const header = 'Date,Skill,Prix TTC,Commission CF (20%),Revenu net TTC (80%),Statut';
    const rows = (purchases || []).map(p => {
      const priceTTC = (p.price_paid || 0) / 100;
      const commission = priceTTC * 0.20;
      const revenueNet = priceTTC * 0.80;
      const date = new Date(p.created_at).toLocaleDateString('fr-FR');
      const skillName = (skillNames[p.skill_id] || 'Inconnu').replace(/,/g, ' ');
      const statut = p.stripe_payment_intent_id ? 'Payé' : (priceTTC === 0 ? 'Gratuit' : 'Payé');

      return `${date},${skillName},${priceTTC.toFixed(2)},${commission.toFixed(2)},${revenueNet.toFixed(2)},${statut}`;
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
