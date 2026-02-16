import { Suspense } from 'react';
import { Metadata } from 'next';
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
  const supabase = createServiceClient();
  
  // Build query - simple select without join for now
  let query = supabase
    .from('skills')
    .select('*', { count: 'exact' })
    .eq('status', 'published');

  // Apply filters
  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category);
  }
  
  if (params.certification && params.certification !== 'all') {
    query = query.eq('certification', params.certification);
  }
  
  if (params.priceType === 'free') {
    query = query.eq('price', 0);
  } else if (params.priceType === 'paid') {
    query = query.gt('price', 0);
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
  const page = parseInt(params.page || '1');
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data: skills, error } = await query.range(from, to);

  if (error) {
    console.error('Supabase error:', error);
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Erreur lors du chargement des skills</p>
        <p className="mt-2 text-sm text-red-500">{error.message}</p>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
    return (
      <div className="rounded-lg border bg-gray-50 p-12 text-center">
        <p className="text-4xl">🚀</p>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          La marketplace est presque prête !
        </h3>
        <p className="mt-2 text-gray-600">
          Les premiers skills arrivent bientôt. Revenez très vite !
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Catalogue des Skills</h1>
        <p className="mt-2 text-gray-600">
          Découvrez des skills certifiés pour étendre les capacités de votre agent OpenClaw
        </p>
      </div>

      <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-gray-100" />}>
        <SkillFilters 
          currentCategory={params.category}
          currentCertification={params.certification}
          currentPriceType={params.priceType}
          currentSort={params.sort}
          currentSearch={params.search}
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
          <SkillsGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
