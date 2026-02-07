import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES, type SkillWithCreator } from '@/types/database';
import { formatPrice, formatNumber, formatDate, formatFileSize } from '@/lib/utils';
import { Star, Download, Calendar, FileArchive, ExternalLink, ArrowLeft } from 'lucide-react';
import { BuyButton } from '@/components/skills/buy-button';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SkillDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch skill with creator info
  const { data: skill, error } = await supabase
    .from('skills')
    .select(`
      *,
      creator:users!creator_id(id, display_name, avatar_url, role)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single<SkillWithCreator>();

  if (error || !skill) {
    notFound();
  }

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users!user_id(id, display_name, avatar_url)
    `)
    .eq('skill_id', skill.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const category = SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES];
  const certification = CERTIFICATION_BADGES[skill.certification];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
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
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 text-4xl">
              {skill.icon_url ? (
                <img src={skill.icon_url} alt={skill.title} className="h-14 w-14 rounded-xl" />
              ) : (
                category?.emoji || '📦'
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{skill.title}</h1>
                <span className="text-2xl" title={certification.label}>
                  {certification.emoji}
                </span>
              </div>
              <p className="mt-1 text-gray-600">{category?.label || skill.category}</p>
              <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                {skill.rating_avg && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{skill.rating_avg.toFixed(1)}</span>
                    <span>({skill.rating_count} avis)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{formatNumber(skill.downloads_count)} téléchargements</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">Description</h2>
            <p className="mt-2 text-gray-600">{skill.description_short}</p>
            {skill.description_long && (
              <div className="mt-4 prose prose-gray max-w-none">
                <p className="whitespace-pre-wrap text-gray-600">{skill.description_long}</p>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="mt-8 grid gap-4 rounded-xl border bg-gray-50 p-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500">Version</p>
              <p className="font-medium text-gray-900">{skill.version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Licence</p>
              <p className="font-medium text-gray-900">{skill.license}</p>
            </div>
            {skill.openclaw_min_version && (
              <div>
                <p className="text-sm text-gray-500">OpenClaw minimum</p>
                <p className="font-medium text-gray-900">{skill.openclaw_min_version}</p>
              </div>
            )}
            {skill.file_size && (
              <div>
                <p className="text-sm text-gray-500">Taille</p>
                <p className="font-medium text-gray-900">{formatFileSize(skill.file_size)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Publié le</p>
              <p className="font-medium text-gray-900">
                {skill.published_at ? formatDate(skill.published_at) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dernière mise à jour</p>
              <p className="font-medium text-gray-900">{formatDate(skill.updated_at)}</p>
            </div>
          </div>

          {/* Reviews */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Avis ({skill.rating_count})
            </h2>
            {reviews && reviews.length > 0 ? (
              <div className="mt-4 space-y-4">
                {reviews.map((review: any) => (
                  <div key={review.id} className="rounded-lg border bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {review.user?.avatar_url ? (
                          <img
                            src={review.user.avatar_url}
                            alt={review.user.display_name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
                            {review.user?.display_name?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="font-medium text-gray-900">
                          {review.user?.display_name || 'Anonyme'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-gray-600">{review.comment}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-gray-500">Aucun avis pour le moment.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Price Card */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-gray-900">
                {formatPrice(skill.price)}
              </p>
              {skill.price_type === 'one_time' && (
                <p className="text-sm text-gray-500">Paiement unique</p>
              )}
              
              <BuyButton skill={skill} />

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4" />
                  <span>Archive ZIP téléchargeable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Mises à jour incluses</span>
                </div>
              </div>
            </div>

            {/* Creator Card */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Créé par</p>
              <div className="mt-3 flex items-center gap-3">
                {skill.creator.avatar_url ? (
                  <img
                    src={skill.creator.avatar_url}
                    alt={skill.creator.display_name || 'Créateur'}
                    className="h-12 w-12 rounded-full"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-lg font-medium">
                    {skill.creator.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {skill.creator.display_name || 'Anonyme'}
                  </p>
                  <p className="text-sm text-gray-500">Créateur vérifié</p>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Liens</p>
              <div className="mt-3 space-y-2">
                <a
                  href={skill.support_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Support / Issues
                </a>
                {skill.repository_url && (
                  <a
                    href={skill.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Code source
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
