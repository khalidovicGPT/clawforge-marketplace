'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, ArrowLeft, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types/database';

const LICENSES = [
  { value: 'MIT', label: 'MIT' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'Proprietary', label: 'Propriétaire' },
];

const PRICE_OPTIONS = [
  { value: 0, label: 'Gratuit' },
  { value: 200, label: '2 €' },
  { value: 400, label: '4 €' },
  { value: 500, label: '5 €' },
  { value: 800, label: '8 €' },
  { value: 1000, label: '10 €' },
];

const AVAILABLE_TAGS = [
  'API', 'Authentification', 'Productivité', 'AI', 'Automatisation',
  'Email', 'SEO', 'Analytics', 'DevOps', 'Database', 'Cloud',
  'Scraping', 'Chatbot', 'CRM', 'Paiement',
];

const MAX_TAGS = 5;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function NewSkillPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'productivity' as SkillCategory,
    description: '',
    descriptionLong: '',
    price: 0,
    license: 'MIT',
    supportUrl: '',
    tags: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);

  // Check if user is creator
  useEffect(() => {
    const checkCreatorStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/dashboard/new-skill');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isCreatorRole = profile?.role === 'creator' || profile?.role === 'admin';
      setIsCreator(isCreatorRole);

      if (!isCreatorRole) {
        router.push('/dashboard/seller');
      }
    };

    checkCreatorStatus();
  }, [router]);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.title) {
      setFormData(prev => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [formData.title]);

  // Check for duplicate skill name (debounced, case-insensitive)
  useEffect(() => {
    if (!formData.title || formData.title.length < 2) {
      setNameError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingName(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('skills')
          .select('id')
          .ilike('title', formData.title)
          .limit(1);

        if (data && data.length > 0) {
          setNameError('Ce nom est déjà utilisé');
        } else {
          setNameError(null);
        }
      } catch {
        // Ignore check errors
      } finally {
        setCheckingName(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.title]);

  const toggleTag = (tag: string) => {
    setFormData(prev => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tag) };
      }
      if (prev.tags.length >= MAX_TAGS) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadStep(null);

    try {
      if (nameError) {
        throw new Error(nameError);
      }

      if (!file) {
        throw new Error('Veuillez sélectionner un fichier ZIP');
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 50 MB');
      }

      if (!file.name.endsWith('.zip')) {
        throw new Error('Le fichier doit être au format ZIP');
      }

      // Step 1: Auth
      setUploadStep('Vérification de l\'authentification...');
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('[1/4] Auth error:', authError);
        throw new Error(`Erreur d'authentification : ${authError.message}`);
      }

      if (!user) {
        throw new Error('Vous devez être connecté');
      }
      console.log('[1/4] Auth OK - user:', user.id);

      // Step 2: Check bucket exists
      setUploadStep('Vérification du stockage...');
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('[2/4] Buckets disponibles:', buckets?.map(b => b.name), 'Error:', bucketsError);

      if (bucketsError) {
        throw new Error(`Erreur stockage : ${bucketsError.message}`);
      }

      const skillsBucket = buckets?.find(b => b.name === 'skills');
      if (!skillsBucket) {
        throw new Error(
          'Le bucket de stockage "skills" n\'existe pas. ' +
          'Créez-le dans Supabase Dashboard > Storage > New bucket (nom: skills, public: activé).'
        );
      }
      console.log('[2/4] Bucket "skills" trouvé, public:', skillsBucket.public);

      // Step 3: Upload file
      setUploadStep(`Upload du fichier (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);
      const fileName = `${user.id}/${formData.slug}-${Date.now()}.zip`;
      console.log('[3/4] Upload vers:', fileName, 'Taille:', file.size);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('skills')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[3/4] Upload error:', JSON.stringify(uploadError));
        const msg = (uploadError as { message?: string; statusCode?: string }).message || 'Erreur inconnue';
        const code = (uploadError as { statusCode?: string }).statusCode || '';

        if (msg.includes('Bucket not found') || code === '404') {
          throw new Error(
            'Bucket "skills" introuvable. Créez-le dans Supabase Dashboard > Storage.'
          );
        }
        if (msg.includes('row-level security') || msg.includes('policy') || code === '403') {
          throw new Error(
            'Permission refusée. Ajoutez une Storage Policy dans Supabase : ' +
            'Allow authenticated users to upload (INSERT) dans le bucket "skills".'
          );
        }
        if (msg.includes('Payload too large') || code === '413') {
          throw new Error('Fichier trop volumineux pour le stockage Supabase.');
        }
        throw new Error(`Upload échoué : ${msg}`);
      }
      console.log('[3/4] Upload OK:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('skills')
        .getPublicUrl(fileName);
      console.log('[3/4] Public URL:', publicUrl);

      // Step 4: Create skill in database
      setUploadStep('Enregistrement du skill...');
      const { error: insertError } = await supabase
        .from('skills')
        .insert({
          name: formData.title,
          title: formData.title,
          slug: formData.slug,
          category: formData.category,
          description_short: formData.description,
          description_long: formData.descriptionLong || null,
          price: formData.price,
          price_type: formData.price === 0 ? 'free' : 'one_time',
          license: formData.license,
          support_url: formData.supportUrl || null,
          file_url: publicUrl,
          file_size: file.size,
          creator_id: user.id,
          status: 'pending',
          certification: 'none',
          version: '1.0.0',
          tags: formData.tags.length > 0 ? formData.tags : null,
        });

      if (insertError) {
        console.error('[4/4] Insert error:', JSON.stringify(insertError));
        throw new Error(`Erreur base de données : ${insertError.message}`);
      }
      console.log('[4/4] Skill créé avec succès');

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard?submitted=true');
      }, 2000);

    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setUploadStep(null);
    }
  };

  // Loading state while checking creator status
  if (isCreator === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Skill soumis !</h2>
          <p className="mt-2 text-gray-600">
            Votre skill est en attente de certification. Vous serez notifié par email.
          </p>
          <p className="mt-4 text-sm text-gray-400">Redirection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Soumettre un nouveau skill</h1>
          <p className="mt-2 text-gray-600">
            Votre skill sera examiné par notre équipe avant d&apos;être publié.
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Name with duplicate check */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom du skill *
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="name"
                  required
                  maxLength={100}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`mt-1 block w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 ${
                    nameError
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Ex: Email Assistant"
                />
                {checkingName && (
                  <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              {nameError && (
                <p className="mt-1 text-sm text-red-600">{nameError}</p>
              )}
            </div>

            {/* Slug (auto-generated, editable) */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug (URL) <span className="text-gray-400">— auto-généré, modifiable</span>
              </label>
              <input
                type="text"
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600"
                placeholder="email-assistant"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL: clawforge.io/skills/{formData.slug || 'mon-skill'}
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Catégorie *
              </label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as SkillCategory })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(SKILL_CATEGORIES).map(([key, { label, emoji }]) => (
                  <option key={key} value={key}>
                    {emoji} {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Short description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description courte * <span className="text-gray-400">({formData.description.length}/200)</span>
              </label>
              <textarea
                id="description"
                required
                maxLength={200}
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Une description concise de votre skill..."
              />
            </div>

            {/* Long description */}
            <div>
              <label htmlFor="descriptionLong" className="block text-sm font-medium text-gray-700">
                Description détaillée <span className="text-gray-400">(Markdown supporté)</span>
              </label>
              <textarea
                id="descriptionLong"
                rows={6}
                value={formData.descriptionLong}
                onChange={(e) => setFormData({ ...formData, descriptionLong: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="## Fonctionnalités&#10;- Feature 1&#10;- Feature 2&#10;&#10;## Installation&#10;..."
              />
            </div>

            {/* Price - Dropdown */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Prix *
              </label>
              <select
                id="price"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRICE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Vous recevez 80% du prix de vente.
              </p>
            </div>

            {/* Tags - Chips */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags <span className="text-gray-400">({formData.tags.length}/{MAX_TAGS} max)</span>
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = formData.tags.includes(tag);
                  const isDisabled = !isSelected && formData.tags.length >= MAX_TAGS;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={isDisabled}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : isDisabled
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                      {isSelected && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* License */}
            <div>
              <label htmlFor="license" className="block text-sm font-medium text-gray-700">
                Licence *
              </label>
              <select
                id="license"
                required
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LICENSES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Support URL - Optional */}
            <div>
              <label htmlFor="supportUrl" className="block text-sm font-medium text-gray-700">
                URL de support <span className="text-gray-400">(optionnel)</span>
              </label>
              <input
                type="url"
                id="supportUrl"
                value={formData.supportUrl}
                onChange={(e) => setFormData({ ...formData, supportUrl: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/votre-repo/issues"
              />
              <p className="mt-1 text-xs text-gray-500">
                Lien vers les issues GitHub ou page de support
              </p>
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fichier ZIP *
              </label>
              <div className="mt-1">
                <label
                  htmlFor="file"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition hover:border-blue-400 hover:bg-blue-50"
                >
                  {file ? (
                    <div className="text-center">
                      <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
                      <p className="mt-2 font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-blue-600">Cliquez pour upload</span>
                        {' '}ou glissez-déposez
                      </p>
                      <p className="text-xs text-gray-500">ZIP uniquement, max 50 MB</p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="file"
                    accept=".zip"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Upload progress */}
            {uploadStep && (
              <div className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span>{uploadStep}</span>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-4 border-t pt-6">
              <Link
                href="/dashboard"
                className="rounded-lg px-6 py-2 text-gray-600 hover:text-gray-900"
              >
                Annuler
              </Link>
              <button
                type="submit"
                disabled={loading || !!nameError}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Soumettre le skill
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
