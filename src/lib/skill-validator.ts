import JSZip from 'jszip';
import { parse as parseYaml } from 'yaml';

// Taille max du ZIP : 50 Mo
const MAX_ZIP_SIZE = 50 * 1024 * 1024;
// Taille max decompresee : 200 Mo (protection ZIP bomb)
const MAX_UNCOMPRESSED_SIZE = 200 * 1024 * 1024;
// Nombre max de fichiers
const MAX_FILES = 500;

// Extensions binaires suspectes
const SUSPICIOUS_EXTENSIONS = [
  '.exe', '.dll', '.bin', '.bat', '.cmd', '.com', '.scr',
  '.msi', '.vbs', '.wsh', '.wsf', '.ps1', '.pif',
];

// Dossiers/fichiers a rejeter
const FORBIDDEN_PATHS = [
  '.git/', '.env', 'node_modules/', '.DS_Store',
  '__MACOSX/',
];

// Patterns pour detecter des secrets
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i,
  /(?:secret[_-]?key|secret)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i,
  /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /(?:access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i,
  /(?:sk_live|sk_test|pk_live|pk_test)_[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
];

// Champs obligatoires du frontmatter SKILL.md
const REQUIRED_FIELDS = ['name', 'version', 'description'];

export interface ValidationWarning {
  type: 'warning';
  code: string;
  message: string;
  file?: string;
  line?: number;
}

export interface ValidationError {
  type: 'error';
  code: string;
  message: string;
  file?: string;
  line?: number;
}

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  tested_on?: Array<{ platform?: string; node?: string; openclaw?: string }>;
  metadata?: {
    openclaw?: {
      emoji?: string;
      requires?: {
        bins?: string[];
        packages?: string[];
      };
    };
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: SkillMetadata | null;
  stats: {
    fileCount: number;
    totalSize: number;
    hasScripts: boolean;
    hasConfig: boolean;
    hasAssets: boolean;
    hasReferences: boolean;
  };
}

/**
 * Extrait le frontmatter YAML d'un fichier SKILL.md
 * Format attendu : --- yaml --- contenu markdown
 */
function extractFrontmatter(content: string): { yaml: string; body: string } | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)/);
  if (!match) return null;
  return { yaml: match[1], body: match[2] };
}

/**
 * Valide le format semver (simplifie)
 */
function isValidSemver(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(version);
}

/**
 * Resout le chemin racine du ZIP.
 * Si tous les fichiers sont dans un dossier unique, on utilise ce dossier comme racine.
 * Sinon, la racine est vide (fichiers a la racine du ZIP).
 */
function resolveRootPath(zip: JSZip): string {
  const paths = Object.keys(zip.files).filter(p => !zip.files[p].dir);
  if (paths.length === 0) return '';

  // Verifie si tous les fichiers sont dans un meme dossier racine
  const firstPart = paths[0].split('/')[0];
  const allInSameFolder = paths.every(p => p.startsWith(firstPart + '/'));

  if (allInSameFolder && zip.files[firstPart + '/']?.dir) {
    return firstPart + '/';
  }
  return '';
}

/**
 * Valide un buffer ZIP contenant un skill ClawForge.
 * Verifie la structure, le contenu SKILL.md, la securite.
 */
