import { createServiceClient } from '@/lib/supabase/service';
import { validateSkillZip } from '@/lib/skill-validator';
import { calculateSilverScore, type ScoringResult } from '@/lib/certification-scorer';

const SILVER_THRESHOLD = 80;

interface BronzeResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface CertificationResult {
  bronze: BronzeResult;
  silver: ScoringResult | null;
  finalStatus: 'bronze_auto' | 'pending_silver_review' | 'rejected';
  certification: 'bronze' | 'none';
}

/**
 * Lance la validation complete d'un skill (Bronze auto + check Silver).
 * Appele apres soumission d'un skill (status = 'pending').
 *
 * 1. Cree une entree dans skill_validation_queue
 * 2. Telecharge le ZIP et lance la validation Bronze
 * 3. Si Bronze OK, calcule le score Silver
 * 4. Met a jour le skill (status, certification)
 */
export async function runSkillCertification(skillId: string): Promise<CertificationResult> {
  const supabase = createServiceClient();

  // 1. Creer l'entree dans la queue
  await supabase
    .from('skill_validation_queue')
    .upsert({
      skill_id: skillId,
      status: 'processing',
    }, { onConflict: 'skill_id' })
    .select()
    .single();

  // 2. Recuperer le skill et son fichier
  const { data: skill } = await supabase
    .from('skills')
    .select('id, file_url, title, creator_id')
    .eq('id', skillId)
    .single();

  if (!skill?.file_url) {
    await updateQueue(skillId, 'rejected', null, null, 'Fichier ZIP introuvable');
    await supabase.from('skills').update({ status: 'rejected' }).eq('id', skillId);
    return {
      bronze: { passed: false, errors: ['Fichier ZIP introuvable'], warnings: [] },
      silver: null,
      finalStatus: 'rejected',
      certification: 'none',
    };
  }

  // 3. Telecharger le ZIP
  let zipBuffer: ArrayBuffer;
  try {
    const response = await fetch(skill.file_url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    zipBuffer = await response.arrayBuffer();
  } catch (e) {
    const msg = `Impossible de telecharger le ZIP: ${e instanceof Error ? e.message : 'Erreur inconnue'}`;
    await updateQueue(skillId, 'rejected', null, null, msg);
    await supabase.from('skills').update({ status: 'rejected' }).eq('id', skillId);
    return {
      bronze: { passed: false, errors: [msg], warnings: [] },
      silver: null,
      finalStatus: 'rejected',
      certification: 'none',
    };
  }

  // 4. Validation Bronze (reutilise le validateur existant en mode agent)
  const validation = await validateSkillZip(zipBuffer, { mode: 'agent' });
  const bronzeResult: BronzeResult = {
    passed: validation.valid,
    errors: validation.errors.map(e => e.message),
    warnings: validation.warnings.map(w => w.message),
  };

  if (!bronzeResult.passed) {
    await updateQueue(skillId, 'rejected', 0, null, bronzeResult.errors.join(' | '));
    await supabase.from('skills').update({ status: 'rejected' }).eq('id', skillId);
    return {
      bronze: bronzeResult,
      silver: null,
      finalStatus: 'rejected',
      certification: 'none',
    };
  }

  // 5. Bronze OK → certifier
  await supabase.from('skills').update({
    status: 'published',
    certification: 'bronze',
    published_at: new Date().toISOString(),
  }).eq('id', skillId);

  await supabase.from('skill_certifications').insert({
    skill_id: skillId,
    level: 'bronze',
    score: 100,
    criteria: { checks: bronzeResult },
  });

  // 6. Calculer le score Silver
  let silverResult: ScoringResult | null = null;
  let finalStatus: 'bronze_auto' | 'pending_silver_review' = 'bronze_auto';

  try {
    silverResult = await calculateSilverScore(zipBuffer);
    if (silverResult.score >= SILVER_THRESHOLD) {
      finalStatus = 'pending_silver_review';
    }
  } catch (e) {
    console.error('Silver scoring error:', e);
  }

  await updateQueue(skillId, finalStatus, 100, silverResult?.score ?? null, null, silverResult?.criteria as Record<string, number> | undefined);

  console.log(`Certification: skill=${skillId} bronze=PASS silver_score=${silverResult?.score ?? 'N/A'} status=${finalStatus}`);

  return {
    bronze: bronzeResult,
    silver: silverResult,
    finalStatus,
    certification: 'bronze',
  };
}

async function updateQueue(
  skillId: string,
  status: string,
  bronzeScore: number | null,
  silverScore: number | null,
  rejectionReason: string | null,
  silverCriteria?: Record<string, number> | null,
) {
  const supabase = createServiceClient();
  await supabase
    .from('skill_validation_queue')
    .upsert({
      skill_id: skillId,
      status,
      bronze_score: bronzeScore,
      silver_score: silverScore,
      silver_criteria: silverCriteria ?? null,
      rejection_reason: rejectionReason,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'skill_id' });
}

/**
 * Certifie un skill en Silver ou Gold (action admin/QualityClaw).
 */
export async function certifySkill(
  skillId: string,
  level: 'silver' | 'gold',
  certifiedBy: string | null,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { data: skill } = await supabase
    .from('skills')
    .select('id, certification')
    .eq('id', skillId)
    .single();

  if (!skill) return { success: false, error: 'Skill introuvable' };

  // Verifier la hierarchie
  if (level === 'silver' && skill.certification === 'gold') {
    return { success: false, error: 'Skill deja certifie Gold' };
  }
  if (level === 'gold' && skill.certification !== 'silver') {
    return { success: false, error: 'Le skill doit etre Silver avant Gold' };
  }

  // Mettre a jour le skill
  await supabase.from('skills').update({
    certification: level,
    certified_at: new Date().toISOString(),
  }).eq('id', skillId);

  // Ajouter la certification
  await supabase.from('skill_certifications').insert({
    skill_id: skillId,
    level,
    certified_by: certifiedBy,
    criteria: notes ? { notes } : null,
  });

  // Mettre a jour la queue
  const queueStatus = level === 'silver' ? 'silver_approved' : 'gold_eligible';
  await supabase
    .from('skill_validation_queue')
    .update({ status: queueStatus, processed_by: certifiedBy, processed_at: new Date().toISOString() })
    .eq('skill_id', skillId);

  return { success: true };
}

/**
 * Rejette un skill (action admin/QualityClaw).
 */
export async function rejectSkill(
  skillId: string,
  reason: string,
  rejectedBy: string | null,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient();

  await supabase.from('skills').update({ status: 'rejected' }).eq('id', skillId);

  await supabase
    .from('skill_validation_queue')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      processed_by: rejectedBy,
      processed_at: new Date().toISOString(),
    })
    .eq('skill_id', skillId);

  return { success: true };
}
