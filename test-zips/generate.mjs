/**
 * Script de generation des ZIPs de test pour la validation ClawForge.
 *
 * Usage : node test-zips/generate.mjs
 *
 * Genere un ZIP par cas de test dans test-zips/
 */

import JSZip from 'jszip';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateZip(name, description, builder) {
  const zip = new JSZip();
  await builder(zip);
  const buffer = await zip.generateAsync({ type: 'nodebuffer' });
  const path = join(__dirname, `${name}.zip`);
  writeFileSync(path, buffer);
  console.log(`✓ ${name}.zip (${(buffer.length / 1024).toFixed(1)} Ko) — ${description}`);
}

// ============================================================
// SKILL.md valide pour reutilisation
// ============================================================
const VALID_SKILL_MD = `---
name: email-assistant
version: 1.0.0
description: "Automatise l'envoi d'emails via SMTP"
author: "ClawForge Test"
license: "MIT"
homepage: "https://github.com/clawforge/email-assistant"
tested_on:
  - platform: "Linux"
    node: "v22.x"
    openclaw: "2026.2.x"
metadata:
  openclaw:
    emoji: "📧"
    requires:
      bins: ["python3", "curl"]
      packages: ["requests"]
---

# Email Assistant

Un skill qui automatise l'envoi d'emails via SMTP.

## Fonctionnalites
- Envoi d'emails simples
- Templates HTML
- Pieces jointes

## Installation
\`\`\`bash
pip install requests
\`\`\`

## Utilisation
\`\`\`
Agent, envoie un email a test@example.com avec le sujet "Hello"
\`\`\`
`;

const VALID_README = `# Email Assistant

Documentation complete du skill.

## Quick Start
1. Installer les dependances
2. Configurer SMTP
3. Utiliser via agent
`;

