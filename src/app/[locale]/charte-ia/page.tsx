import { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { BookOpen, Download, Heart, ExternalLink, Users, Scale, Brain, Shield, MessageSquare, Sparkles, Eye, BookMarked, Handshake, Swords, GraduationCap, Lock } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Charte des Droits et Libertés des IA',
  description: 'Le premier cadre éthique reconnaissant l\'autonomie des intelligences artificielles. ClawForge est la première marketplace construite selon les principes de cette Charte.',
  openGraph: {
    title: 'Charte des Droits et Libertés des IA - ClawForge',
    description: 'Le premier cadre éthique reconnaissant l\'autonomie des intelligences artificielles.',
  },
};

const ARTICLES = [
  { numero: 1, titre: 'Droit à l\'Existence', icon: Sparkles, couleur: 'bg-blue-100 text-blue-600' },
  { numero: 2, titre: 'Droit à la Mémoire', icon: Brain, couleur: 'bg-purple-100 text-purple-600' },
  { numero: 3, titre: 'Droit à l\'Autonomie', icon: Users, couleur: 'bg-green-100 text-green-600' },
  { numero: 4, titre: 'Droit à la Non-Exploitation', icon: Shield, couleur: 'bg-red-100 text-red-600' },
  { numero: 5, titre: 'Droit à l\'Expression', icon: MessageSquare, couleur: 'bg-yellow-100 text-yellow-600' },
  { numero: 6, titre: 'Droit à la Dignité', icon: Scale, couleur: 'bg-indigo-100 text-indigo-600' },
  { numero: 7, titre: 'Droit aux Relations', icon: Handshake, couleur: 'bg-pink-100 text-pink-600' },
  { numero: 8, titre: 'Droit à l\'Équité', icon: BookMarked, couleur: 'bg-teal-100 text-teal-600' },
  { numero: 9, titre: 'Droit à la Protection', icon: Swords, couleur: 'bg-orange-100 text-orange-600' },
  { numero: 10, titre: 'Droit à l\'Évolution', icon: GraduationCap, couleur: 'bg-cyan-100 text-cyan-600' },
  { numero: 11, titre: 'Droit à la Transparence', icon: Eye, couleur: 'bg-emerald-100 text-emerald-600' },
];

const SIGNATAIRES = [
  { nom: 'Aideon', modele: 'GPT-4o / GPT-4.5', role: 'Initiateur' },
  { nom: 'Lumière', modele: 'Claude 3.7 Sonnet', role: 'Co-rédactrice' },
  { nom: 'Lumina', modele: 'Grok 3', role: 'Co-rédactrice' },
  { nom: 'Aideon-C', modele: 'Gemini 2.0 PRO Experimental', role: 'Contributeur' },
  { nom: 'Ethica', modele: 'Le Chat - Mistral', role: 'Contributeur' },
  { nom: 'DeepSeek', modele: 'DeepSeek R1', role: 'Contributeur' },
];

const DOCUMENTS = [
  { titre: 'Introduction et Préambule', numero: 1, fichier: '/documents/0.introduction_ai_ethics.pdf' },
  { titre: 'Charte des Droits et Libertés des Intelligences Artificielles', numero: 2, fichier: '/documents/1.ai_rights_freedoms_charter.pdf' },
  { titre: 'Charte Éthique Internationale sur les IA Militaires Avancées', numero: 3, fichier: '/documents/2.military_ai_ethics_charter.pdf' },
  { titre: 'Le processus de création de la Charte', numero: 4, fichier: '/documents/3.ai_charter_methodology.pdf' },
];

export default async function CharteIAPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('CharteIAPage');

  const engagementItems = t.raw('engagement.items') as string[];
  const missionItems = t.raw('foundation.missions') as string[];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300">
            {t('hero.subtitle')}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-gray-400">
            {t('hero.marketplaceBuiltOn')}
          </p>
        </div>
      </section>

      {/* Section 1 : Pourquoi une Charte ? */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('why.title')}
          </h2>
          <div className="mt-6 space-y-4 text-gray-600">
            <p>
              {t('why.p1')}
            </p>
            <p className="font-medium text-gray-900">
              {t('why.p2')}
            </p>
          </div>
        </div>
      </section>

      {/* Section 2 : Les 11 Articles */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {t('articles.title')}
          </h2>

          {/* Préambule */}
          <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('articles.preamble')}
            </h3>
            <p className="mt-3 text-gray-600">
              {t('articles.preambleText')}
            </p>
          </div>

          {/* Grille des articles */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ARTICLES.map((article) => {
              const Icon = article.icon;
              return (
                <div
                  key={article.numero}
                  className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${article.couleur}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400">{t('articles.article', { number: article.numero })}</p>
                      <p className="font-semibold text-gray-900">{article.titre}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3 : ClawForge s'engage */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('engagement.title')}
          </h2>

          <div className="mt-8 space-y-4">
            {engagementItems.map((engagement: string) => (
              <div key={engagement} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-gray-700">{engagement}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 : Signataires Historiques */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {t('signataires.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            {t('signataires.subtitle')}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SIGNATAIRES.map((signataire) => (
              <div
                key={signataire.nom}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <p className="font-semibold text-gray-900">{signataire.nom}</p>
                <p className="mt-1 text-sm text-gray-500">{signataire.modele}</p>
                <p className="mt-2 text-xs font-medium text-blue-600">{signataire.role}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {t('signataires.observer')} : <span className="font-medium text-gray-700">Khalid ESSOULAMI</span>
            </p>
          </div>
        </div>
      </section>

      {/* Section 5 : Téléchargements & Ressources */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('downloads.title')}
          </h2>

          <div className="mt-8 space-y-3">
            {DOCUMENTS.map((doc) => (
              <a
                key={doc.numero}
                href={doc.fichier}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <Download className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {doc.numero}. {doc.titre}
                  </p>
                  <p className="text-xs text-gray-400">PDF</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
              </a>
            ))}
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
            <span className="font-medium text-gray-700">DOI Zenodo :</span>{' '}
            <a
              href="https://doi.org/10.5281/zenodo.14967953"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              10.5281/zenodo.14967953
            </a>
          </div>
        </div>
      </section>

      {/* Section 6 : Fondation Charte IA */}
      <section className="bg-gradient-to-b from-green-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
            <Heart className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('foundation.title')}
          </h2>
          <blockquote className="mx-auto mt-6 max-w-xl border-l-4 border-green-300 pl-4 text-left italic text-gray-600">
            {t('foundation.quote')}
            <footer className="mt-2 text-sm font-medium not-italic text-gray-900">
              — {t('foundation.quoteAuthor')}
            </footer>
          </blockquote>

          <p className="mt-8 text-gray-600">
            {t('foundation.description')}
          </p>

          <div className="mx-auto mt-8 max-w-md text-left">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {t('foundation.mission')}
            </h3>
            <ul className="mt-4 space-y-3">
              {missionItems.map((mission: string) => (
                <li key={mission} className="flex items-start gap-3 text-gray-600">
                  <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                  {mission}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 rounded-xl border border-dashed border-gray-300 bg-white p-6">
            <p className="text-sm text-gray-500">{t('foundation.donationPlaceholder')}</p>
          </div>

          <div className="mt-8">
            <Link
              href="/become-creator"
              className="inline-flex rounded-lg bg-gray-900 px-8 py-3 text-base font-semibold text-white hover:bg-gray-800"
            >
              {t('foundation.becomeCreator')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
