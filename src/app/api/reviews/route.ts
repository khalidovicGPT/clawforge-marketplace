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

  const serviceClient = createServiceClient();

  // Verify user has purchased this skill
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

  // Manually recalculate and update rating_avg / rating_count on the skill
  const { data: allReviews, error: fetchError } = await serviceClient
    .from('reviews')
    .select('rating')
    .eq('skill_id', skill_id);

  if (fetchError) {
    console.error('Error fetching reviews for recalc:', fetchError);
  }

  let updatedAvg: number | null = null;
  let updatedCount = 0;

  if (allReviews && allReviews.length > 0) {
    updatedCount = allReviews.length;
    const sum = allReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0);
    updatedAvg = Math.round((sum / updatedCount) * 10) / 10;

    const { error: updateError } = await serviceClient
      .from('skills')
      .update({
        rating_avg: updatedAvg,
        rating_count: updatedCount,
      })
      .eq('id', skill_id);

    if (updateError) {
      console.error('Error updating skill rating:', updateError);
    }
  }

  return NextResponse.json({
    review,
    rating_avg: updatedAvg,
    rating_count: updatedCount,
  });
}
