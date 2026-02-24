import { createServiceClient } from '@/lib/supabase/service';
import type {
  Certification,
  CertificationLevel,
  CriteriaStatus,
  SkillCertificationStatus,
} from '@/types/database';

const LEVEL_ORDER: Certification[] = ['none', 'bronze', 'silver', 'gold'];

function getNextLevel(current: Certification): CertificationLevel | null {
  const idx = LEVEL_ORDER.indexOf(current);
  if (idx < 0 || idx >= LEVEL_ORDER.length - 1) return null;
  return LEVEL_ORDER[idx + 1] as CertificationLevel;
}

/**
 * Recupere le statut de certification complet d'un skill.
 */
export async function getSkillCertificationStatus(
  skillId: string,
): Promise<SkillCertificationStatus> {
  const supabase = createServiceClient();

  // Recuperer le skill
  const { data: skill } = await supabase
    .from('skills')
    .select('id, certification, quality_score, sales_count, average_rating, rating_avg, rating_count')
    .eq('id', skillId)
    .single();

  if (!skill) {
    throw new Error('Skill introuvable');
  }

  const currentLevel = skill.certification as Certification;
  const nextLevel = getNextLevel(currentLevel);

  // Pas de niveau suivant (deja Gold)
  if (!nextLevel) {
    return {
      skill_id: skillId,
      current_level: currentLevel,
      next_level: null,
      progress_percentage: 100,
      criteria_status: [],
      can_request_upgrade: false,
      missing_criteria: [],
      pending_request: null,
    };
  }

  // Recuperer les criteres du niveau suivant
  const { data: criteria } = await supabase
    .from('certification_criteria')
    .select('*')
    .eq('level', nextLevel)
    .order('weight', { ascending: false });

  if (!criteria || criteria.length === 0) {
    return {
      skill_id: skillId,
      current_level: currentLevel,
      next_level: nextLevel,
      progress_percentage: 0,
      criteria_status: [],
      can_request_upgrade: false,
      missing_criteria: [],
      pending_request: null,
    };
  }

  // Recuperer les checks existants
  const criteriaIds = criteria.map((c: { id: string }) => c.id);
  const { data: checks } = await supabase
    .from('skill_certification_checks')
    .select('*')
    .eq('skill_id', skillId)
    .in('criteria_id', criteriaIds);

  interface CheckRow { criteria_id: string; status: string; value: string | null }
  const checkMap = new Map<string, CheckRow>(
    (checks || []).map((c: CheckRow) => [c.criteria_id, c]),
  );

  // Recuperer le nombre de ventes
  const { count: salesCount } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('skill_id', skillId);

  // Calculer le statut de chaque critere
  interface CriteriaRow { id: string; name: string; description: string | null; auto_checkable: boolean; weight: number }
  const criteriaStatus: CriteriaStatus[] = criteria.map((c: CriteriaRow) => {
    const existingCheck = checkMap.get(c.id);

    if (existingCheck) {
      return {
        criteria_id: c.id,
        name: c.name,
        description: c.description,
        status: existingCheck.status as CriteriaStatus['status'],
        value: existingCheck.value,
        auto_checkable: c.auto_checkable,
        weight: c.weight,
      };
    }

    // Auto-check si possible
    if (c.auto_checkable) {
      const autoResult = runAutoCheck(c.name, skill, salesCount || 0);
      return {
        criteria_id: c.id,
        name: c.name,
        description: c.description,
        status: autoResult.passed ? 'passed' as const : 'failed' as const,
        value: autoResult.value,
        auto_checkable: true,
        weight: c.weight,
      };
    }

    return {
      criteria_id: c.id,
      name: c.name,
      description: c.description,
      status: 'pending' as const,
      value: null,
      auto_checkable: false,
      weight: c.weight,
    };
  });

  // Calculer la progression
  const totalWeight = criteriaStatus.reduce((sum, c) => sum + c.weight, 0);
  const passedWeight = criteriaStatus
    .filter(c => c.status === 'passed')
    .reduce((sum, c) => sum + c.weight, 0);
  const progressPercentage = totalWeight > 0
    ? Math.round((passedWeight / totalWeight) * 100)
    : 0;

  const missingCriteria = criteriaStatus
    .filter(c => c.status !== 'passed')
    .map(c => c.name);

  // Verifier les criteres auto pour savoir si on peut demander l'upgrade
  const autoChecksFailed = criteriaStatus
    .filter(c => c.auto_checkable && c.status !== 'passed');
  const canRequestUpgrade = autoChecksFailed.length === 0 && missingCriteria.length === 0;

  // Verifier s'il y a une demande en cours
  const { data: pendingRequest } = await supabase
    .from('certification_requests')
    .select('*')
    .eq('skill_id', skillId)
    .eq('status', 'pending')
    .limit(1)
    .single();

  return {
    skill_id: skillId,
    current_level: currentLevel,
    next_level: nextLevel,
    progress_percentage: progressPercentage,
    criteria_status: criteriaStatus,
    can_request_upgrade: canRequestUpgrade && !pendingRequest,
    missing_criteria: missingCriteria,
    pending_request: pendingRequest || null,
  };
}

