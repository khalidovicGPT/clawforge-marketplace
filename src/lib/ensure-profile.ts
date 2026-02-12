import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Ensures a row exists in the public `users` table for the given auth user.
 * The Supabase trigger `on_auth_user_created` should do this automatically,
 * but it may not fire for users created before the trigger was set up,
 * or if the trigger was not applied to the database.
 *
 * Returns the user profile (existing or newly created).
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
) {
  // Try to fetch existing profile
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) return existing;

  // Profile missing — create it from auth metadata
  const meta = user.user_metadata || {};
  const displayName =
    meta.full_name || meta.name || user.email?.split('@')[0] || 'Utilisateur';

  const { data: created, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      email: user.email!,
      display_name: displayName,
      avatar_url: meta.avatar_url || null,
      role: 'user',
      stripe_onboarding_complete: false,
    })
    .select()
    .single();

  if (error) {
    console.error('ensureUserProfile insert error:', error);
    throw new Error(`Impossible de créer le profil : ${error.message}`);
  }

  return created;
}
