import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

/**
 * POST : Créateur accepte les nouvelles CGV (paiement différé)
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifie' }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: profile } = await serviceClient
      .from('users')
      .select('role, creator_terms_accepted_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil non trouve' }, { status: 404 });
    }

    if (profile.creator_terms_accepted_at) {
      return NextResponse.json({
        success: true,
        message: 'CGV deja acceptees',
        accepted_at: profile.creator_terms_accepted_at,
      });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await serviceClient
      .from('users')
      .update({ creator_terms_accepted_at: now })
      .eq('id', user.id);

    if (updateError) {
      console.error('Accept terms error:', updateError);
      return NextResponse.json({ error: 'Erreur mise a jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'CGV createur acceptees',
      accepted_at: now,
    });
  } catch (error) {
    console.error('Accept terms error:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
