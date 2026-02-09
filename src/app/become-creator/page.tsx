'use client';



import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Wallet, Shield, Code, Zap, ChevronRight, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const BENEFITS = [
  {
    icon: Wallet,
    title: '80% de revenus',
    description: 'Gardez la majorité de vos ventes. On prend seulement 20% pour couvrir les frais.',
  },
  {
    icon: Shield,
    title: 'Certification reconnue',
    description: 'Vos skills sont audités et certifiés, ce qui rassure les acheteurs.',
  },
  {
    icon: Code,
    title: 'Outils de développement',
    description: 'Accès à notre SDK, documentation complète et support technique.',
  },
  {
    icon: Zap,
    title: 'Distribution mondiale',
    description: 'Touchez tous les utilisateurs OpenClaw sans effort de marketing.',
  },
];

const STEPS = [
  'Créez votre compte ClawForge',
  'Configurez vos paiements avec Stripe',
  'Soumettez votre premier skill',
  'Passez la certification',
  'Commencez à vendre !',
];

export default function BecomeCreatorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStartOnboarding = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login?redirect=/become-creator');
      return;
    }

    try {
      // Call API to create Stripe Connect account and get onboarding URL
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création du compte Stripe');
      }

      // Redirect to Stripe onboarding
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de redirection manquante');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-blue-500/20 px-4 py-1 text-sm font-medium text-blue-300">
            Programme Créateurs
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            Monétisez vos skills OpenClaw
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            Rejoignez ClawForge et transformez votre expertise en revenus. 
            Vous gardez 80% de chaque vente — on s'occupe du reste.
          </p>
          
          <div className="mt-10">
            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                  Chargement...
                </>
              ) : (
                <>
                  Commencer maintenant
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mx-auto mt-4 max-w-md rounded-lg bg-red-500/20 p-4 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Pourquoi devenir créateur ?
          </h2>
          
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{benefit.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Comment ça marche ?
          </h2>
          
          <div className="mt-12">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-start gap-4 pb-8 last:pb-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="flex-1 border-l border-gray-200 pb-8 pl-4 last:border-0 last:pb-0">
                  <p className="text-lg font-medium text-gray-900">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Calculator */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Estimez vos revenus
          </h2>
          <p className="mt-2 text-gray-600">
            Avec notre modèle 80/20, vos gains s'accumulent rapidement
          </p>
          
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">10 ventes à 15€</p>
              <p className="mt-2 text-3xl font-bold text-green-600">120€</p>
              <p className="text-sm text-gray-400">pour vous</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">50 ventes à 15€</p>
              <p className="mt-2 text-3xl font-bold text-green-600">600€</p>
              <p className="text-sm text-gray-400">pour vous</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">100 ventes à 15€</p>
              <p className="mt-2 text-3xl font-bold text-green-600">1 200€</p>
              <p className="text-sm text-gray-400">pour vous</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Questions fréquentes
          </h2>
          
          <div className="mt-8 space-y-6">
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                Quels types de skills puis-je vendre ?
              </h3>
              <p className="mt-2 text-gray-600">
                Tout skill OpenClaw fonctionnel : automatisations, intégrations, outils de productivité, 
                assistants spécialisés... Tant qu'il respecte nos guidelines et passe la certification.
              </p>
            </div>
            
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                Comment fonctionne la certification ?
              </h3>
              <p className="mt-2 text-gray-600">
                Chaque skill soumis passe un audit automatique (sécurité, structure) puis une revue manuelle. 
                Vous recevez un badge Bronze, Silver ou Gold selon la qualité.
              </p>
            </div>
            
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                Quand suis-je payé ?
              </h3>
              <p className="mt-2 text-gray-600">
                Les paiements sont traités via Stripe et virés directement sur votre compte bancaire, 
                généralement sous 7 jours après chaque vente.
              </p>
            </div>
            
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                Puis-je proposer des skills gratuits ?
              </h3>
              <p className="mt-2 text-gray-600">
                Absolument ! Les skills gratuits vous permettent de vous faire connaître et 
                d'attirer des utilisateurs vers vos skills premium.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white">
            Prêt à commencer ?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            L'inscription est gratuite. Vous ne payez que les frais Stripe sur vos ventes.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? 'Chargement...' : 'Créer mon compte créateur'}
            </button>
            <Link
              href="/docs/skill-spec"
              className="rounded-lg border border-white px-8 py-3 font-semibold text-white hover:bg-white/10"
            >
              Lire la documentation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
