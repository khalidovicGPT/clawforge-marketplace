'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText, FolderTree, CheckCircle, AlertTriangle, Download,
  Upload, ArrowRight, ChevronDown, ChevronUp, Shield, Code,
  Package, Loader2, XCircle, Info,
} from 'lucide-react';
import JSZip from 'jszip';
import { validateSkillZip, type ValidationResult } from '@/lib/skill-validator';

// Structure d'un skill valide pour l'affichage
const SKILL_STRUCTURE = [
  { name: 'SKILL.md', required: 'agent', desc: 'Metadonnees du skill (obligatoire via API agent, optionnel via interface)' },
  { name: 'README.md', required: false, desc: 'Documentation utilisateur (recommande)' },
  { name: 'scripts/', required: false, desc: 'Scripts executables (.py, .sh, .js)' },
  { name: 'references/', required: false, desc: 'References externes (.md)' },
  { name: 'assets/', required: false, desc: 'Ressources (images, fonts, etc.)' },
  { name: 'config/', required: false, desc: 'Fichiers de configuration (.yaml, .json)' },
];

// Champs SKILL.md ('agent' = requis via API agent, false = optionnel)
const SKILL_MD_FIELDS = [
  { name: 'name', required: 'agent' as const, desc: 'Identifiant unique du skill (kebab-case)', example: 'email-assistant' },
  { name: 'version', required: 'agent' as const, desc: 'Version semver', example: '1.0.0' },
  { name: 'description', required: 'agent' as const, desc: 'Description courte (max 200 car.)', example: 'Automatise l\'envoi d\'emails' },
  { name: 'author', required: false as const, desc: 'Nom de l\'auteur', example: 'Votre Nom' },
  { name: 'license', required: false as const, desc: 'Licence du skill', example: 'MIT' },
  { name: 'homepage', required: false as const, desc: 'URL du repository', example: 'https://github.com/...' },
  { name: 'tested_on', required: false as const, desc: 'Plateformes testees', example: '(voir template)' },
  { name: 'metadata.openclaw', required: false as const, desc: 'Config specifique OpenClaw', example: '(voir template)' },
];

// Checks de validation — toujours appliques (les deux modes)
const VALIDATION_CHECKS_ALWAYS = [
  { check: 'Taille max', desc: 'ZIP < 50 Mo, decompresse < 200 Mo', icon: Package },
  { check: 'Pas de binaires suspects', desc: 'Pas de .exe, .dll, .bat, etc.', icon: Shield },
  { check: 'Pas de secrets', desc: 'Pas de tokens/API keys dans le code', icon: Shield },
  { check: 'Pas de fichiers interdits', desc: 'Pas de .git/, .env, node_modules/', icon: Shield },
];

// Checks supplementaires en mode agent
const VALIDATION_CHECKS_AGENT = [
  { check: 'SKILL.md present', desc: 'Fichier SKILL.md a la racine du ZIP', icon: FolderTree },
  { check: 'YAML valide', desc: 'Frontmatter SKILL.md parseable', icon: Code },
  { check: 'Champs obligatoires', desc: 'name, version, description presents', icon: FileText },
  { check: 'Version semver', desc: 'Format 1.0.0 respecte', icon: Package },
];

