import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const body = await request.json();
  const { skill_id, rating, comment } = body;

  if (!skill_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: 'skill_id et rating (1-5) sont requis' },
      { status: 400 }
    );
  }

  // Verify user has purchased this skill
  const serviceClient = createServiceClient();
  const { data: purchase } = await serviceClient
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('skill_id', skill_id)
    .single();

  if (!purchase) {
    return NextResponse.json(
      { error: 'Vous devez avoir acheté ce skill pour le noter' },
      { status: 403 }
    );
  }

  // Upsert review (insert or update if already exists)
  const { data: review, error } = await serviceClient
    .from('reviews')
    .upsert(
      {
        user_id: user.id,
        skill_id,
        rating: Math.round(rating),
        comment: comment?.trim() || null,
      },
      { onConflict: 'user_id,skill_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Review upsert error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde de la note' },
      { status: 500 }
    );
  }

  return NextResponse.json({ review });
}
