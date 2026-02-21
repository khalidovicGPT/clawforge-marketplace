import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { createServiceClient } from '@/lib/supabase/service';

const KEY_PREFIX = 'clf_sk_live_';
const KEY_RANDOM_LENGTH = 24;
const BCRYPT_ROUNDS = 10;

/**
 * Genere une nouvelle cle API agent.
 * Retourne la cle en clair (a afficher une seule fois) et le hash bcrypt (a stocker).
 */
export async function generateApiKey(): Promise<{ plainKey: string; hash: string }> {
  const randomPart = randomBytes(KEY_RANDOM_LENGTH).toString('hex').slice(0, KEY_RANDOM_LENGTH);
  const plainKey = `${KEY_PREFIX}${randomPart}`;
  const hash = await bcrypt.hash(plainKey, BCRYPT_ROUNDS);
  return { plainKey, hash };
}

/**
 * Verifie une cle API agent contre le hash stocke en base.
 */
export async function verifyApiKey(plainKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainKey, hash);
}

/**
 * Verifie une cle API et retourne le creator_id associe + son role.
 * Met a jour last_used_at en cas de succes.
 * Retourne null si la cle est invalide ou revoquee.
 */
export async function authenticateAgentKey(
  apiKey: string,
): Promise<{ creatorId: string; keyId: string; permissions: string[]; creatorRole: string | null } | null> {
  if (!apiKey.startsWith(KEY_PREFIX)) {
    return null;
  }

  const supabase = createServiceClient();

  // Recuperer toutes les cles actives (non revoquees)
  const { data: keys, error } = await supabase
    .from('agent_api_keys')
    .select('id, creator_id, api_key_hash, permissions, revoked_at')
    .is('revoked_at', null);

  if (error || !keys || keys.length === 0) {
    return null;
  }

  // Verifier la cle contre chaque hash (bcrypt)
  for (const key of keys) {
    const match = await verifyApiKey(apiKey, key.api_key_hash);
    if (match) {
      // Mettre a jour last_used_at
      await supabase
        .from('agent_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', key.id);

      // Recuperer le role du createur (meme client service)
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', key.creator_id)
        .single();

      return {
        creatorId: key.creator_id,
        keyId: key.id,
        permissions: key.permissions || ['publish'],
        creatorRole: user?.role || null,
      };
    }
  }

  return null;
}

/**
 * Cree une nouvelle cle API pour un createur.
 * Revoque automatiquement les anciennes cles actives.
 */
export async function createApiKeyForCreator(
  creatorId: string,
  name: string = 'Agent OpenClaw',
): Promise<{ plainKey: string; keyId: string }> {
  const supabase = createServiceClient();

  // Revoquer les anciennes cles actives
  await supabase
    .from('agent_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('creator_id', creatorId)
    .is('revoked_at', null);

  // Generer la nouvelle cle
  const { plainKey, hash } = await generateApiKey();

  // Inserer en base
  const { data, error } = await supabase
    .from('agent_api_keys')
    .insert({
      creator_id: creatorId,
      api_key_hash: hash,
      name,
      permissions: ['publish'],
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Erreur creation cle API : ${error?.message || 'Inconnu'}`);
  }

  return { plainKey, keyId: data.id };
}

/**
 * Revoque une cle API specifique.
 */
export async function revokeApiKey(keyId: string, creatorId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('agent_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('creator_id', creatorId)
    .is('revoked_at', null);

  return !error;
}

/**
 * Recupere les cles API actives d'un createur (sans le hash).
 */
export async function getCreatorApiKeys(creatorId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('agent_api_keys')
    .select('id, name, permissions, last_used_at, created_at, revoked_at')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}
