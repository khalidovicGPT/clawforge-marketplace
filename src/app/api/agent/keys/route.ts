import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createApiKeyForCreator, getCreatorApiKeys, revokeApiKey } from '@/lib/agent-api-keys';

/**
 * GET /api/agent/keys
 * Liste les cles API du createur connecte.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Verifier role createur
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'creator' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Acces reserve aux createurs' }, { status: 403 });
    }

    const keys = await getCreatorApiKeys(user.id);
    return NextResponse.json({ keys });
  } catch (error) {
    console.error('GET /api/agent/keys error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/agent/keys
 * Genere une nouvelle cle API pour le createur connecte.
 * Revoque automatiquement les anciennes cles actives.
 *
 * Body optionnel : { name: "Mon Agent" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    // Verifier role createur
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'creator' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Acces reserve aux createurs' }, { status: 403 });
    }

    let name = 'Agent OpenClaw';
    try {
      const body = await request.json();
      if (body.name && typeof body.name === 'string') {
        name = body.name.slice(0, 50);
      }
    } catch {
      // Pas de body JSON, utiliser le nom par defaut
    }

    const { plainKey, keyId } = await createApiKeyForCreator(user.id, name);

    return NextResponse.json({
      key_id: keyId,
      api_key: plainKey,
      message: 'Cle generee. Conservez-la precieusement, elle ne sera plus affichee.',
    });
  } catch (error) {
    console.error('POST /api/agent/keys error:', error);
    return NextResponse.json({ error: 'Erreur lors de la generation de la cle' }, { status: 500 });
  }
}

/**
 * DELETE /api/agent/keys
 * Revoque une cle API specifique.
 *
 * Body : { key_id: "uuid" }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const body = await request.json();
    if (!body.key_id) {
      return NextResponse.json({ error: 'key_id requis' }, { status: 400 });
    }

    const success = await revokeApiKey(body.key_id, user.id);
    if (!success) {
      return NextResponse.json({ error: 'Cle non trouvee ou deja revoquee' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Cle revoquee' });
  } catch (error) {
    console.error('DELETE /api/agent/keys error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
