import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Verify purchase exists
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('skill_id', id)
      .single();

    if (!purchase) {
      return NextResponse.json(
        { error: 'Achat non trouvé' },
        { status: 403 }
      );
    }

    // Get skill details (use service client to bypass RLS)
    const serviceClient = createServiceClient();
    const { data: skill, error } = await serviceClient
      .from('skills')
      .select('id, title, description_short, file_url, version')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !skill) {
      return NextResponse.json(
        { error: 'Skill non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(skill);
  } catch (error) {
    console.error('Skill fetch error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
