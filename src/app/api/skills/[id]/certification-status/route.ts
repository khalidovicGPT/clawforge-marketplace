import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getSkillCertificationStatus } from '@/lib/certification-status';

/**
 * GET /api/skills/[id]/certification-status
 * Retourne le statut de certification complet d'un skill.
 * Accessible par le createur du skill ou un admin.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: skillId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    // Verifier que l'utilisateur est le createur ou admin
    const { data: skill } = await serviceClient
      .from('skills')
      .select('id, creator_id, certification, quality_score, sales_count, average_rating, title')
      .eq('id', skillId)
      .single();

    if (!skill) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }

    const { data: profile } = await serviceClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (skill.creator_id !== user.id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    const status = await getSkillCertificationStatus(skillId);

    return NextResponse.json(status);
  } catch (error) {
    console.error('certification-status error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