// FAQ
const FAQ_ITEMS = [
  {
    q: 'Mon ZIP contient un dossier racine unique, est-ce accepte ?',
    a: 'Oui ! Si votre ZIP contient un seul dossier (ex: mon-skill/SKILL.md), il sera automatiquement detecte comme racine. Les deux formats sont acceptes.',
  },
  {
    q: 'Quels formats de scripts sont autorises ?',
    a: 'Python (.py), Shell (.sh), JavaScript (.js), TypeScript (.ts). Les binaires compiles (.exe, .dll) sont interdits pour des raisons de securite.',
  },
  {
    q: 'Mon skill utilise des dependances externes, comment les declarer ?',
    a: 'Utilisez le champ metadata.openclaw.requires dans SKILL.md pour lister les binaires (bins) et packages necessaires.',
  },
  {
    q: 'Je recois l\'erreur "Secret potentiel detecte", mais c\'est un faux positif',
    a: 'Notre scanner est prudent. Si votre fichier contient des patterns type api_key="xxx", remplacez les valeurs par des variables d\'environnement ou des placeholders.',
  },
  {
    q: 'Quelle est la taille maximum pour un skill ?',
    a: 'Le ZIP ne doit pas depasser 50 Mo. La taille decompresee ne doit pas depasser 200 Mo. Si votre skill est plus volumineux, optimisez les assets ou utilisez des references externes.',
  },
  {
    q: 'Comment mettre a jour un skill deja publie ?',
    a: 'Depuis votre dashboard, editez le skill et uploadez un nouveau ZIP. Incrementez le champ version dans SKILL.md (ex: 1.0.0 → 1.1.0).',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700"
      >
        {q}
        {open ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
      </button>
      {open && <p className="pb-4 text-sm text-gray-600">{a}</p>}
    </div>
  );
}

function ZipValidator() {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<'web' | 'agent'>('web');

  const handleValidate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setLoading(true);
    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const validationResult = await validateSkillZip(buffer, { mode });
      setResult(validationResult);
    } catch {
      setResult({
        valid: false,
        errors: [{ type: 'error', code: 'UNEXPECTED', message: 'Erreur lors de la validation du fichier' }],
        warnings: [],
        metadata: null,
        stats: { fileCount: 0, totalSize: 0, hasScripts: false, hasConfig: false, hasAssets: false, hasReferences: false },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6">
      <div className="text-center">
        <Upload className="mx-auto h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-lg font-semibold text-gray-900">Verificateur de skill</h3>
        <p className="mt-1 text-sm text-gray-600">
          Testez votre ZIP avant de le soumettre. La validation se fait entierement dans votre navigateur.
        </p>
        {/* Selecteur de mode */}
        <div className="mt-4 inline-flex rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => setMode('web')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              mode === 'web'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Interface web
          </button>
          <button
            onClick={() => setMode('agent')}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              mode === 'agent'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            API Agent
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {mode === 'web'
            ? 'Mode interface : SKILL.md optionnel, seuls les checks de securite sont bloquants.'
            : 'Mode agent : SKILL.md obligatoire avec frontmatter YAML valide.'}
        </p>
        <label
          htmlFor="zip-validator"
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {loading ? 'Validation en cours...' : 'Choisir un fichier ZIP'}
        </label>
        <input
          type="file"
          id="zip-validator"
          accept=".zip"
          onChange={handleValidate}
          className="sr-only"
          disabled={loading}
        />
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {/* Resultat global */}
          <div className={`flex items-center gap-3 rounded-lg p-4 ${
            result.valid
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            {result.valid ? (
              <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 flex-shrink-0 text-red-600" />
            )}
            <div>
              <p className="font-semibold">
                {result.valid ? 'Skill valide !' : 'Skill invalide'}
              </p>
              <p className="text-sm opacity-80">
                {fileName} — {result.stats.fileCount} fichier{result.stats.fileCount > 1 ? 's' : ''}
                {result.stats.totalSize > 0 && ` (${(result.stats.totalSize / 1024).toFixed(0)} Ko decomprese)`}
              </p>
            </div>
          </div>

          {/* Metadonnees detectees */}
          {result.metadata && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-800">Metadonnees detectees :</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-blue-700">
                <span>Nom : <strong>{result.metadata.name}</strong></span>
                <span>Version : <strong>{result.metadata.version}</strong></span>
                <span>Licence : <strong>{result.metadata.license || '—'}</strong></span>
                <span>Auteur : <strong>{result.metadata.author || '—'}</strong></span>
              </div>
              {result.metadata.description && (
                <p className="mt-2 text-sm text-blue-600">{result.metadata.description}</p>
              )}
            </div>
          )}

          {/* Erreurs */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-700">
                {result.errors.length} erreur{result.errors.length > 1 ? 's' : ''} :
              </p>
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <span className="font-mono text-xs text-red-500">[{err.code}]</span>{' '}
                    {err.message}
                    {err.file && <span className="text-red-400"> — {err.file}{err.line ? `:${err.line}` : ''}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-700">
                {result.warnings.length} avertissement{result.warnings.length > 1 ? 's' : ''} :
              </p>
              {result.warnings.map((warn, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <div>
                    <span className="font-mono text-xs text-amber-500">[{warn.code}]</span>{' '}
                    {warn.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Structure detectee */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-700">Structure detectee :</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={`rounded-full px-2 py-1 ${result.metadata ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                SKILL.md {result.metadata ? '✓' : '✗'}
              </span>
              {result.stats.hasScripts && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">scripts/ ✓</span>
              )}
              {result.stats.hasConfig && (
                <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">config/ ✓</span>
              )}
              {result.stats.hasAssets && (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">assets/ ✓</span>
              )}
              {result.stats.hasReferences && (
                <span className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-700">references/ ✓</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CreatorsDocPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-gray-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
            <Package className="h-4 w-4" />
            Guide Createur
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Preparer et publier un skill
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Tout ce que vous devez savoir pour packager votre skill et le publier sur ClawForge.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/templates/SKILL.md"
              download="SKILL.md"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Download className="h-4 w-4" />
              Telecharger le template SKILL.md
            </a>
            <Link
              href="/dashboard/new-skill"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Soumettre un skill
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Deux modes de publication */}
        <div className="mb-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 p-6">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Via l'interface web</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Remplissez le formulaire, uploadez votre ZIP. Les metadonnees (nom, description, prix) sont saisies directement.
              <strong className="text-blue-700"> SKILL.md optionnel.</strong>
            </p>
            <Link href="/dashboard/new-skill" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
              Soumettre un skill <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50/50 p-6">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">Via un agent OpenClaw</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              L'agent publie via l'API. Pas de formulaire : les metadonnees viennent du
              <strong className="text-yellow-700"> SKILL.md (obligatoire)</strong> dans le ZIP.
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm text-gray-400">
              API disponible prochainement
            </span>
          </div>
        </div>

        {/* Navigation rapide */}
        <nav className="mb-12 rounded-xl border bg-gray-50 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Sommaire</h2>
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            <li><a href="#structure" className="text-sm text-blue-600 hover:underline">1. Structure d'un skill</a></li>
            <li><a href="#skill-md" className="text-sm text-blue-600 hover:underline">2. Fichier SKILL.md</a></li>
            <li><a href="#validation" className="text-sm text-blue-600 hover:underline">3. Regles de validation</a></li>
            <li><a href="#etapes" className="text-sm text-blue-600 hover:underline">4. Etapes de publication</a></li>
            <li><a href="#verificateur" className="text-sm text-blue-600 hover:underline">5. Verificateur en ligne</a></li>
            <li><a href="#faq" className="text-sm text-blue-600 hover:underline">6. FAQ</a></li>
          </ol>
        </nav>

        {/* 1. Structure */}
        <section id="structure" className="mb-16">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <FolderTree className="h-6 w-6 text-blue-600" />
            1. Structure d'un skill
          </h2>
          <p className="mt-4 text-gray-600">
            Un skill ClawForge est un dossier compresse en ZIP contenant au minimum un fichier <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800">SKILL.md</code>.
            Voici la structure recommandee :
          </p>

          {/* Arborescence visuelle */}
          <div className="mt-6 rounded-xl border bg-gray-900 p-6 font-mono text-sm text-green-400">
            <div>mon-skill/</div>
            {SKILL_STRUCTURE.map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-gray-500">
                  {i === SKILL_STRUCTURE.length - 1 ? '└──' : '├──'}
                </span>
                <span className={item.required === 'agent' ? 'text-yellow-400' : 'text-gray-400'}>
                  {item.name}
                </span>
                <span className="text-gray-600"># {item.desc}</span>
                {item.required === 'agent' && (
                  <span className="rounded bg-yellow-900/50 px-1.5 text-xs text-yellow-300">requis via agent</span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Le ZIP peut contenir les fichiers directement a la racine, ou dans un dossier unique.
              Les deux formats sont acceptes automatiquement.
            </span>
          </div>
        </section>

        {/* 2. SKILL.md */}
        <section id="skill-md" className="mb-16">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <FileText className="h-6 w-6 text-blue-600" />
            2. Fichier SKILL.md
          </h2>
          <p className="mt-4 text-gray-600">
            Le fichier <code className="rounded bg-gray-100 px-1.5 py-0.5 text-sm font-mono text-gray-800">SKILL.md</code> est le manifeste
            de votre skill. Il doit commencer par un bloc YAML (frontmatter) suivi de la documentation Markdown.
          </p>

          {/* Exemple */}
          <div className="mt-6 rounded-xl border bg-gray-900 p-6 font-mono text-sm text-gray-300">
            <div className="text-gray-500">---</div>
            <div><span className="text-blue-400">name</span>: <span className="text-green-400">email-assistant</span></div>
            <div><span className="text-blue-400">version</span>: <span className="text-green-400">1.0.0</span></div>
            <div><span className="text-blue-400">description</span>: <span className="text-yellow-300">&quot;Automatise l&apos;envoi d&apos;emails via SMTP&quot;</span></div>
            <div><span className="text-blue-400">author</span>: <span className="text-yellow-300">&quot;Votre Nom&quot;</span></div>
            <div><span className="text-blue-400">license</span>: <span className="text-yellow-300">&quot;MIT&quot;</span></div>
            <div><span className="text-blue-400">homepage</span>: <span className="text-yellow-300">&quot;https://github.com/votre-repo&quot;</span></div>
            <div><span className="text-blue-400">tested_on</span>:</div>
            <div>  - <span className="text-blue-400">platform</span>: <span className="text-yellow-300">&quot;Linux&quot;</span></div>
            <div>    <span className="text-blue-400">node</span>: <span className="text-yellow-300">&quot;v22.x&quot;</span></div>
            <div>    <span className="text-blue-400">openclaw</span>: <span className="text-yellow-300">&quot;2026.2.x&quot;</span></div>
            <div><span className="text-blue-400">metadata</span>:</div>
            <div>  <span className="text-blue-400">openclaw</span>:</div>
            <div>    <span className="text-blue-400">emoji</span>: <span className="text-yellow-300">&quot;📧&quot;</span></div>
            <div>    <span className="text-blue-400">requires</span>:</div>
            <div>      <span className="text-blue-400">bins</span>: [<span className="text-yellow-300">&quot;python3&quot;</span>, <span className="text-yellow-300">&quot;curl&quot;</span>]</div>
            <div>      <span className="text-blue-400">packages</span>: [<span className="text-yellow-300">&quot;requests&quot;</span>]</div>
            <div className="text-gray-500">---</div>
            <div className="mt-2 text-gray-400"># Documentation du skill...</div>
          </div>

          {/* Tableau des champs */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 pr-4 font-semibold text-gray-900">Champ</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-900">Requis</th>
                  <th className="pb-3 pr-4 font-semibold text-gray-900">Description</th>
                  <th className="pb-3 font-semibold text-gray-900">Exemple</th>
                </tr>
              </thead>
              <tbody>
                {SKILL_MD_FIELDS.map((field, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 pr-4">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">{field.name}</code>
                    </td>
                    <td className="py-3 pr-4">
                      {field.required === 'agent' ? (
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Agent</span>
                      ) : (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Non</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{field.desc}</td>
                    <td className="py-3 font-mono text-xs text-gray-500">{field.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <a
              href="/templates/SKILL.md"
              download="SKILL.md"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Telecharger le template SKILL.md
            </a>
          </div>
        </section>

        {/* 3. Validation */}
        <section id="validation" className="mb-16">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <Shield className="h-6 w-6 text-blue-600" />
            3. Regles de validation
          </h2>
          <p className="mt-4 text-gray-600">
            Lors de l'upload, votre ZIP passe par une serie de verifications automatiques.
            Les regles different selon le mode de publication.
          </p>

          {/* Checks toujours appliques */}
          <h3 className="mt-8 text-lg font-semibold text-gray-900">
            Toujours verifies (interface web + API agent)
          </h3>
          <div className="mt-3 grid gap-3">
            {VALIDATION_CHECKS_ALWAYS.map((check, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border border-gray-200 p-4">
                <check.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{check.check}</p>
                  <p className="text-sm text-gray-600">{check.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Checks supplementaires en mode agent */}
          <h3 className="mt-8 text-lg font-semibold text-gray-900">
            Supplementaires via API agent
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Ces checks ne s'appliquent que lors de la publication via un agent OpenClaw.
            Via l'interface web, les metadonnees sont saisies dans le formulaire.
          </p>
          <div className="mt-3 grid gap-3">
            {VALIDATION_CHECKS_AGENT.map((check, i) => (
              <div key={i} className="flex items-start gap-4 rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
                <check.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="font-medium text-gray-900">{check.check}</p>
                  <p className="text-sm text-gray-600">{check.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Scan antivirus</p>
                <p className="mt-1">
                  En plus de ces verifications, chaque fichier ZIP est scanne par VirusTotal.
                  Les fichiers detectes comme malveillants sont rejetes automatiquement.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Etapes */}
        <section id="etapes" className="mb-16">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <ArrowRight className="h-6 w-6 text-blue-600" />
            4. Etapes de publication
          </h2>

          <div className="mt-6 space-y-6">
            {[
              {
                step: 1,
                title: 'Preparer votre skill',
                desc: 'Creez la structure de dossier recommandee avec SKILL.md a la racine. Utilisez notre template comme point de depart.',
              },
              {
                step: 2,
                title: 'Tester avec le verificateur',
                desc: 'Utilisez le verificateur ci-dessous pour valider votre ZIP avant de le soumettre. Corrigez les erreurs signalees.',
              },
              {
                step: 3,
                title: 'Soumettre sur ClawForge',
                desc: 'Depuis votre dashboard createur, cliquez "Nouveau skill" et uploadez votre ZIP. Remplissez les informations complementaires (prix, categorie, etc.).',
              },
              {
                step: 4,
                title: 'Validation et certification',
                desc: 'Notre equipe QualityClaw examine votre skill. Si tout est conforme, il est publie avec une certification Bronze, Silver ou Gold.',
              },
              {
                step: 5,
                title: 'Publication',
                desc: 'Votre skill est visible sur le catalogue. Si c\'est un skill payant, configurez Stripe Connect pour recevoir vos paiements (80% du prix).',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{title}</h3>
                  <p className="mt-1 text-sm text-gray-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Verificateur */}
        <section id="verificateur" className="mb-16">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            5. Verificateur en ligne
          </h2>
          <p className="mt-4 text-gray-600">
            Testez votre ZIP avant de le soumettre. Tout se passe dans votre navigateur, aucun fichier n'est envoye a nos serveurs.
          </p>

          <div className="mt-6">
            <ZipValidator />
          </div>
        </section>

        {/* 6. FAQ */}
        <section id="faq" className="mb-16">
          <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
            <Info className="h-6 w-6 text-blue-600" />
            6. FAQ
          </h2>

          <div className="mt-6 rounded-xl border bg-white">
            <div className="px-6">
              {FAQ_ITEMS.map((item, i) => (
                <FaqItem key={i} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Pret a publier ?</h2>
          <p className="mt-2 text-gray-300">
            Votre skill est pret ? Soumettez-le maintenant et rejoignez la marketplace ClawForge.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard/new-skill"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:bg-gray-100"
            >
              <Upload className="h-4 w-4" />
              Soumettre un skill
            </Link>
            <a
              href="/templates/SKILL.md"
              download="SKILL.md"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
              Template SKILL.md
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
