import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { SkillCard } from '@/components/skills/skill-card';
import { SkillFilters } from '@/components/skills/skill-filters';
import { SKILL_CATEGORIES, type SkillWithCreator } from '@/types/database';

interface PageProps {
  searchParams: Promise<{
    category?: string;
    certification?: string;
    priceType?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
}

async function SkillsGrid({ searchParams }: { searchParams: PageProps['searchParams'] }) {
  const params = await searchParams;
  const supabase = await createClient();
  
  // Build query
  let query = supabase
    .from('skills')
    .select(`
      *,
      creator:users!creator_id(id, display_name, avatar_url)
    `)
    .eq('status', 'published');

  // Apply filters
  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category);
  }
  
  if (params.certification && params.certification !== 'all') {
    query = query.eq('certification', params.certification);
  }
  
  if (params.priceType && params.priceType !== 'all') {
    query = query.eq('price_type', params.priceType);
  }
  
  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description_short.ilike.%${params.search}%`);
  }

  // Apply sorting
  switch (params.sort) {
    case 'popular':
      query = query.order('downloads_count', { ascending: false });
      break;
    case 'rating':
      query = query.order('rating_avg', { ascending: false, nullsFirst: false });
      break;
    case 'price_asc':
      query = query.order('price', { ascending: true, nullsFirst: true });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false });
      break;
  }

  // Pagination
  const page = parseInt(params.page || '1');
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data: skills, error, count } = await query
    .range(from, to)
    .returns<SkillWithCreator[]>();

  if (error) {
    console.error('Error fetching skills:', error);
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Erreur lors du chargement des skills</p>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-12 text-center">
        <p className="text-2xl">🔍</p>
        <p className="mt-2 text-gray-600">Aucun skill trouvé</p>
        <p className="mt-1 text-sm text-gray-500">
          Essayez de modifier vos filtres ou revenez plus tard.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} />
      ))}
    </div>
  );
}

export default async function SkillsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Catalogue des Skills</h1>
        <p className="mt-2 text-gray-600">
          Découvrez des skills certifiés pour étendre les capacités de votre agent OpenClaw
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-gray-100" />}>
        <SkillFilters 
          currentCategory={params.category}
          currentCertification={params.certification}
          currentPriceType={params.priceType}
          currentSort={params.sort}
          currentSearch={params.search}
        />
      </Suspense>

      {/* Skills Grid */}
      <div className="mt-8">
        <Suspense fallback={
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        }>
          <SkillsGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
