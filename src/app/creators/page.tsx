import { createServiceClient } from '@/lib/supabase/service';
import Link from 'next/link';
import { Package, Download, Star, Users } from 'lucide-react';

export const metadata = {
  title: 'Createurs — ClawForge',
  description: 'Decouvrez les createurs de skills sur ClawForge Marketplace',
};

export default async function CreatorsPage() {
  const supabase = createServiceClient();

  // Fetch creators who have at least one published skill
  const { data: skills } = await supabase
    .from('skills')
    .select('creator_id, downloads_count, rating_avg')
    .eq('status', 'published');

  // Aggregate stats per creator
  const creatorStats: Record<string, { skillCount: number; downloads: number; avgRating: number; ratingCount: number }> = {};
  (skills || []).forEach(s => {
    if (!creatorStats[s.creator_id]) {
      creatorStats[s.creator_id] = { skillCount: 0, downloads: 0, avgRating: 0, ratingCount: 0 };
    }
    creatorStats[s.creator_id].skillCount++;
    creatorStats[s.creator_id].downloads += s.downloads_count || 0;
    if (s.rating_avg) {
      creatorStats[s.creator_id].avgRating += s.rating_avg;
      creatorStats[s.creator_id].ratingCount++;
    }
  });

  const creatorIds = Object.keys(creatorStats);

  // Fetch creator profiles
  const { data: creators } = creatorIds.length > 0
    ? await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', creatorIds)
    : { data: [] };

  const creatorsWithStats = (creators || []).map(creator => {
    const stats = creatorStats[creator.id];
    const avgRating = stats.ratingCount > 0
      ? (stats.avgRating / stats.ratingCount)
      : null;
    return { ...creator, ...stats, avgRating };
  }).sort((a, b) => b.downloads - a.downloads);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Users className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Createurs</h1>
          <p className="mt-2 text-gray-600">
            Decouvrez les createurs de skills sur ClawForge
          </p>
        </div>

        {creatorsWithStats.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun createur pour le moment</h3>
            <p className="mt-2 text-gray-500">
              Soyez le premier a publier un skill !
            </p>
            <Link
              href="/become-creator"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
            >
              Devenir createur
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
                  {creator.avatar_url ? (
                    <img
                      src={creator.avatar_url}
                      alt={creator.display_name || 'Createur'}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <span>{(creator.display_name || '?')[0].toUpperCase()}</span>
                  )}
                </div>

                {/* Name */}
                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  {creator.display_name || 'Createur anonyme'}
                </h2>

                {/* Stats */}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    <span>{creator.skillCount} skill{creator.skillCount > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    <span>{creator.downloads.toLocaleString('fr-FR')}</span>
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
                  href={`/skills?search=${encodeURIComponent(creator.display_name || '')}`}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Voir les skills
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
