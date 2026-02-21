import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveDownloadToken, generateDownloadToken } from '@/lib/download-tokens';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * GET /api/skills/download-token?skill_id=xxx
 * Recupere le token de telechargement actif pour un skill achete.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('skill_id');
    if (!skillId) {
      return NextResponse.json({ error: 'skill_id requis' }, { status: 400 });
    }

    const token = await getActiveDownloadToken(user.id, skillId);
    return NextResponse.json({ token });
  } catch (error) {
    console.error('GET download-token error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/skills/download-token
 * Genere un nouveau token de telechargement pour un skill achete.
 * Body: { skill_id: "uuid" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    const { skill_id: skillId } = body;
    if (!skillId) {
      return NextResponse.json({ error: 'skill_id requis' }, { status: 400 });
    }

    // Verifier que l'utilisateur a bien achete le skill
    const serviceClient = createServiceClient();
    const { data: purchase } = await serviceClient
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('skill_id', skillId)
      .single();

    if (!purchase) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas achete ce skill' },
        { status: 403 },
      );
    }

    const { token, expiresAt } = await generateDownloadToken(user.id, skillId);

    return NextResponse.json({ token, expires_at: expiresAt });
  } catch (error) {
    console.error('POST download-token error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
