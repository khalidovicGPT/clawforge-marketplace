import { NextRequest, NextResponse } from 'next/server';
import { authenticateAgentKey } from '@/lib/agent-api-keys';
import { validateSkillZip } from '@/lib/skill-validator';
import { agentApiLimiter, checkRateLimit } from '@/lib/rate-limit';
import { createServiceClient } from '@/lib/supabase/service';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * POST /api/skills/agent/publish
 *
 * Publie un skill via un agent OpenClaw.
 * Authentification par cle API (Bearer token).
 * Le ZIP doit contenir un SKILL.md valide (mode agent strict).
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Extraire la cle API
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'MISSING_API_KEY', message: 'Header Authorization: Bearer <cle> requis' },
        { status: 401 },
      );
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'MISSING_API_KEY', message: 'Cle API vide' },
        { status: 401 },
      );
    }

    // 2. Rate limiting (par cle API)
    const rateLimited = await checkRateLimit(agentApiLimiter, apiKey);
    if (rateLimited) return rateLimited;

    // 3. Authentifier la cle
    const auth = await authenticateAgentKey(apiKey);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'INVALID_API_KEY', message: 'Cle API invalide ou revoquee' },
        { status: 401 },
      );
    }

    // 4. Verifier les permissions
    if (!auth.permissions.includes('publish')) {
      return NextResponse.json(
        { success: false, error: 'INSUFFICIENT_PERMISSIONS', message: 'Cette cle n\'a pas la permission de publier' },
        { status: 403 },
      );
    }

    // 5. Verifier que le creator est bien createur
    const supabase = createServiceClient();
    const { data: creator } = await supabase
      .from('users')
      .select('id, role, display_name')
      .eq('id', auth.creatorId)
      .single();

    if (!creator || (creator.role !== 'creator' && creator.role !== 'admin')) {
      return NextResponse.json(
        { success: false, error: 'NOT_A_CREATOR', message: 'Le compte associe n\'est pas un createur' },
        { status: 403 },
      );
    }

    // 6. Lire le fichier ZIP
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { success: false, error: 'INVALID_REQUEST', message: 'Content-Type doit etre multipart/form-data' },
        { status: 400 },
      );
    }

    const file = formData.get('skill_zip') as File;
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'MISSING_FILE', message: 'Champ skill_zip requis (fichier ZIP)' },
        { status: 400 },
      );
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { success: false, error: 'INVALID_FORMAT', message: 'Le fichier doit etre au format ZIP' },
        { status: 400 },
      );
    }

    // 7. Valider le ZIP (mode agent = strict)
    const zipBuffer = await file.arrayBuffer();
    const validation = await validateSkillZip(zipBuffer, { mode: 'agent' });

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_FAILED',
          message: 'Le ZIP ne passe pas la validation',
          details: {
            errors: validation.errors,
            warnings: validation.warnings,
          },
        },
        { status: 400 },
      );
    }

    // 8. Extraire les metadonnees du SKILL.md
    const meta = validation.metadata!;
    const slug = slugify(meta.name);

    // Verifier unicite du slug
    const { data: existingSkill } = await supabase
      .from('skills')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSkill) {
      return NextResponse.json(
        {
          success: false,
          error: 'DUPLICATE_SKILL',
          message: `Un skill avec le slug "${slug}" existe deja`,
        },
        { status: 409 },
      );
    }

    // 9. Uploader le ZIP dans Supabase Storage
    const fileName = `${auth.creatorId}/${slug}-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('skills')
      .upload(fileName, zipBuffer, {
        contentType: 'application/zip',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Agent publish - upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'UPLOAD_FAILED', message: 'Erreur lors de l\'upload du fichier' },
        { status: 500 },
      );
    }

    // URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('skills')
      .getPublicUrl(fileName);

    // 10. Creer le skill en base
    const { data: skill, error: insertError } = await supabase
      .from('skills')
      .insert({
        title: meta.name,
        slug,
        description_short: meta.description.slice(0, 200),
        description_long: null,
        category: 'other',
        price: null,
        price_type: 'free',
        creator_id: auth.creatorId,
        status: 'pending',
        certification: 'none',
        license: (meta.license as 'MIT' | 'Apache-2.0' | 'Proprietary') || 'MIT',
        support_url: meta.homepage || null,
        file_url: publicUrl,
        file_size: file.size,
        version: meta.version,
        tags: null,
      })
      .select('id, slug')
      .single();

    if (insertError || !skill) {
      console.error('Agent publish - insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'DATABASE_ERROR', message: 'Erreur lors de la creation du skill' },
        { status: 500 },
      );
    }

    console.log(`Agent publish - skill created: ${skill.id} by ${auth.creatorId} via key ${auth.keyId}`);

    // 11. Reponse succes
    return NextResponse.json({
      success: true,
      skill_id: skill.id,
      status: 'pending',
      url: `https://clawforge-marketplace.vercel.app/skills/${skill.slug}`,
      message: 'Skill soumis pour validation. Vous serez notifie par email.',
      metadata: {
        name: meta.name,
        version: meta.version,
        description: meta.description,
      },
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    });
  } catch (error) {
    console.error('Agent publish - unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
      { status: 500 },
    );
  }
}
