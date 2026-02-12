'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types/database';

const LICENSES = [
  { value: 'MIT', label: 'MIT' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'Proprietary', label: 'Propriétaire' },
];

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
  
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'productivity' as SkillCategory,
    description: '',
    descriptionLong: '',
    price: 0,
    license: 'MIT',
    supportUrl: '',
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
        // Not a creator, redirect to seller dashboard
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!file) {
        throw new Error('Veuillez sélectionner un fichier ZIP');
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('Le fichier ne doit pas dépasser 50 MB');
      }

      if (!file.name.endsWith('.zip')) {
        throw new Error('Le fichier doit être au format ZIP');
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Vous devez être connecté');
      }

      // Upload file to Supabase Storage
      const fileName = `${user.id}/${formData.slug}-${Date.now()}.zip`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('skills')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Erreur lors de l\'upload du fichier');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('skills')
        .getPublicUrl(fileName);

      // Create skill in database
      const { error: insertError } = await supabase
        .from('skills')
        .insert({
          title: formData.title,
          slug: formData.slug,
          category: formData.category,
          description_short: formData.description,
          description_long: formData.descriptionLong || null,
          price: formData.price,
          price_type: formData.price === 0 ? 'free' : 'one_time',
          license: formData.license,
          support_url: formData.supportUrl,
          file_url: publicUrl,
          file_size: file.size,
          creator_id: user.id,
          status: 'pending',
          certification: 'none',
          version: '1.0.0',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Erreur lors de la création du skill');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard?submitted=true');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
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
            Votre skill sera examiné par notre équipe avant d'être publié.
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nom du skill *
              </label>
              <input
                type="text"
                id="name"
                required
                maxLength={100}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Email Assistant"
              />
            </div>

            {/* Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug (URL)
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
                URL: clawforge.com/skills/{formData.slug || 'mon-skill'}
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

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Prix (€) *
              </label>
              <div className="mt-1 flex items-center gap-4">
                <input
                  type="number"
                  id="price"
                  required
                  min={0}
                  step={1}
                  value={formData.price / 100}
                  onChange={(e) => setFormData({ ...formData, price: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                  className="block w-32 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="text-sm text-gray-500">
                  {formData.price === 0 ? '🆓 Gratuit' : `💰 ${(formData.price / 100).toFixed(0)}€`}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                0 = gratuit. Vous recevez 80% du prix de vente.
              </p>
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

            {/* Support URL */}
            <div>
              <label htmlFor="supportUrl" className="block text-sm font-medium text-gray-700">
                URL de support *
              </label>
              <input
                type="url"
                id="supportUrl"
                required
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
                disabled={loading}
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
