import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { Star, Download, ArrowLeft, ShoppingCart, MessageSquare } from 'lucide-react';
import { BuyButton } from '@/components/skills/buy-button';

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

function formatPrice(price: number | null | undefined, currency = 'EUR'): string {
  if (!price || price === 0) return 'Gratuit';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price / 100) + ' TTC';
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: skill } = await supabase
    .from('skills')
    .select('title, description_short, price')
    .eq('slug', slug)
    .in('status', ['published', 'pending_payment_setup'])
    .single();

  if (!skill) {
    return {
      title: 'Skill non trouve | ClawForge',
    };
  }

  const priceText = !skill.price || skill.price === 0 ? 'Gratuit' : `${(skill.price / 100).toFixed(0)}€`;

  return {
    title: `${skill.title} - Skill OpenClaw | ClawForge`,
    description: skill.description_short || `Découvrez ${skill.title}, un skill certifié pour OpenClaw. ${priceText}.`,
    openGraph: {
      title: `${skill.title} - ClawForge`,
      description: skill.description_short || `Skill certifié pour OpenClaw - ${priceText}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${skill.title} - ClawForge`,
      description: skill.description_short || `Skill certifié pour OpenClaw`,
    },
  };
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: skill, error } = await supabase
    .from('skills')
    .select('*, purchases(count)')
    .eq('slug', slug)
    .in('status', ['published', 'pending_payment_setup'])
    .single();

  if (error || !skill) {
    notFound();
  }

  const isPendingPaymentSetup = skill.status === 'pending_payment_setup';

  // Fetch reviews for this skill
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, user_id, users(display_name)')
    .eq('skill_id', skill.id)
    .order('created_at', { ascending: false });

  const purchaseCount = (skill as Record<string, unknown>).purchases
    ? ((skill as Record<string, unknown>).purchases as { count: number }[])?.[0]?.count ?? 0
    : 0;

  const categoryEmoji = CATEGORY_EMOJIS[skill.category] || '📦';
  const certification = skill.certification
    ? CERTIFICATION_BADGES[skill.certification]
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
                <h1 className="text-2xl font-bold text-gray-900">{skill.title}</h1>
                <span className="text-2xl" title={certification.label}>
                  {certification.emoji}
                </span>
                {isPendingPaymentSetup && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    Paiement non configure
                  </span>
                )}
              </div>
              <p className="mt-1 text-gray-600">{skill.category}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className={`h-4 w-4 ${skill.rating_avg && skill.rating_avg > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  <span>
                    {skill.rating_avg && skill.rating_avg > 0
                      ? `${skill.rating_avg.toFixed(1)}`
                      : 'Pas de note'}
                  </span>
                  <span className="text-gray-400">({skill.rating_count || 0} avis)</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span>{purchaseCount.toLocaleString('fr-FR')} achat(s)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{(skill.download_count ?? 0).toLocaleString('fr-FR')} téléchargements</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="mt-3 text-gray-600 whitespace-pre-wrap">
              {skill.description_long || skill.description_short || 'Aucune description disponible.'}
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

          {/* Reviews Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              <span className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Avis ({reviews?.length || 0})
              </span>
            </h2>

            {reviews && reviews.length > 0 ? (
              <div className="mt-4 space-y-4">
                {reviews.map((review: Record<string, unknown>) => {
                  const user = review.users as { display_name: string | null } | null;
                  return (
                    <div key={review.id as string} className="rounded-lg border bg-gray-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((v) => (
                              <Star
                                key={v}
                                className={`h-4 w-4 ${
                                  v <= (review.rating as number)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {user?.display_name || 'Utilisateur'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.created_at as string).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {review.comment ? (
                        <p className="mt-2 text-sm text-gray-600">{String(review.comment)}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-lg border bg-gray-50 p-6 text-center">
                <Star className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  Aucun avis pour le moment. Achetez ce skill pour laisser le premier avis !
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Purchase Card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(skill.price)}
              </p>
              {skill.price && skill.price > 0 && (
                <p className="mt-1 text-sm text-gray-500" title="Prix toutes taxes comprises">Paiement unique — prix TTC</p>
              )}
            </div>

            <BuyButton
              skillId={skill.id}
              skillSlug={skill.slug}
              price={skill.price}
              currency={'EUR'}
              pendingPaymentSetup={isPendingPaymentSetup}
            />

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
