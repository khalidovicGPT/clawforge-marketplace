'use client';



import { useState } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { Wallet, Shield, Code, Zap, ChevronRight, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

export default function BecomeCreatorPage() {
  const t = useTranslations('BecomeCreatorPage');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const BENEFITS = [
    {
      icon: Wallet,
      title: t('benefits.revenue.title'),
      description: t('benefits.revenue.description'),
    },
    {
      icon: Shield,
      title: t('benefits.certification.title'),
      description: t('benefits.certification.description'),
    },
    {
      icon: Code,
      title: t('benefits.tools.title'),
      description: t('benefits.tools.description'),
    },
    {
      icon: Zap,
      title: t('benefits.distribution.title'),
      description: t('benefits.distribution.description'),
    },
  ];

  const STEPS = t.raw('steps') as string[];

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

    // Redirect to the creator dashboard (Stripe config is a separate step there)
    router.push('/dashboard/seller');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-block rounded-full bg-blue-500/20 px-4 py-1 text-sm font-medium text-blue-300">
            {t('meta.badge')}
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
            {t('meta.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            {t('meta.subtitle')}
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
                  {t('loading')}
                </>
              ) : (
                <>
                  {t('startNow')}
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
            {t('whyTitle')}
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
            {t('howItWorks')}
          </h2>

          <div className="mt-12">
            {STEPS.map((step, index) => (
              <div key={index} className="flex items-start gap-4 pb-8 last:pb-0">
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
            {t('estimateRevenue')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('estimateSubtitle')}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">10 ventes à 15€</p>
              <p className="mt-2 text-3xl font-bold text-green-600">120€</p>
              <p className="text-sm text-gray-400">{t('forYou')}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">50 ventes à 15€</p>
              <p className="mt-2 text-3xl font-bold text-green-600">600€</p>
              <p className="text-sm text-gray-400">{t('forYou')}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">100 ventes à 15€</p>
              <p className="mt-2 text-3xl font-bold text-green-600">1 200€</p>
              <p className="text-sm text-gray-400">{t('forYou')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {t('faq.title')}
          </h2>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                {t('faq.q1.question')}
              </h3>
              <p className="mt-2 text-gray-600">
                {t('faq.q1.answer')}
              </p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                {t('faq.q2.question')}
              </h3>
              <p className="mt-2 text-gray-600">
                {t('faq.q2.answer')}
              </p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                {t('faq.q3.question')}
              </h3>
              <p className="mt-2 text-gray-600">
                {t('faq.q3.answer')}
              </p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900">
                {t('faq.q4.question')}
              </h3>
              <p className="mt-2 text-gray-600">
                {t('faq.q4.answer')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white">
            {t('ctaTitle')}
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            {t('ctaSubtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              onClick={handleStartOnboarding}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-semibold text-gray-900 hover:bg-gray-100 disabled:opacity-50"
            >
              {loading ? t('loading') : t('createCreatorAccount')}
            </button>
            <Link
              href="/docs/skill-spec"
              className="rounded-lg border border-white px-8 py-3 font-semibold text-white hover:bg-white/10"
            >
              {t('readDocs')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
