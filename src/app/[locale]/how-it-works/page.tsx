import Link from 'next/link';
import { Metadata } from 'next';
import { Search, CreditCard, Download, Zap, UserPlus, Upload, Shield, Wallet } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Comment ça marche - ClawForge',
  description: 'Découvrez comment utiliser ClawForge pour acheter des skills OpenClaw ou devenir créateur et monétiser vos skills.',
};

function StepSection({
  title,
  subtitle,
  steps,
  ctaText,
  ctaHref,
  reversed = false
}: {
  title: string;
  subtitle: string;
  steps: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; color: string }[];
  ctaText: string;
  ctaHref: string;
  reversed?: boolean;
}) {
  return (
    <section className={`py-16 ${reversed ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
          <p className="mt-2 text-gray-600">{subtitle}</p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Step number */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">
                {index + 1}
              </div>

              {/* Icon */}
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${step.color}`}>
                <step.icon className="h-8 w-8" />
              </div>

              {/* Content */}
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('HowItWorksPage');

  const USER_STEPS = [
    {
      icon: Search,
      title: t('users.steps.browse.title'),
      description: t('users.steps.browse.description'),
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: CreditCard,
      title: t('users.steps.buy.title'),
      description: t('users.steps.buy.description'),
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Download,
      title: t('users.steps.install.title'),
      description: t('users.steps.install.description'),
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Zap,
      title: t('users.steps.enjoy.title'),
      description: t('users.steps.enjoy.description'),
      color: 'bg-amber-100 text-amber-600',
    },
  ];

  const CREATOR_STEPS = [
    {
      icon: UserPlus,
      title: t('creators.steps.signup.title'),
      description: t('creators.steps.signup.description'),
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Upload,
      title: t('creators.steps.submit.title'),
      description: t('creators.steps.submit.description'),
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Shield,
      title: t('creators.steps.certify.title'),
      description: t('creators.steps.certify.description'),
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Wallet,
      title: t('creators.steps.earn.title'),
      description: t('creators.steps.earn.description'),
      color: 'bg-amber-100 text-amber-600',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* For Users */}
      <StepSection
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        steps={USER_STEPS}
        ctaText={t('users.cta')}
        ctaHref="/skills"
      />

      {/* For Creators */}
      <StepSection
        title={t('creators.title')}
        subtitle={t('creators.subtitle')}
        steps={CREATOR_STEPS}
        ctaText={t('creators.cta')}
        ctaHref="/become-creator"
        reversed
      />

      {/* Stats/Trust Section */}
      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {t('trust.title')}
            </h2>
            <p className="mt-2 text-gray-400">
              {t('trust.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">100%</div>
              <div className="mt-2 text-gray-400">{t('trust.certified')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">80%</div>
              <div className="mt-2 text-gray-400">{t('trust.creatorShare')}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">24-48h</div>
              <div className="mt-2 text-gray-400">{t('trust.fastCertification')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('finalCta.title')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('finalCta.subtitle')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800"
            >
              {t('finalCta.viewSkills')}
            </Link>
            <Link
              href="/become-creator"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('finalCta.becomeCreator')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
