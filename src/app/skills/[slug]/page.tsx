import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Star, Download, ArrowLeft } from 'lucide-react';

const CERTIFICATION_BADGES: Record<string, { emoji: string; label: string }> = {
  bronze: { emoji: '🥉', label: 'Bronze' },
  silver: { emoji: '🥈', label: 'Silver' },
  gold: { emoji: '🥇', label: 'Gold' },
};

const CATEGORY_EMOJIS: Record<string, string> = {
  'Communication': '📧',
  'Productivité': '⚡',
  'Développement': '💻',
  'Données': '📊',
  'Intégration': '🔗',
};

function formatPrice(price: number, currency = 'EUR'): string {
  if (price === 0) return 'Gratuit';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price / 100);
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: skill, error } = await supabase
    .from('skills')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved')
    .single();

  if (error || !skill) {
    notFound();
  }

  const categoryEmoji = CATEGORY_EMOJIS[skill.category] || '📦';
  const certification = skill.certification_level 
    ? CERTIFICATION_BADGES[skill.certification_level] 
    : { emoji: '📦', label: 'Standard' };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/skills"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au catalogue
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl">
              {categoryEmoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{skill.name}</h1>
                <span className="text-2xl" title={certification.label}>
                  {certification.emoji}
                </span>
              </div>
              <p className="mt-1 text-gray-600">{skill.category}</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                {skill.rating_avg && skill.rating_avg > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{skill.rating_avg.toFixed(1)}</span>
                    <span className="text-gray-400">({skill.rating_count} avis)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{skill.download_count.toLocaleString('fr-FR')} téléchargements</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="mt-3 text-gray-600 whitespace-pre-wrap">
              {skill.long_description || skill.description || 'Aucune description disponible.'}
            </p>
          </div>

          {/* Features */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Informations</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm text-gray-500">Version</dt>
                <dd className="mt-1 font-medium text-gray-900">{skill.version || '1.0.0'}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm text-gray-500">Catégorie</dt>
                <dd className="mt-1 font-medium text-gray-900">{skill.category}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm text-gray-500">Certification</dt>
                <dd className="mt-1 font-medium text-gray-900">{certification.emoji} {certification.label}</dd>
              </div>
              <div className="rounded-lg bg-gray-50 p-4">
                <dt className="text-sm text-gray-500">Dernière mise à jour</dt>
                <dd className="mt-1 font-medium text-gray-900">
                  {new Date(skill.updated_at).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Sidebar - Purchase Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(skill.price, skill.currency)}
              </p>
              {skill.price > 0 && (
                <p className="mt-1 text-sm text-gray-500">Paiement unique</p>
              )}
            </div>

            <button
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700"
            >
              {skill.price === 0 ? 'Télécharger gratuitement' : 'Acheter maintenant'}
            </button>

            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Accès immédiat après achat</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Mises à jour gratuites</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span>Support créateur</span>
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                <strong>80% pour le créateur</strong> — En achetant ce skill, vous soutenez directement son créateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
