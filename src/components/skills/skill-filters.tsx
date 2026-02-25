'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES } from '@/types/database';
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface SkillFiltersProps {
  currentCategory?: string;
  currentCertification?: string;
  currentPriceType?: string;
  currentSort?: string;
  currentSearch?: string;
}

export function SkillFilters({
  currentCategory,
  currentCertification,
  currentPriceType,
  currentSort,
  currentSearch,
}: SkillFiltersProps) {
  const t = useTranslations('SkillFilters');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch || '');

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset to page 1 on filter change
    router.push(`/skills?${params.toString()}`);
  }, [router, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchValue);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => {
              setSearchValue('');
              updateFilter('search', '');
            }}
            className="absolute right-14 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          {t('search')}
        </button>
      </form>

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category Filter */}
        <select
          value={currentCategory || 'all'}
          onChange={(e) => updateFilter('category', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('allCategories')}</option>
          {Object.entries(SKILL_CATEGORIES).map(([key, { label, emoji }]) => (
            <option key={key} value={key}>
              {emoji} {label}
            </option>
          ))}
        </select>

        {/* Certification Filter */}
        <select
          value={currentCertification || 'all'}
          onChange={(e) => updateFilter('certification', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('allCertifications')}</option>
          {Object.entries(CERTIFICATION_BADGES)
            .filter(([key]) => key !== 'none')
            .map(([key, { label, emoji }]) => (
              <option key={key} value={key}>
                {emoji} {label}
              </option>
            ))}
        </select>

        {/* Price Type Filter */}
        <select
          value={currentPriceType || 'all'}
          onChange={(e) => updateFilter('priceType', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('allPrices')}</option>
          <option value="free">{t('free')}</option>
          <option value="one_time">{t('paid')}</option>
        </select>

        {/* Sort */}
        <select
          value={currentSort || 'newest'}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">{t('newest')}</option>
          <option value="popular">{t('popular')}</option>
          <option value="rating">{t('bestRated')}</option>
          <option value="price_asc">{t('priceAsc')}</option>
          <option value="price_desc">{t('priceDesc')}</option>
        </select>

        {/* Active Filters Count */}
        {(currentCategory || currentCertification || currentPriceType || currentSearch) && (
          <button
            onClick={() => router.push('/skills')}
            className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 hover:bg-gray-200"
          >
            {t('resetFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
