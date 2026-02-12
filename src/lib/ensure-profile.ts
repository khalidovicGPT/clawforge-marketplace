import { createClient as createAdminClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Ensures a row exists in the public `users` table for the given auth user.
 * The Supabase trigger `on_auth_user_created` should do this automatically,
 * but it may not fire for users created before the trigger was set up,
 * or if the trigger was not applied to the database.
 *
 * Uses the service role key to bypass RLS for the INSERT (same pattern
 * as the signup route), since the `users` table has no INSERT policy.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  user: User,
) {
  // Try to fetch existing profile (uses user's session — SELECT is allowed by RLS)
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (existing) return existing;

  // Need service role to bypass RLS for INSERT
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY non configuré — impossible de créer le profil');
  }

  const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Profile missing — create it from auth metadata
  const meta = user.user_metadata || {};
  const displayName =
    meta.full_name || meta.name || user.email?.split('@')[0] || 'Utilisateur';

  // Try full insert first (matches schema.sql)
  const { data: created, error } = await supabaseAdmin
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

  if (!error) return created;

  // If column doesn't exist, fallback to minimal insert
  if (error.message.includes('column') || error.message.includes('schema cache')) {
    console.warn('ensureUserProfile: full insert failed, trying minimal:', error.message);

    const { data: minimal, error: minError } = await supabaseAdmin
      .from('users')
      .insert({ id: user.id, email: user.email! })
      .select()
      .single();

    if (!minError) return minimal;

    console.error('ensureUserProfile minimal insert error:', minError);
    throw new Error(`Impossible de créer le profil : ${minError.message}`);
  }

  console.error('ensureUserProfile insert error:', error);
  throw new Error(`Impossible de créer le profil : ${error.message}`);
}