async function main() {
  console.log('Generation des ZIPs de test...\n');

  // ============================================================
  // 1. CAS VALIDE — Skill complet avec SKILL.md (passe en mode web ET agent)
  // ============================================================
  await generateZip('01-valid-complete', 'Skill complet valide (web + agent)', (zip) => {
    const folder = zip.folder('email-assistant');
    folder.file('SKILL.md', VALID_SKILL_MD);
    folder.file('README.md', VALID_README);
    folder.file('scripts/send_email.py', `#!/usr/bin/env python3
"""Script d'envoi d'emails."""
import smtplib
from email.mime.text import MIMEText

def send_email(to, subject, body):
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['To'] = to
    # Configuration SMTP via variables d'environnement
    print(f"Email envoye a {to}")

if __name__ == "__main__":
    send_email("test@example.com", "Hello", "World")
`);
    folder.file('config/smtp.yaml', `smtp:
  host: "smtp.example.com"
  port: 587
  use_tls: true
  # Les credentials sont dans les variables d'environnement
`);
    folder.file('assets/template.html', '<html><body><h1>{{subject}}</h1><p>{{body}}</p></body></html>');
    folder.file('references/smtp-rfc.md', '# RFC 5321 - Simple Mail Transfer Protocol\n\nReference technique.');
  });

  // ============================================================
  // 2. CAS VALIDE — ZIP sans dossier racine (fichiers a la racine)
  // ============================================================
  await generateZip('02-valid-flat', 'Skill valide sans dossier racine (web + agent)', (zip) => {
    zip.file('SKILL.md', VALID_SKILL_MD);
    zip.file('README.md', VALID_README);
    zip.file('scripts/main.py', 'print("Hello from skill")');
  });

  // ============================================================
  // 3. CAS VALIDE WEB — ZIP simple sans SKILL.md (passe en web, echoue en agent)
  // ============================================================
  await generateZip('03-valid-web-only', 'ZIP sans SKILL.md — valide en web, invalide en agent', (zip) => {
    zip.file('scripts/main.py', 'print("Hello")');
    zip.file('config/settings.json', '{"debug": false}');
    zip.file('README.md', '# Mon Skill\nDocumentation.');
  });

  // ============================================================
  // 4. ERREUR — ZIP vide
  // ============================================================
  await generateZip('04-error-empty', 'ZIP vide (0 fichiers)', (_zip) => {
    // Ne rien ajouter — ZIP vide
  });

  // ============================================================
  // 5. ERREUR — SKILL.md sans frontmatter YAML
  // ============================================================
  await generateZip('05-error-no-frontmatter', 'SKILL.md sans frontmatter YAML', (zip) => {
    zip.file('SKILL.md', `# Mon Skill

Pas de frontmatter YAML ici.
Juste du Markdown.
`);
  });

  // ============================================================
  // 6. ERREUR — YAML invalide dans SKILL.md
  // ============================================================
  await generateZip('06-error-invalid-yaml', 'YAML casse dans SKILL.md', (zip) => {
    zip.file('SKILL.md', `---
name: test-skill
version: 1.0.0
description: "Test
  invalid: [yaml: broken
    missing: closing bracket
---

# Test
`);
  });

  // ============================================================
  // 7. ERREUR — Champs obligatoires manquants (name absent)
  // ============================================================
  await generateZip('07-error-missing-fields', 'Champs obligatoires manquants (name, version)', (zip) => {
    zip.file('SKILL.md', `---
description: "Juste une description, pas de name ni version"
author: "Test"
---

# Mon Skill
`);
  });

  // ============================================================
  // 8. ERREUR — Version non semver
  // ============================================================
  await generateZip('08-error-bad-version', 'Version non semver (v1.0 au lieu de 1.0.0)', (zip) => {
    zip.file('SKILL.md', `---
name: bad-version-skill
version: v1.0
description: "Un skill avec une mauvaise version"
---

# Bad Version
`);
  });

  // ============================================================
  // 9. ERREUR — Binaires suspects (.exe, .dll)
  // ============================================================
  await generateZip('09-error-suspicious-binary', 'Contient des binaires suspects (.exe, .dll)', (zip) => {
    zip.file('SKILL.md', VALID_SKILL_MD);
    zip.file('scripts/helper.exe', 'FAKE_EXE_CONTENT');
    zip.file('lib/native.dll', 'FAKE_DLL_CONTENT');
  });

  // ============================================================
  // 10. ERREUR — Secrets detectes (API keys en dur)
  // ============================================================
  await generateZip('10-error-secrets', 'Contient des secrets/API keys en dur', (zip) => {
    zip.file('SKILL.md', VALID_SKILL_MD);
    zip.file('scripts/config.py', `#!/usr/bin/env python3
# Configuration avec des secrets en dur (MAUVAISE PRATIQUE)

api_key = "sk_live_51ABC123DEF456GHI789JKL"
secret_key = "whsec_abcdefghijklmnopqrstuvwxyz12345"
password = "SuperSecret123!@#"
`);
    zip.file('scripts/deploy.sh', `#!/bin/bash
# Script de deploiement
export GITHUB_TOKEN="ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh12345678"
echo "Deploying..."
`);
  });

  // ============================================================
  // 11. WARNING — Fichiers interdits (.git, .env, node_modules)
  // ============================================================
  await generateZip('11-warning-forbidden-paths', 'Contient .git/, .env, node_modules/', (zip) => {
    zip.file('SKILL.md', VALID_SKILL_MD);
    zip.file('scripts/main.py', 'print("OK")');
    zip.file('.git/config', '[core]\nrepositoryformatversion = 0');
    zip.file('.git/HEAD', 'ref: refs/heads/main');
    zip.file('.env', 'DATABASE_URL=postgres://localhost:5432/db');
    zip.file('node_modules/lodash/index.js', 'module.exports = {}');
  });

  // ============================================================
  // 12. WARNING — Nom dossier != name dans SKILL.md
  // ============================================================
  await generateZip('12-warning-name-mismatch', 'Nom dossier != name dans SKILL.md', (zip) => {
    const folder = zip.folder('mon-dossier-different');
    folder.file('SKILL.md', VALID_SKILL_MD); // name: email-assistant dans le YAML
    folder.file('README.md', VALID_README);
  });

  // ============================================================
  // 13. WARNING — README.md absent (mode agent)
  // ============================================================
  await generateZip('13-warning-no-readme', 'SKILL.md present mais pas de README.md', (zip) => {
    zip.file('SKILL.md', VALID_SKILL_MD);
    zip.file('scripts/main.py', 'print("No readme")');
  });

  // ============================================================
  // 14. CAS MIXTE — Plusieurs warnings + valide
  // ============================================================
  await generateZip('14-valid-with-warnings', 'Valide mais avec plusieurs warnings', (zip) => {
    const folder = zip.folder('mauvais-nom');
    folder.file('SKILL.md', `---
name: bon-nom
version: 1.0.0
description: "Un skill avec des warnings"
---

# Skill
`);
    // Pas de README = warning en mode agent
    // Nom mismatch = warning
    folder.file('scripts/main.py', 'print("OK")');
    folder.file('.DS_Store', 'binary_junk'); // warning forbidden
  });

  // ============================================================
  // 15. CAS LIMITE — Beaucoup de fichiers (pas trop pour la taille)
  // ============================================================
  await generateZip('15-many-files', 'ZIP avec 50 fichiers (test performance)', (zip) => {
    zip.file('SKILL.md', VALID_SKILL_MD);
    zip.file('README.md', VALID_README);
    for (let i = 0; i < 48; i++) {
      zip.file(`scripts/module_${String(i).padStart(3, '0')}.py`, `# Module ${i}\ndef func_${i}():\n    return ${i}\n`);
    }
  });

  console.log('\n✅ Tous les ZIPs generes dans test-zips/');
  console.log('\nRecap des cas de test :');
  console.log('  01-valid-complete        → ✅ Valide partout');
  console.log('  02-valid-flat            → ✅ Valide (pas de dossier racine)');
  console.log('  03-valid-web-only        → ✅ Web / ❌ Agent (pas de SKILL.md)');
  console.log('  04-error-empty           → ❌ ZIP vide');
  console.log('  05-error-no-frontmatter  → ⚠️ Web / ❌ Agent (pas de YAML)');
  console.log('  06-error-invalid-yaml    → ⚠️ Web / ❌ Agent (YAML casse)');
  console.log('  07-error-missing-fields  → ⚠️ Web / ❌ Agent (champs manquants)');
  console.log('  08-error-bad-version     → ⚠️ Web / ❌ Agent (version non semver)');
  console.log('  09-error-suspicious-bin  → ❌ Binaires suspects (.exe, .dll)');
  console.log('  10-error-secrets         → ❌ Secrets detectes');
  console.log('  11-warning-forbidden     → ⚠️ Fichiers interdits (.git, .env)');
  console.log('  12-warning-name-mismatch → ⚠️ Nom dossier ≠ SKILL.md name');
  console.log('  13-warning-no-readme     → ⚠️ Pas de README (agent)');
  console.log('  14-valid-with-warnings   → ✅ Valide + plusieurs warnings');
  console.log('  15-many-files            → ✅ 50 fichiers (perf)');
}

main().catch(console.error);
