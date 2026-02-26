import { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createServiceClient } from '@/lib/supabase/service';
import { SkillCard } from '@/components/skills/skill-card';
import { SkillFilters } from '@/components/skills/skill-filters';

export const metadata: Metadata = {
  title: 'Catalogue des Skills',
  description: 'Parcourez notre catalogue de skills certifiés pour OpenClaw. Filtrez par catégorie, prix ou certification. Trouvez le skill parfait pour votre agent IA.',
  openGraph: {
    title: 'Catalogue des Skills - ClawForge',
    description: 'Des centaines de skills certifiés pour étendre les capacités de votre agent OpenClaw.',
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    category?: string;
    certification?: string;
    priceType?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

async function SkillsGrid({ searchParams, params }: { searchParams: PageProps['searchParams']; params: PageProps['params'] }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'SkillsPage' });
  const resolvedParams = await searchParams;
  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error('Failed to create Supabase service client:', e);
    return (
      <div className="rounded-lg border bg-gray-50 p-12 text-center">
        <p className="text-4xl">🚀</p>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          {t('emptyTitle')}
        </h3>
        <p className="mt-2 text-gray-600">
          {t('emptyDescription')}
        </p>
      </div>
    );
  }

  // Build query with purchase count
  let query = supabase
    .from('skills')
    .select('*, purchases(count)', { count: 'exact' })
    .eq('status', 'published');

  // Apply filters
  if (resolvedParams.category && resolvedParams.category !== 'all') {
    query = query.eq('category', resolvedParams.category);
  }

  if (resolvedParams.certification && resolvedParams.certification !== 'all') {
    query = query.eq('certification', resolvedParams.certification);
  }

  if (resolvedParams.priceType === 'free') {
    query = query.eq('price', 0);
  } else if (resolvedParams.priceType === 'paid') {
    query = query.gt('price', 0);
  }

  if (resolvedParams.search) {
    const sanitized = resolvedParams.search.replace(/[,().\\]/g, '');
    query = query.or(`title.ilike.%${sanitized}%,description_short.ilike.%${sanitized}%`);
  }

  // Apply sorting
  switch (resolvedParams.sort) {
    case 'popular':
      query = query.order('download_count', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating_avg', { ascending: false, nullsFirst: false });
      break;
    case 'price_asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  const page = parseInt(resolvedParams.page || '1');
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: skills, error } = await query.range(from, to);

  // Fetch creator names for all skills
  const creatorIds = [...new Set((skills || []).map(s => s.creator_id).filter(Boolean))];
  const creatorNameMap: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('users')
      .select('*')
      .in('id', creatorIds);
    (creators || []).forEach((c) => {
      const u = c as Record<string, unknown>;
      const email = u.email as string | undefined;
      const pseudo = email ? email.split('@')[0] : null;
      creatorNameMap[u.id as string] = String(u.display_name || u.name || pseudo || 'Createur');
    });
  }

  if (error) {
    console.error('Supabase error:', error);
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">{t('error')}</p>
        <p className="mt-2 text-sm text-red-500">{error.message}</p>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-12 text-center">
        <p className="text-4xl">🚀</p>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          {t('emptyTitle')}
        </h3>
        <p className="mt-2 text-gray-600">
          {t('emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} creatorName={creatorNameMap[skill.creator_id]} />
      ))}
    </div>
  );
}

export default async function SkillsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('SkillsPage');
  const resolvedParams = await searchParams;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="mt-2 text-gray-600">
          {t('description')}
        </p>
      </div>

      <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-gray-100" />}>
        <SkillFilters
          currentCategory={resolvedParams.category}
          currentCertification={resolvedParams.certification}
          currentPriceType={resolvedParams.priceType}
          currentSort={resolvedParams.sort}
          currentSearch={resolvedParams.search}
        />
      </Suspense>

      <div className="mt-8">
        <Suspense fallback={
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        }>
          <SkillsGrid searchParams={searchParams} params={params} />
        </Suspense>
      </div>
    </div>
  );
}
