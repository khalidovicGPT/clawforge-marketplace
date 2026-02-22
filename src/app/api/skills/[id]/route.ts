import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { validateSkillZip } from '@/lib/skill-validator';

type RouteContext = { params: Promise<{ id: string }> };

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

/**
 * PATCH /api/skills/[id]
 *
 * Actions:
 * - action: "withdraw"  → set status to 'draft' (creator withdraws their published skill)
 * - action: "republish" → set status back to 'published' (only if skill was not modified since last publish)
 * - action: "update"    → submit a new version (increments version, resets to 'pending' for validation)
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const serviceClient = createServiceClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch the skill and verify ownership
    const { data: skill, error: fetchError } = await serviceClient
      .from('skills')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !skill) {
      return NextResponse.json({ error: 'Skill non trouvé' }, { status: 404 });
    }

    if (skill.creator_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    // --- WITHDRAW ---
    if (action === 'withdraw') {
      if (skill.status !== 'published') {
        return NextResponse.json(
          { error: 'Seul un skill publié peut être retiré' },
          { status: 400 }
        );
      }

      const { error } = await serviceClient
        .from('skills')
        .update({ status: 'draft', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Skill retiré du catalogue' });
    }

    // --- REPUBLISH (without re-validation, only if not modified) ---
    if (action === 'republish') {
      // Can only republish a draft that was previously published (has published_at and certified_at)
      if (skill.status !== 'draft') {
        return NextResponse.json(
          { error: 'Seul un skill en brouillon peut être republié' },
          { status: 400 }
        );
      }

      if (!skill.published_at || !skill.certified_at) {
        return NextResponse.json(
          { error: 'Ce skill n\'a jamais été publié. Il doit passer par la validation.' },
          { status: 400 }
        );
      }

      const { error } = await serviceClient
        .from('skills')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Skill republié' });
    }

    // --- UPDATE (new version, goes through validation) ---
    if (action === 'update') {
      const { description_short, description_long, category, price, license, support_url, tags, file_url, file_size } = body;

      // Si un nouveau fichier est fourni, valider le ZIP avant d'accepter
      if (file_url) {
        let zipBuffer: ArrayBuffer;
        try {
          const fileResponse = await fetch(file_url);
          if (!fileResponse.ok) {
            return NextResponse.json(
              { error: `Impossible de telecharger le fichier: HTTP ${fileResponse.status}` },
              { status: 400 },
            );
          }
          zipBuffer = await fileResponse.arrayBuffer();
        } catch (e) {
          return NextResponse.json(
            { error: `Erreur lors du telechargement du fichier: ${e instanceof Error ? e.message : 'Erreur inconnue'}` },
            { status: 400 },
          );
        }

        const validation = await validateSkillZip(zipBuffer, { mode: 'web' });
        if (!validation.valid) {
          return NextResponse.json(
            {
              error: 'INVALID_SKILL_STRUCTURE',
              message: 'Le ZIP ne respecte pas la structure requise',
              details: {
                errors: validation.errors,
                warnings: validation.warnings,
              },
            },
            { status: 400 },
          );
        }
      } else {
        // Pas de nouveau fichier : valider le ZIP existant du skill
        const existingFileUrl = skill.file_url;
        if (existingFileUrl) {
          let zipBuffer: ArrayBuffer;
          try {
            const fileResponse = await fetch(existingFileUrl);
            if (fileResponse.ok) {
              zipBuffer = await fileResponse.arrayBuffer();
              const validation = await validateSkillZip(zipBuffer, { mode: 'web' });
              if (!validation.valid) {
                return NextResponse.json(
                  {
                    error: 'INVALID_SKILL_STRUCTURE',
                    message: 'Le fichier ZIP actuel ne respecte pas la structure requise. Veuillez soumettre un nouveau fichier.',
                    details: {
                      errors: validation.errors,
                      warnings: validation.warnings,
                    },
                  },
                  { status: 400 },
                );
              }
            }
          } catch {
            // Si le fichier existant est inaccessible, on laisse passer
            // la certification automatique detectera le probleme
          }
        }
      }

      // Increment version: 1.0.0 → 2.0.0, 2.0.0 → 3.0.0, etc.
      const currentMajor = parseInt(skill.version?.split('.')[0] || '1');
      const newVersion = `${currentMajor + 1}.0.0`;

      const updateData: Record<string, unknown> = {
        status: 'pending',
        version: newVersion,
        certification: 'none',
        certified_at: null,
        published_at: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Only update fields that are provided
      if (description_short !== undefined) updateData.description_short = description_short;
      if (description_long !== undefined) updateData.description_long = description_long;
      if (category !== undefined) updateData.category = category;
      if (price !== undefined) {
        updateData.price = price;
        updateData.price_type = price === 0 ? 'free' : 'one_time';
      }
      if (license !== undefined) updateData.license = license;
      if (support_url !== undefined) updateData.support_url = support_url;
      if (tags !== undefined) updateData.tags = tags;
      if (file_url !== undefined) updateData.file_url = file_url;
      if (file_size !== undefined) updateData.file_size = file_size;

      const { error } = await serviceClient
        .from('skills')
        .update(updateData)
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Version ${newVersion} soumise pour validation`,
        version: newVersion,
      });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (error) {
    console.error('Skill update error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
