import JSZip from 'jszip';

export interface CertificationCriteria {
  structure: number;      // 0-20
  documentation: number;  // 0-20
  tests: number;          // 0-20
  codeQuality: number;    // 0-20
  security: number;       // 0-20
}

export interface ScoringResult {
  score: number;
  criteria: CertificationCriteria;
  details: Record<string, string[]>;
}

// Extensions de fichiers de test
const TEST_PATTERNS = [
  /\.test\.(js|ts|py)$/,
  /\.spec\.(js|ts|py)$/,
  /_test\.(py|go)$/,
  /test_.*\.py$/,
  /^tests?\//,
];

// Patterns de mauvaise qualite
const BAD_PATTERNS = [
  { pattern: /console\.log\(/g, label: 'console.log() restant' },
  { pattern: /TODO|FIXME|HACK|XXX/g, label: 'TODO/FIXME restant' },
  { pattern: /debugger;/g, label: 'debugger; restant' },
];

// Dependances npm/pip dangereuses connues
const DANGEROUS_DEPS = [
  'event-stream', 'flatmap-stream', 'colors', 'faker',
  'ua-parser-js', 'coa', 'rc',
];

/**
 * Resout le chemin racine du ZIP (meme logique que skill-validator).
 */
function resolveRootPath(zip: JSZip): string {
  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);
  if (paths.length === 0) return '';
  const firstPart = paths[0].split('/')[0];
  const allInSameFolder = paths.every(p => p.startsWith(firstPart + '/'));
  if (allInSameFolder && zip.files[firstPart + '/']?.dir) return firstPart + '/';
  return '';
}

/**
 * Score la structure du skill (0-20).
 */
function scoreStructure(zip: JSZip, rootPath: string): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 0;

  if (zip.file(rootPath + 'SKILL.md')) { score += 5; details.push('SKILL.md present'); }
  else details.push('SKILL.md manquant');

  if (zip.file(rootPath + 'README.md')) { score += 5; details.push('README.md present'); }
  else details.push('README.md manquant');

  const hasScripts = Object.keys(zip.files).some(f => f.startsWith(rootPath + 'scripts/'));
  if (hasScripts) { score += 4; details.push('Dossier scripts/ present'); }

  const hasConfig = Object.keys(zip.files).some(f => f.startsWith(rootPath + 'config/'));
  if (hasConfig) { score += 3; details.push('Dossier config/ present'); }

  const hasLicense = zip.file(rootPath + 'LICENSE') || zip.file(rootPath + 'LICENSE.md');
  if (hasLicense) { score += 3; details.push('Fichier LICENSE present'); }

  return { score: Math.min(20, score), details };
}

/**
 * Score la qualite de la documentation (0-20).
 */
