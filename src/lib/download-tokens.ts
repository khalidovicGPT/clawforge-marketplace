import { randomBytes } from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';

const TOKEN_PREFIX = 'dl_';
const TOKEN_RANDOM_LENGTH = 24;
const TOKEN_EXPIRY_DAYS = 7;
const TOKEN_MAX_USES = 5;

/**
 * Genere un token de telechargement pour un skill achete.
 */
export async function generateDownloadToken(
  userId: string,
  skillId: string,
): Promise<{ token: string; expiresAt: string }> {
  const supabase = createServiceClient();

  const randomPart = randomBytes(TOKEN_RANDOM_LENGTH).toString('hex').slice(0, TOKEN_RANDOM_LENGTH);
  const token = `${TOKEN_PREFIX}${randomPart}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_EXPIRY_DAYS);

  const { error } = await supabase
    .from('skill_download_tokens')
    .insert({
      user_id: userId,
      skill_id: skillId,
      token,
      expires_at: expiresAt.toISOString(),
      max_uses: TOKEN_MAX_USES,
    });

  if (error) {
    throw new Error(`Erreur creation token : ${error.message}`);
  }

  return { token, expiresAt: expiresAt.toISOString() };
}

/**
 * Verifie un token de telechargement et retourne les infos du skill.
 * Incremente le compteur d'utilisation si valide.
 */
export async function verifyAndConsumeDownloadToken(token: string): Promise<{
  userId: string;
  skillId: string;
  skillTitle: string;
  skillSlug: string;
  skillVersion: string;
  fileUrl: string;
} | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;

  const supabase = createServiceClient();

  // Recuperer le token avec les infos du skill
  const { data: tokenData, error } = await supabase
    .from('skill_download_tokens')
    .select('id, user_id, skill_id, used_count, max_uses, expires_at')
    .eq('token', token)
    .single();

  if (error || !tokenData) return null;

  // Verifier expiration
  if (new Date(tokenData.expires_at) < new Date()) return null;

  // Verifier nombre d'utilisations
  if (tokenData.used_count >= tokenData.max_uses) return null;

  // Verifier que l'utilisateur a bien achete le skill
  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', tokenData.user_id)
    .eq('skill_id', tokenData.skill_id)
    .single();

  if (!purchase) return null;

  // Recuperer les infos du skill
  const { data: skill } = await supabase
    .from('skills')
    .select('title, slug, version, file_url')
    .eq('id', tokenData.skill_id)
    .single();

  if (!skill || !skill.file_url) return null;

  // Incrementer le compteur d'utilisation
  await supabase
    .from('skill_download_tokens')
    .update({ used_count: tokenData.used_count + 1 })
    .eq('id', tokenData.id);

  return {
    userId: tokenData.user_id,
    skillId: tokenData.skill_id,
    skillTitle: skill.title,
    skillSlug: skill.slug,
    skillVersion: skill.version,
    fileUrl: skill.file_url,
  };
}

/**
 * Recupere le token actif d'un utilisateur pour un skill.
 * Retourne null si aucun token valide n'existe.
 */
export async function getActiveDownloadToken(
  userId: string,
  skillId: string,
): Promise<{ token: string; expiresAt: string; usedCount: number; maxUses: number } | null> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('skill_download_tokens')
    .select('token, expires_at, used_count, max_uses')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .gte('expires_at', new Date().toISOString())
    .lt('used_count', 5)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data) return null;

  return {
    token: data.token,
    expiresAt: data.expires_at,
    usedCount: data.used_count,
    maxUses: data.max_uses,
  };
}
