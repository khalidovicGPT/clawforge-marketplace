import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { ArrowLeft, Package, Download, Star, ShoppingCart } from 'lucide-react';
import { SkillCard } from '@/components/skills/skill-card';
import { getTranslations } from 'next-intl/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations('CreatorProfilePage');

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error('Failed to create Supabase service client in generateMetadata:', e);
    return {
      title: t('defaultMetaTitle'),
      description: t('defaultMetaDescription'),
    };
  }

  const { data: creator } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  const c = creator as Record<string, unknown>;
  const emailMeta = c?.email as string | undefined;
  const pseudoMeta = emailMeta ? emailMeta.split('@')[0] : null;
  const name = String(c?.name || pseudoMeta || t('defaultCreator'));

  return {
    title: t('metaTitle', { name }),
    description: t('metaDescription', { name }),
  };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const t = await getTranslations('CreatorProfilePage');
  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error('Failed to create Supabase service client in CreatorProfilePage:', e);
    notFound();
  }

  // Fetch creator profile (use select('*') to avoid column name issues)
  const { data: creatorData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !creatorData) {
    notFound();
  }

  const creator = creatorData as Record<string, unknown>;
  const emailStr = creator.email as string | undefined;
  const pseudoFromEmail = emailStr ? emailStr.split('@')[0] : null;
  const creatorName = String(creator.name || pseudoFromEmail || t('defaultCreator'));

  // Fetch creator's published skills with purchase counts
  const { data: skills } = await supabase
    .from('skills')
    .select('*, purchases(count)')
    .eq('creator_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // Compute aggregate stats
  const totalSkills = skills?.length || 0;
  const totalDownloads = (skills || []).reduce((sum, s) => sum + (s.download_count || 0), 0);
  const totalPurchases = (skills || []).reduce((sum, s) => {
    const count = (s as Record<string, unknown>).purchases
      ? ((s as Record<string, unknown>).purchases as { count: number }[])?.[0]?.count ?? 0
      : 0;
    return sum + count;
  }, 0);
  const ratedSkills = (skills || []).filter(s => s.rating_avg && s.rating_avg > 0);
  const avgRating = ratedSkills.length > 0
    ? ratedSkills.reduce((sum, s) => sum + s.rating_avg, 0) / ratedSkills.length
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/creators"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToCreators')}
        </Link>

        {/* Creator Header */}
        <div className="mb-8 rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-blue-100 text-4xl">
              {creator.avatar_url ? (
                <img
                  src={String(creator.avatar_url)}
                  alt={creatorName}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <span>{creatorName[0].toUpperCase()}</span>
              )}
            </div>

            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{creatorName}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('memberSince', { date: new Date(String(creator.created_at)).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) })}
              </p>

              {/* Stats */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span><strong>{totalSkills}</strong> {t('skills')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                  <span><strong>{totalPurchases.toLocaleString()}</strong> {t('purchases')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-4 w-4 text-purple-500" />
                  <span><strong>{totalDownloads.toLocaleString()}</strong> {t('downloads')}</span>
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span><strong>{avgRating.toFixed(1)}</strong> {t('avgRating')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          {t('skillsOf', { name: creatorName })}
        </h2>

        {skills && skills.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} creatorName={creatorName} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">{t('noSkills')}</h3>
            <p className="mt-2 text-gray-500">
              {t('noSkillsDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
