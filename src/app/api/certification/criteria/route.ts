import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { CertificationCriteria } from '@/types/database';

/**
 * GET /api/certification/criteria
 * Retourne la liste des criteres de certification groupes par niveau.
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: criteria, error } = await supabase
      .from('certification_criteria')
      .select('*')
      .order('weight', { ascending: false });

    if (error) {
      console.error('certification criteria fetch error:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const grouped: Record<string, CertificationCriteria[]> = {
      bronze: [],
      silver: [],
      gold: [],
    };

    for (const c of criteria || []) {
      if (grouped[c.level]) {
        grouped[c.level].push(c);
      }
    }

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('certification criteria error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
