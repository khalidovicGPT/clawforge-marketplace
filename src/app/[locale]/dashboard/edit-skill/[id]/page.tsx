'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Upload, ArrowLeft, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SKILL_CATEGORIES, type SkillCategory } from '@/types/database';

const LICENSES = [
  { value: 'MIT', label: 'MIT' },
  { value: 'Apache-2.0', label: 'Apache 2.0' },
  { value: 'Proprietary', labelKey: 'proprietaryLicense' as const },
];

const PRICE_OPTIONS = [
  { value: 0, labelKey: 'freePrice' as const },
  { value: 200, label: '2 \u20ac' },
  { value: 400, label: '4 \u20ac' },
  { value: 500, label: '5 \u20ac' },
  { value: 800, label: '8 \u20ac' },
  { value: 1000, label: '10 \u20ac' },
];

const AVAILABLE_TAGS = [
  'API', 'Authentification', 'Productivit\u00e9', 'AI', 'Automatisation',
  'Email', 'SEO', 'Analytics', 'DevOps', 'Database', 'Cloud',
  'Scraping', 'Chatbot', 'CRM', 'Paiement',
];

const MAX_TAGS = 5;

export default function EditSkillPage() {
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;
  const t = useTranslations('EditSkillPage');

  const [loading, setLoading] = useState(false);
  const [loadingSkill, setLoadingSkill] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [skillTitle, setSkillTitle] = useState('');

  const [formData, setFormData] = useState({
    category: 'productivity' as SkillCategory,
    description: '',
    descriptionLong: '',
    price: 0,
    license: 'MIT',
    supportUrl: '',
    tags: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);

  // Load existing skill data
  useEffect(() => {
    const loadSkill = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?redirect=/dashboard');
        return;
      }

      const { data: skill, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .eq('creator_id', user.id)
        .single();

      if (error || !skill) {
        setError(t('skillNotFound'));
        setLoadingSkill(false);
        return;
      }

      setSkillTitle(skill.title);
      setCurrentVersion(skill.version || '1.0.0');
      setFormData({
        category: (skill.category || 'productivity') as SkillCategory,
        description: skill.description_short || '',
        descriptionLong: skill.description_long || '',
        price: skill.price || 0,
        license: skill.license || 'MIT',
        supportUrl: skill.support_url || '',
        tags: skill.tags || [],
      });
      setLoadingSkill(false);
    };

    loadSkill();
  }, [skillId, router, t]);

  const toggleTag = (tag: string) => {
    setFormData(prev => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tag) };
      }
      if (prev.tags.length >= MAX_TAGS) return prev;
      return { ...prev, tags: [...prev.tags, tag] };
    });
  };

  const nextMajorVersion = () => {
    const major = parseInt(currentVersion.split('.')[0] || '1');
    return `${major + 1}.0.0`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUploadStep(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(t('mustBeConnected'));
      }

      let fileUrl: string | undefined;
      let fileSize: number | undefined;

      // Upload new file if provided
      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(t('fileTooLarge'));
        }
        if (!file.name.endsWith('.zip')) {
          throw new Error(t('fileFormatZip'));
        }

        setUploadStep(t('uploadNewFile'));
        const fileName = `${user.id}/${skillId}-v${nextMajorVersion()}-${Date.now()}.zip`;
        const { error: uploadError } = await supabase.storage
          .from('skills')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('skills')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
        fileSize = file.size;
      }

      // Call PATCH API
      setUploadStep(t('submittingVersion'));
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          description_short: formData.description,
          description_long: formData.descriptionLong || null,
          category: formData.category,
          price: formData.price,
          license: formData.license,
          support_url: formData.supportUrl || null,
          tags: formData.tags.length > 0 ? formData.tags : null,
          ...(fileUrl && { file_url: fileUrl, file_size: fileSize }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t('genericError'));
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setLoading(false);
      setUploadStep(null);
    }
  };

  if (loadingSkill) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const nextVersion = nextMajorVersion();

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">{t('successTitle', { version: nextVersion })}</h2>
          <p className="mt-2 text-gray-600">
            {t('successDescription')}
          </p>
          <p className="mt-4 text-sm text-gray-400">{t('redirecting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToDashboard')}
        </Link>

        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t('editTitle', { title: skillTitle })}</h1>
          <p className="mt-2 text-gray-600">
            {t.rich('currentVersion', {
              strong: (chunks) => <strong>{chunks}</strong>,
              current: currentVersion,
              next: nextVersion,
            })}
          </p>
          <p className="mt-1 text-sm text-amber-600">
            {t('validationNote')}
          </p>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Title (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('skillName')}
              </label>
              <input
                type="text"
                disabled
                value={skillTitle}
                className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-400">{t('nameReadonly')}</p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                {t('category')}
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
                {t('shortDescription')} <span className="text-gray-400">{t('shortDescriptionCount', { count: formData.description.length })}</span>
              </label>
              <textarea
                id="description"
                required
                maxLength={200}
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Long description */}
            <div>
              <label htmlFor="descriptionLong" className="block text-sm font-medium text-gray-700">
                {t('longDescription')} <span className="text-gray-400">({t('markdownSupported')})</span>
              </label>
              <textarea
                id="descriptionLong"
                rows={6}
                value={formData.descriptionLong}
                onChange={(e) => setFormData({ ...formData, descriptionLong: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                {t('price')}
              </label>
              <select
                id="price"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRICE_OPTIONS.map(({ value, label, labelKey }) => (
                  <option key={value} value={value}>{labelKey ? t(labelKey) : label}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('tags')} <span className="text-gray-400">{t('tagsCount', { count: formData.tags.length, max: MAX_TAGS })}</span>
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
                {t('license')}
              </label>
              <select
                id="license"
                required
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LICENSES.map(({ value, label, labelKey }) => (
                  <option key={value} value={value}>{labelKey ? t(labelKey) : label}</option>
                ))}
              </select>
            </div>

            {/* Support URL */}
            <div>
              <label htmlFor="supportUrl" className="block text-sm font-medium text-gray-700">
                {t('supportUrl')} <span className="text-gray-400">({t('supportUrlOptional')})</span>
              </label>
              <input
                type="url"
                id="supportUrl"
                value={formData.supportUrl}
                onChange={(e) => setFormData({ ...formData, supportUrl: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://github.com/your-repo/issues"
              />
            </div>

            {/* File upload (optional for update) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('newFileZip')} <span className="text-gray-400">({t('keepOldIfEmpty')})</span>
              </label>
              <div className="mt-1">
                <label
                  htmlFor="file"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-blue-400 hover:bg-blue-50"
                >
                  {file ? (
                    <div className="text-center">
                      <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
                      <p className="mt-2 font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        <span className="font-medium text-blue-600">{t('clickToUpload')}</span> {t('newFile')}
                      </p>
                      <p className="text-xs text-gray-500">{t('zipOnly')}</p>
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
                {t('cancel')}
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {t('submitVersion', { version: nextVersion })}
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
