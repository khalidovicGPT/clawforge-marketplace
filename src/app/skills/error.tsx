'use client';

import Link from 'next/link';

export default function SkillsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
        <p className="text-4xl">⚠️</p>
        <h2 className="mt-4 text-xl font-bold text-gray-900">
          Erreur lors du chargement des skills
        </h2>
        <p className="mt-2 text-gray-600">
          {error.message || 'Une erreur inattendue est survenue.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
