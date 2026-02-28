import { createServiceClient } from '@/lib/supabase/service';
import { Link } from '@/i18n/routing';
import { Package, Download, Star, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('CreatorsPage');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function CreatorsPage() {
  const t = await getTranslations('CreatorsPage');
  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error('Failed to create Supabase service client:', e);
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Users className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-2 text-gray-600">
              {t('subtitle')}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noCreators')}</h3>
            <p className="mt-2 text-gray-500">
              {t('beFirst')}
            </p>
            <Link
              href="/become-creator"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
            >
              {t('becomeCreator')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch creators who have at least one published skill
  const { data: skills } = await supabase
    .from('skills')
    .select('creator_id, download_count, rating_avg')
    .eq('status', 'published');

  // Aggregate stats per creator
  const creatorStats: Record<string, { skillCount: number; downloads: number; avgRating: number; ratingCount: number }> = {};
  (skills || []).forEach(s => {
    if (!creatorStats[s.creator_id]) {
      creatorStats[s.creator_id] = { skillCount: 0, downloads: 0, avgRating: 0, ratingCount: 0 };
    }
    creatorStats[s.creator_id].skillCount++;
    creatorStats[s.creator_id].downloads += s.download_count || 0;
    if (s.rating_avg) {
      creatorStats[s.creator_id].avgRating += s.rating_avg;
      creatorStats[s.creator_id].ratingCount++;
    }
  });

  const creatorIds = Object.keys(creatorStats);

  // Fetch creator profiles (use select('*') to avoid column name issues)
  const { data: creators } = creatorIds.length > 0
    ? await supabase
        .from('users')
        .select('*')
        .in('id', creatorIds)
    : { data: [] };

  const creatorsWithStats = (creators || []).map((c) => {
    const creator = c as Record<string, unknown>;
    const stats = creatorStats[creator.id as string];
    const avgRating = stats.ratingCount > 0
      ? (stats.avgRating / stats.ratingCount)
      : null;
    const email = creator.email as string | undefined;
    const pseudoFromEmail = email ? email.split('@')[0] : null;
    const creatorName = String(creator.name || pseudoFromEmail || 'Createur');
    const avatarUrl = creator.avatar_url as string | null;
    return { id: creator.id as string, creatorName, avatarUrl, ...stats, avgRating };
  }).sort((a, b) => b.downloads - a.downloads);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Users className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        {creatorsWithStats.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noCreators')}</h3>
            <p className="mt-2 text-gray-500">
              {t('beFirst')}
            </p>
            <Link
              href="/become-creator"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
            >
              {t('becomeCreator')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {creatorsWithStats.map(creator => (
              <div
                key={creator.id}
                className="flex flex-col items-center rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                {/* Avatar */}
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-3xl">
                  {creator.avatarUrl ? (
                    <img
                      src={creator.avatarUrl}
                      alt={creator.creatorName}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <span>{creator.creatorName[0].toUpperCase()}</span>
                  )}
                </div>

                {/* Name */}
                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  {creator.creatorName}
                </h2>

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{creator.skillCount} skill{creator.skillCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{creator.downloads.toLocaleString()}</span>
                  </div>
                  {creator.avgRating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{creator.avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <Link
                  href={`/creators/${creator.id}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('viewSkills')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