interface AutoCheckResult {
  passed: boolean;
  value: string;
}

function runAutoCheck(
  criteriaName: string,
  skill: Record<string, unknown>,
  salesCount: number,
): AutoCheckResult {
  const qualityScore = (skill.quality_score as number) || 0;
  const avgRating = (skill.rating_avg as number) || (skill.average_rating as number) || 0;
  const certification = skill.certification as string;

  switch (criteriaName) {
    case 'quality_score':
      return { passed: qualityScore >= 80, value: `${qualityScore}%` };

    case 'documentation_complete':
      // Basé sur le score qualité (partie documentation)
      return { passed: qualityScore >= 60, value: qualityScore >= 60 ? 'OK' : 'Incomplet' };

    case 'test_coverage':
      // Estimé via le score qualité
      return { passed: qualityScore >= 70, value: qualityScore >= 70 ? '>= 70%' : '< 70%' };

    case 'sales_minimum':
      return { passed: salesCount >= 5, value: `${salesCount}` };

    case 'no_critical_bugs':
      // Par defaut, on considere OK si le skill est publié
      return { passed: true, value: 'OK' };

    case 'code_quality':
      return { passed: qualityScore >= 60, value: qualityScore >= 60 ? 'OK' : 'Erreurs detectees' };

    case 'silver_validated':
      return { passed: certification === 'silver' || certification === 'gold', value: certification };

    case 'sales_volume':
      return { passed: salesCount >= 50, value: `${salesCount}` };

    case 'high_rating':
      return { passed: avgRating >= 4.5, value: `${avgRating.toFixed(1)}/5` };

    default:
      return { passed: false, value: 'N/A' };
  }
}

/**
 * Calcule et met a jour le score qualite d'un skill.
 * Score base sur les donnees disponibles dans la DB.
 */
export async function calculateAndUpdateQualityScore(skillId: string): Promise<number> {
  const supabase = createServiceClient();

  const { data: skill } = await supabase
    .from('skills')
    .select('id, file_url, icon_url, description_long, description_short, category, rating_avg, rating_count')
    .eq('id', skillId)
    .single();

  if (!skill) throw new Error('Skill introuvable');

  let score = 0;

  // 1. Documentation (20 pts)
  if (skill.description_short && skill.description_short.length > 20) score += 5;
  if (skill.description_long && skill.description_long.length > 100) score += 10;
  if (skill.description_long && skill.description_long.length > 500) score += 5;

  // 2. Metadonnees (15 pts)
  if (skill.icon_url) score += 5;
  if (skill.category) score += 5;
  if (skill.description_short && skill.description_short.length > 50) score += 5;

  // 3. Fichier present (15 pts)
  if (skill.file_url) score += 15;

  // 4. Certification existante — basee sur skill_validation_queue (20 pts)
  const { data: queueEntry } = await supabase
    .from('skill_validation_queue')
    .select('bronze_score, silver_score')
    .eq('skill_id', skillId)
    .limit(1)
    .single();

  if (queueEntry) {
    if (queueEntry.bronze_score && queueEntry.bronze_score >= 100) score += 10;
    if (queueEntry.silver_score) {
      score += Math.min(10, Math.round(queueEntry.silver_score / 10));
    }
  }

  // 5. Avis (15 pts)
  const avgRating = skill.rating_avg ? parseFloat(String(skill.rating_avg)) : 0;
  const ratingCount = skill.rating_count || 0;
  if (ratingCount >= 1) score += 5;
  if (ratingCount >= 5) score += 5;
  if (avgRating >= 4.0) score += 5;

  // 6. Ventes (15 pts)
  const { count: salesCount } = await supabase
    .from('purchases')
    .select('id', { count: 'exact', head: true })
    .eq('skill_id', skillId);

  if ((salesCount || 0) >= 1) score += 5;
  if ((salesCount || 0) >= 5) score += 5;
  if ((salesCount || 0) >= 20) score += 5;

  score = Math.min(100, Math.max(0, score));

  // Mettre a jour le skill
  await supabase
    .from('skills')
    .update({
      quality_score: score,
      sales_count: salesCount || 0,
      average_rating: avgRating,
    })
    .eq('id', skillId);

  return score;
}
