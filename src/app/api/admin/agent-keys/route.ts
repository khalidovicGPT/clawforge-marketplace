import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile } from '@/lib/ensure-profile';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// Prefixes par agent pour le format de cle
const AGENT_PREFIXES: Record<string, string> = {
  QualityClaw: 'qc',
  DevClaw: 'dc',
  ResearchClaw: 'rc',
  ContentClaw: 'cc',
};

function generateApiKey(agentName: string): string {
  const prefix = AGENT_PREFIXES[agentName] || 'ag';
  const random = randomBytes(18).toString('base64url').slice(0, 24);
  return `clf_${prefix}_live_${random}`;
}

// GET — Lister les cles API agents
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const db = createServiceClient();

    const { data: keys, error } = await db
      .from('agent_api_keys')
      .select('id, name, agent_name, role, permissions, last_used_at, created_at, revoked_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Erreur base de donnees', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ keys: keys || [] });
  } catch (error) {
    console.error('[ADMIN] agent-keys GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// POST — Generer une nouvelle cle API agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const body = await request.json();
    const { agent_name, role, permissions } = body;

    // Validation
    const validAgents = ['QualityClaw', 'DevClaw', 'ResearchClaw', 'ContentClaw'];
    if (!agent_name || !validAgents.includes(agent_name)) {
      return NextResponse.json(
        { error: 'Agent invalide', details: `Agents valides : ${validAgents.join(', ')}` },
        { status: 400 }
      );
    }

    const validRoles = ['agent', 'moderator', 'readonly'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Role invalide', details: `Roles valides : ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const validPermissions = ['read', 'certify', 'review', 'download', 'publish'];
    const perms: string[] = permissions || ['read'];
    const invalidPerms = perms.filter((p: string) => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      return NextResponse.json(
        { error: 'Permissions invalides', details: `Permissions valides : ${validPermissions.join(', ')}` },
        { status: 400 }
      );
    }

    // Generer la cle
    const plainKey = generateApiKey(agent_name);
    const keyHash = await bcrypt.hash(plainKey, 10);

    const db = createServiceClient();

    const { data: newKey, error } = await db
      .from('agent_api_keys')
      .insert({
        creator_id: user.id,
        api_key_hash: keyHash,
        name: `Cle API ${agent_name}`,
        agent_name,
        role: role || 'agent',
        permissions: perms,
      })
      .select('id, name, agent_name, role, permissions, created_at')
      .single();

    if (error) {
      console.error('[ADMIN] agent-keys insert error:', error);
      return NextResponse.json(
        { error: 'Erreur creation cle', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[ADMIN] Cle API creee pour ${agent_name} par ${user.email}`);

    // Retourner la cle en clair (une seule fois)
    return NextResponse.json({
      key: newKey,
      plain_key: plainKey,
      message: `Cle API generee pour ${agent_name}. Copiez-la maintenant, elle ne sera plus affichee.`,
    });
  } catch (error) {
    console.error('[ADMIN] agent-keys POST error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

// DELETE — Revoquer une cle API
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const profile = await ensureUserProfile(supabase, user);
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acces interdit' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'ID de cle manquant' }, { status: 400 });
    }

    const db = createServiceClient();

    const { error } = await db
      .from('agent_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', keyId)
      .is('revoked_at', null);

    if (error) {
      return NextResponse.json(
        { error: 'Erreur revocation', details: error.message },
        { status: 500 }
      );
    }

    console.log(`[ADMIN] Cle API ${keyId} revoquee par ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Cle API revoquee avec succes',
    });
  } catch (error) {
    console.error('[ADMIN] agent-keys DELETE error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
