import { NextRequest, NextResponse } from 'next/server';
import { verifyAndConsumeDownloadToken } from '@/lib/download-tokens';

/**
 * GET /api/skills/download?token=dl_xxx
 *
 * Telecharge un skill ZIP via un token de telechargement.
 * Le token est verifie (validite, expiration, achat, nb d'utilisations).
 * Retourne le fichier ZIP avec les headers appropriés.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'MISSING_TOKEN', message: 'Parametre token requis' },
        { status: 400 },
      );
    }

    const result = await verifyAndConsumeDownloadToken(token);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'INVALID_TOKEN', message: 'Token de telechargement invalide, expire ou epuise' },
        { status: 404 },
      );
    }

    // Telecharger le fichier depuis l'URL stockee (Supabase Storage)
    const fileResponse = await fetch(result.fileUrl);

    if (!fileResponse.ok) {
      console.error(`Download token - fetch failed: ${result.fileUrl} -> ${fileResponse.status}`);
      return NextResponse.json(
        { success: false, error: 'FILE_NOT_FOUND', message: 'Fichier du skill introuvable' },
        { status: 404 },
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileName = `${result.skillSlug}-${result.skillVersion}.zip`;

    console.log(`Download token used: skill=${result.skillSlug} user=${result.userId} token=${token.slice(0, 10)}...`);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Skill-Name': result.skillTitle,
        'X-Skill-Version': result.skillVersion,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Download token - unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}
