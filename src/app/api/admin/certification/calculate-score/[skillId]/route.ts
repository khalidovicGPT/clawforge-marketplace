import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { calculateAndUpdateQualityScore } from '@/lib/certification-status';

/**
 * POST /api/admin/certification/calculate-score/[skillId]
 * Force le recalcul du score qualite d'un skill.
 * Admin uniquement.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ skillId: string }> },
) {
  try {
    const { skillId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const { data: skill } = await serviceClient
      .from('skills')
      .select('id')
      .eq('id', skillId)
      .single();

    if (!skill) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }

    const score = await calculateAndUpdateQualityScore(skillId);

    return NextResponse.json({
      success: true,
      skill_id: skillId,
      quality_score: score,
    });
  } catch (error) {
    console.error('calculate-score error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