async function scoreDocumentation(zip: JSZip, rootPath: string): Promise<{ score: number; details: string[] }> {
  const details: string[] = [];
  let score = 0;

  const readmeFile = zip.file(rootPath + 'README.md');
  if (!readmeFile) return { score: 0, details: ['README.md absent'] };

  const content = await readmeFile.async('string');
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (wordCount > 100) { score += 3; details.push(`README: ${wordCount} mots`); }
  if (wordCount > 200) { score += 3; details.push('README > 200 mots'); }
  if (wordCount > 500) { score += 2; details.push('README > 500 mots'); }

  if (content.includes('# ')) { score += 2; details.push('Titre present'); }
  if (/##\s*install/i.test(content)) { score += 3; details.push('Section Installation'); }
  if (/##\s*usage/i.test(content)) { score += 3; details.push('Section Usage'); }
  if (/##\s*(exemple|example)/i.test(content)) { score += 2; details.push('Section Exemples'); }
  if (/##\s*(config|configuration)/i.test(content)) { score += 2; details.push('Section Configuration'); }

  return { score: Math.min(20, score), details };
}

/**
 * Score la presence de tests (0-20).
 */
function scoreTests(zip: JSZip, rootPath: string): { score: number; details: string[] } {
  const details: string[] = [];
  let score = 0;

  const files = Object.keys(zip.files).filter(f => !zip.files[f].dir);
  const testFiles = files.filter(f => {
    const relative = rootPath ? f.replace(rootPath, '') : f;
    return TEST_PATTERNS.some(p => p.test(relative));
  });

  if (testFiles.length > 0) {
    score += 10;
    details.push(`${testFiles.length} fichier(s) de test trouves`);
  } else {
    details.push('Aucun fichier de test');
  }

  if (testFiles.length >= 3) { score += 5; details.push('3+ fichiers de test'); }
  if (testFiles.length >= 5) { score += 5; details.push('5+ fichiers de test'); }

  return { score: Math.min(20, score), details };
}

/**
 * Score la qualite du code (0-20).
 */
async function scoreCodeQuality(zip: JSZip, rootPath: string): Promise<{ score: number; details: string[] }> {
  const details: string[] = [];
  let score = 20; // Commence a 20, on soustrait

  const codeExtensions = ['.py', '.js', '.ts', '.sh'];
  const files = Object.keys(zip.files).filter(f => {
    if (zip.files[f].dir) return false;
    return codeExtensions.some(ext => f.endsWith(ext));
  });

  let totalBadPatterns = 0;

  for (const filePath of files.slice(0, 20)) {
    try {
      const content = await zip.files[filePath].async('string');
      for (const { pattern, label } of BAD_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          totalBadPatterns += matches.length;
          details.push(`${label} dans ${filePath.replace(rootPath, '')}`);
        }
      }
    } catch {
      // Fichier non lisible
    }
  }

  if (totalBadPatterns > 0) score -= Math.min(10, totalBadPatterns * 2);
  if (totalBadPatterns === 0) details.push('Aucun pattern de mauvaise qualite detecte');

  // Bonus: fichiers bien organises
  if (files.length > 0 && files.length <= 50) { score += 0; } // OK
  if (files.length > 50) { score -= 3; details.push('Trop de fichiers code (>50)'); }

  return { score: Math.max(0, Math.min(20, score)), details };
}

/**
 * Score la securite (0-20).
 */
async function scoreSecurity(zip: JSZip, rootPath: string): Promise<{ score: number; details: string[] }> {
  const details: string[] = [];
  let score = 20;

  // Verifier package.json pour les dependances dangereuses
  const packageJson = zip.file(rootPath + 'package.json');
  if (packageJson) {
    try {
      const content = await packageJson.async('string');
      const pkg = JSON.parse(content);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      for (const dep of DANGEROUS_DEPS) {
        if (allDeps[dep]) {
          score -= 5;
          details.push(`Dependance dangereuse: ${dep}`);
        }
      }
    } catch {
      // JSON invalide
    }
  }

  // Verifier requirements.txt pour les dependances python
  const requirements = zip.file(rootPath + 'requirements.txt');
  if (requirements) {
    try {
      const content = await requirements.async('string');
      const lines = content.split('\n').map(l => l.trim().split('==')[0].split('>=')[0]);
      for (const dep of DANGEROUS_DEPS) {
        if (lines.includes(dep)) {
          score -= 5;
          details.push(`Dependance dangereuse (pip): ${dep}`);
        }
      }
    } catch {
      // Fichier non lisible
    }
  }

  if (score === 20) details.push('Aucune vulnerabilite detectee');

  return { score: Math.max(0, Math.min(20, score)), details };
}

/**
 * Calcule le score Silver complet pour un skill.
 * Retourne le score total (0-100) et le detail par critere.
 */
export async function calculateSilverScore(zipBuffer: ArrayBuffer | Buffer): Promise<ScoringResult> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const rootPath = resolveRootPath(zip);

  const [structure, documentation, tests, codeQuality, security] = await Promise.all([
    scoreStructure(zip, rootPath),
    scoreDocumentation(zip, rootPath),
    scoreTests(zip, rootPath),
    scoreCodeQuality(zip, rootPath),
    scoreSecurity(zip, rootPath),
  ]);

  const criteria: CertificationCriteria = {
    structure: structure.score,
    documentation: documentation.score,
    tests: tests.score,
    codeQuality: codeQuality.score,
    security: security.score,
  };

  const score = criteria.structure + criteria.documentation + criteria.tests + criteria.codeQuality + criteria.security;

  return {
    score,
    criteria,
    details: {
      structure: structure.details,
      documentation: documentation.details,
      tests: tests.details,
      codeQuality: codeQuality.details,
      security: security.details,
    },
  };
}