export async function validateSkillZip(zipBuffer: ArrayBuffer | Buffer): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let metadata: SkillMetadata | null = null;
  const stats = {
    fileCount: 0,
    totalSize: 0,
    hasScripts: false,
    hasConfig: false,
    hasAssets: false,
    hasReferences: false,
  };

  // 1. Verifier la taille du ZIP
  const zipSize = zipBuffer instanceof ArrayBuffer ? zipBuffer.byteLength : zipBuffer.length;
  if (zipSize > MAX_ZIP_SIZE) {
    errors.push({
      type: 'error',
      code: 'ZIP_TOO_LARGE',
      message: `Le fichier ZIP depasse la limite de ${MAX_ZIP_SIZE / 1024 / 1024} Mo (${(zipSize / 1024 / 1024).toFixed(1)} Mo)`,
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // 2. Charger le ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    errors.push({
      type: 'error',
      code: 'INVALID_ZIP',
      message: 'Le fichier n\'est pas un ZIP valide',
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // 3. Compter les fichiers et verifier la taille decompresee
  const files = Object.values(zip.files).filter(f => !f.dir);
  stats.fileCount = files.length;

  if (files.length === 0) {
    errors.push({
      type: 'error',
      code: 'EMPTY_ZIP',
      message: 'Le ZIP est vide',
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  if (files.length > MAX_FILES) {
    errors.push({
      type: 'error',
      code: 'TOO_MANY_FILES',
      message: `Le ZIP contient trop de fichiers (${files.length}/${MAX_FILES} max)`,
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // Calculer la taille totale decompresee
  for (const file of files) {
    // JSZip expose _data.uncompressedSize pour chaque fichier
    const uncompressedSize = (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0;
    stats.totalSize += uncompressedSize;
  }

  if (stats.totalSize > MAX_UNCOMPRESSED_SIZE) {
    errors.push({
      type: 'error',
      code: 'UNCOMPRESSED_TOO_LARGE',
      message: `La taille decompresee depasse ${MAX_UNCOMPRESSED_SIZE / 1024 / 1024} Mo (${(stats.totalSize / 1024 / 1024).toFixed(1)} Mo)`,
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // 4. Determiner le chemin racine
  const rootPath = resolveRootPath(zip);

  // 5. Verifier la presence de SKILL.md
  const skillMdPath = rootPath + 'SKILL.md';
  const skillMdFile = zip.file(skillMdPath);

  if (!skillMdFile) {
    errors.push({
      type: 'error',
      code: 'MISSING_SKILL_MD',
      message: `Fichier SKILL.md obligatoire non trouve a la racine du ZIP${rootPath ? ` (cherche dans ${rootPath})` : ''}`,
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // 6. Parser SKILL.md
  let skillMdContent: string;
  try {
    skillMdContent = await skillMdFile.async('string');
  } catch {
    errors.push({
      type: 'error',
      code: 'SKILL_MD_UNREADABLE',
      message: 'Impossible de lire SKILL.md',
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  const frontmatter = extractFrontmatter(skillMdContent);
  if (!frontmatter) {
    errors.push({
      type: 'error',
      code: 'INVALID_FRONTMATTER',
      message: 'SKILL.md doit commencer par un bloc YAML (--- ... ---)',
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // 7. Parser le YAML
  let parsedYaml: Record<string, unknown>;
  try {
    parsedYaml = parseYaml(frontmatter.yaml) as Record<string, unknown>;
  } catch (err) {
    const yamlError = err instanceof Error ? err.message : 'Erreur inconnue';
    errors.push({
      type: 'error',
      code: 'INVALID_YAML',
      message: `YAML invalide dans SKILL.md : ${yamlError}`,
      file: 'SKILL.md',
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  if (!parsedYaml || typeof parsedYaml !== 'object') {
    errors.push({
      type: 'error',
      code: 'INVALID_YAML',
      message: 'Le YAML de SKILL.md doit etre un objet',
      file: 'SKILL.md',
    });
    return { valid: false, errors, warnings, metadata, stats };
  }

  // 8. Verifier les champs obligatoires
  const missingFields = REQUIRED_FIELDS.filter(f => !parsedYaml[f]);
  if (missingFields.length > 0) {
    errors.push({
      type: 'error',
      code: 'MISSING_REQUIRED_FIELDS',
      message: `Champs obligatoires manquants dans SKILL.md : ${missingFields.join(', ')}`,
      file: 'SKILL.md',
    });
  }

  // 9. Valider le format de version
  if (parsedYaml.version && !isValidSemver(String(parsedYaml.version))) {
    errors.push({
      type: 'error',
      code: 'INVALID_VERSION',
      message: `Format de version invalide "${parsedYaml.version}". Utilisez le format semver (ex: 1.0.0)`,
      file: 'SKILL.md',
    });
  }

  // 10. Construire les metadonnees
  if (errors.length === 0 || !missingFields.length) {
    metadata = {
      name: String(parsedYaml.name || ''),
      version: String(parsedYaml.version || ''),
      description: String(parsedYaml.description || ''),
      author: parsedYaml.author ? String(parsedYaml.author) : undefined,
      license: parsedYaml.license ? String(parsedYaml.license) : undefined,
      homepage: parsedYaml.homepage ? String(parsedYaml.homepage) : undefined,
      tested_on: parsedYaml.tested_on as SkillMetadata['tested_on'],
      metadata: parsedYaml.metadata as SkillMetadata['metadata'],
    };
  }

  // 11. Scanner les fichiers pour securite
  for (const file of files) {
    const fileName = file.name;
    const relativePath = rootPath ? fileName.replace(rootPath, '') : fileName;

    // Dossiers/fichiers interdits
    const isForbidden = FORBIDDEN_PATHS.some(p =>
      relativePath.startsWith(p) || relativePath.includes('/' + p)
    );
    if (isForbidden) {
      warnings.push({
        type: 'warning',
        code: 'FORBIDDEN_PATH',
        message: `Fichier ou dossier non autorise : ${relativePath}`,
        file: relativePath,
      });
      continue;
    }

    // Extensions suspectes
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();
    if (SUSPICIOUS_EXTENSIONS.includes(ext)) {
      errors.push({
        type: 'error',
        code: 'SUSPICIOUS_BINARY',
        message: `Extension binaire suspecte detectee : ${relativePath}`,
        file: relativePath,
      });
      continue;
    }

    // Detecter la structure
    if (relativePath.startsWith('scripts/')) stats.hasScripts = true;
    if (relativePath.startsWith('config/')) stats.hasConfig = true;
    if (relativePath.startsWith('assets/')) stats.hasAssets = true;
    if (relativePath.startsWith('references/')) stats.hasReferences = true;

    // Scanner les fichiers texte pour les secrets (sauf images et binaires connus)
    const textExtensions = ['.py', '.sh', '.js', '.ts', '.yaml', '.yml', '.json', '.md', '.txt', '.env', '.cfg', '.ini', '.toml'];
    if (textExtensions.some(e => fileName.toLowerCase().endsWith(e))) {
      try {
        const content = await file.async('string');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(lines[i])) {
              errors.push({
                type: 'error',
                code: 'SECRET_DETECTED',
                message: `Secret potentiel detecte dans ${relativePath} (ligne ${i + 1})`,
                file: relativePath,
                line: i + 1,
              });
              break;
            }
          }
        }
      } catch {
        // Fichier non lisible en texte, ignorer
      }
    }
  }

  // 12. Coherence nom dossier / name dans SKILL.md
  if (metadata?.name && rootPath) {
    const folderName = rootPath.replace(/\/$/, '');
    if (folderName !== metadata.name) {
      warnings.push({
        type: 'warning',
        code: 'NAME_MISMATCH',
        message: `Le nom du dossier "${folderName}" ne correspond pas au champ "name" dans SKILL.md ("${metadata.name}")`,
      });
    }
  }

  // 13. Verifier presence README.md (recommande)
  const readmePath = rootPath + 'README.md';
  if (!zip.file(readmePath)) {
    warnings.push({
      type: 'warning',
      code: 'MISSING_README',
      message: 'README.md recommande mais absent',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata,
    stats,
  };
}
