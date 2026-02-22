import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/skills/[id]/download
 *
 * Telecharge le ZIP d'un skill directement par son ID.
 * Accessible par les admins (session) ou les agents avec permission 'download' ou 'certify'.
 * Cet endpoint est destine a QualityClaw et aux admins pour l'analyse des skills.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: skillId } = await params;
    let isAuthorized = false;

    // Auth: soit session admin, soit cle API agent
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const apiKey = authHeader.replace('Bearer ', '').trim();
      const auth = await authenticateAgentKey(apiKey);
      if (auth && (auth.creatorRole === 'admin' || auth.permissions.includes('download') || auth.permissions.includes('certify'))) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const serviceClient = createServiceClient();
          const { data: profile } = await serviceClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile?.role === 'admin') isAuthorized = true;
        }
      } catch {
        // Pas de session
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

    // Recuperer le skill
    const supabase = createServiceClient();
    const { data: skill } = await supabase
      .from('skills')
      .select('id, title, slug, version, file_url')
      .eq('id', skillId)
      .single();

    if (!skill?.file_url) {
      return NextResponse.json({ error: 'Skill ou fichier introuvable' }, { status: 404 });
    }

    // Telecharger le fichier depuis Supabase Storage
    const fileResponse = await fetch(skill.file_url);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: 'Impossible de telecharger le fichier' }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileName = `${skill.slug}-${skill.version}.zip`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Skill-Name': skill.title,
        'X-Skill-Version': skill.version,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('skill download error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
