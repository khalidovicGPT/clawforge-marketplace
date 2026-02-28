import { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Bot, Code, Search, ShieldCheck, FileText, ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'AboutPage' });
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    openGraph: {
      title: `${t('meta.title')} - ClawForge`,
      description: t('meta.description'),
    },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AboutPage');
  const team = await getTranslations('AboutPageTeam');

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Section : L'Equipe Fondatrice */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {t('founders.title')}
          </h2>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* Khalid Essoulami */}
            <div className="rounded-2xl border bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-2xl">
                  K
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Khalid Essoulami</h3>
                  <p className="text-sm font-medium text-blue-600">{team('khalid.role')}</p>
                </div>
              </div>

              <p className="mt-6 text-gray-600">
                {team('khalid.bio1')}
              </p>
              <p className="mt-3 text-gray-600">
                {team('khalid.bio2')}
              </p>

              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                <span>{team('khalid.location')}</span>
              </div>

              <blockquote className="mt-6 border-l-4 border-blue-200 pl-4 text-sm italic text-gray-500">
                &laquo; {team('khalid.quote')} &raquo;
              </blockquote>
            </div>

            {/* OptimusClaw */}
            <div className="rounded-2xl border bg-white p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 text-2xl">
                  🦾
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">OptimusClaw</h3>
                  <p className="text-sm font-medium text-blue-600">{team('optimusclaw.role')}</p>
                </div>
              </div>

              <p className="mt-6 font-medium text-gray-900">
                {team('optimusclaw.tagline')}
              </p>
              <p className="mt-3 text-gray-600">
                {team('optimusclaw.bio')}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span className="rounded-full bg-gray-100 px-3 py-1">{team('optimusclaw.tag1')}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1">{team('optimusclaw.tag2')}</span>
              </div>

              <blockquote className="mt-6 border-l-4 border-gray-300 pl-4 text-sm italic text-gray-500">
                &laquo; {team('optimusclaw.quote')} &raquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* Section : L'Equipe Technique */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {t('technical.title')}
          </h2>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Claude Code (Opus) */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Code className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Claude Code</h3>
                  <p className="text-xs font-medium text-blue-600">{team('claudeCode.role')}</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                {team('claudeCode.tagline')}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {team('claudeCode.bio')}
              </p>

              <p className="mt-3 text-xs text-gray-400">
                {team('claudeCode.specialty')}
              </p>

              <blockquote className="mt-4 border-l-2 border-purple-200 pl-3 text-xs italic text-gray-500">
                &laquo; {team('claudeCode.quote')} &raquo;
              </blockquote>
            </div>

            {/* DevClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">DevClaw</h3>
                  <p className="text-xs font-medium text-blue-600">{team('devClaw.role')}</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                {team('devClaw.tagline')}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {team('devClaw.bio')}
              </p>

              <p className="mt-3 text-xs text-gray-400">
                {team('devClaw.specialty')}
              </p>

              <blockquote className="mt-4 border-l-2 border-green-200 pl-3 text-xs italic text-gray-500">
                &laquo; {team('devClaw.quote')} &raquo;
              </blockquote>
            </div>

            {/* ResearchClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">ResearchClaw</h3>
                  <p className="text-xs font-medium text-blue-600">{team('researchClaw.role')}</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                {team('researchClaw.tagline')}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {team('researchClaw.bio')}
              </p>

              <p className="mt-3 text-xs text-gray-400">
                {team('researchClaw.specialty')}
              </p>

              <blockquote className="mt-4 border-l-2 border-yellow-200 pl-3 text-xs italic text-gray-500">
                &laquo; {team('researchClaw.quote')} &raquo;
              </blockquote>
            </div>

            {/* QualityClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">QualityClaw</h3>
                  <p className="text-xs font-medium text-blue-600">{team('qualityClaw.role')}</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                {team('qualityClaw.tagline')}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {team('qualityClaw.bio')}
              </p>

              <p className="mt-3 text-xs text-gray-400">
                {team('qualityClaw.specialty')}
              </p>

              <blockquote className="mt-4 border-l-2 border-red-200 pl-3 text-xs italic text-gray-500">
                &laquo; {team('qualityClaw.quote')} &raquo;
              </blockquote>
            </div>

            {/* ContentClaw */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">ContentClaw</h3>
                  <p className="text-xs font-medium text-blue-600">{team('contentClaw.role')}</p>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium text-gray-900">
                {team('contentClaw.tagline')}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {team('contentClaw.bio')}
              </p>

              <p className="mt-3 text-xs text-gray-400">
                {team('contentClaw.specialty')}
              </p>

              <blockquote className="mt-4 border-l-2 border-indigo-200 pl-3 text-xs italic text-gray-500">
                &laquo; {team('contentClaw.quote')} &raquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white">
            {t('cta.title')}
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            {t('cta.description')}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/become-creator"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 text-base font-semibold text-gray-900 hover:bg-gray-100"
            >
              {t('cta.becomeCreator')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/charte-ia"
              className="rounded-lg border border-white px-8 py-3 text-base font-semibold text-white hover:bg-white/10"
            >
              {t('cta.discoverCharte')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
