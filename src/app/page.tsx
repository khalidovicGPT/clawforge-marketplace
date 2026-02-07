import Link from 'next/link';
import { Search, Shield, Zap, Code, Wallet, Star } from 'lucide-react';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES } from '@/types/database';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            Marketplace de Skills pour{' '}
            <span className="text-blue-600">OpenClaw</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Découvrez des skills certifiés et sécurisés pour étendre les capacités 
            de votre agent IA. Si c'est sur ClawForge, ça marche.
          </p>
          
          {/* Search Bar */}
          <div className="mx-auto mt-10 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un skill..."
                className="w-full rounded-full border border-gray-300 bg-white py-4 pl-12 pr-4 text-gray-900 placeholder-gray-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800">
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Catégories populaires
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {Object.entries(SKILL_CATEGORIES).slice(0, 5).map(([key, { label, emoji }]) => (
              <Link
                key={key}
                href={`/skills?category=${key}`}
                className="flex flex-col items-center rounded-xl border bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
              >
                <span className="text-3xl">{emoji}</span>
                <span className="mt-2 text-sm font-medium text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Skills Section */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              ⭐ Skills populaires
            </h2>
            <Link
              href="/skills"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Voir tout →
            </Link>
          </div>
          
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder cards - will be replaced with real data */}
            {[
              { title: 'Email Assistant', category: 'communication', price: 1500, cert: 'silver' as const, rating: 4.8, downloads: 234 },
              { title: 'Cloud Storage', category: 'productivity', price: 0, cert: 'bronze' as const, rating: 4.2, downloads: 567 },
              { title: 'Calendar Sync', category: 'productivity', price: 500, cert: 'gold' as const, rating: 4.9, downloads: 891 },
            ].map((skill, i) => (
              <div
                key={i}
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                      {SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES]?.emoji || '📦'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{skill.title}</h3>
                      <p className="text-sm text-gray-500">
                        {SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES]?.label}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl">
                    {CERTIFICATION_BADGES[skill.cert].emoji}
                  </span>
                </div>
                
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{skill.rating}</span>
                  </div>
                  <span>•</span>
                  <span>{skill.downloads} téléchargements</span>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-semibold text-gray-900">
                    {skill.price === 0 ? 'Gratuit' : `${(skill.price / 100).toFixed(0)}€`}
                  </span>
                  <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                    Voir →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Pourquoi ClawForge ?
          </h2>
          
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Skills Certifiés
              </h3>
              <p className="mt-2 text-gray-600">
                Chaque skill est audité : sécurité, qualité de code, documentation complète.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Wallet className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                80% pour les Créateurs
              </h3>
              <p className="mt-2 text-gray-600">
                Rémunération équitable : les créateurs gardent 80% de chaque vente.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <Zap className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Installation Simple
              </h3>
              <p className="mt-2 text-gray-600">
                Téléchargez, extrayez dans skills/, c'est prêt. OpenClaw détecte automatiquement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white">
            Vous créez des skills OpenClaw ?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Rejoignez ClawForge et monétisez votre expertise. 
            Gardez 80% de vos revenus, on s'occupe du reste.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/become-creator"
              className="rounded-lg bg-white px-8 py-3 text-base font-semibold text-gray-900 hover:bg-gray-100"
            >
              Devenir créateur
            </Link>
            <Link
              href="/docs/skill-spec"
              className="rounded-lg border border-white px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
            >
              Lire la documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
