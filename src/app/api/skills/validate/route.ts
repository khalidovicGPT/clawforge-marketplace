import { NextRequest, NextResponse } from 'next/server';
import { validateSkillZip } from '@/lib/skill-validator';

/**
 * POST /api/skills/validate
 * Valide un ZIP de skill sans le soumettre.
 * Accessible sans authentification (pour le verificateur en ligne).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Le fichier doit etre au format ZIP' },
        { status: 400 }
      );
    }

    const mode = (formData.get('mode') as 'web' | 'agent') || 'web';
    const zipBuffer = await file.arrayBuffer();
    const result = await validateSkillZip(zipBuffer, { mode });

    return NextResponse.json({
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
      metadata: result.metadata,
      stats: result.stats,
    });
  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la validation' },
      { status: 500 }
    );
  }
}
