'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('NotFoundPage');

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="text-center">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-7xl">🦾</span>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-gray-200">404</h1>

        {/* Message */}
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          {t('title')}
        </h2>
        <p className="mt-2 text-gray-600">
          {t('description')}
        </p>

        {/* Suggestions */}
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
          >
            <Home className="h-5 w-5" />
            {t('backHome')}
          </Link>
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            <Search className="h-5 w-5" />
            {t('exploreCatalog')}
          </Link>
        </div>

        {/* Back link */}
        <button
          onClick={() => typeof window !== 'undefined' && window.history.back()}
          className="mt-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('goBack')}
        </button>
      </div>
    </div>
  );
}
