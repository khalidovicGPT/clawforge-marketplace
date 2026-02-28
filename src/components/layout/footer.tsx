'use client';

import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');

  return (
    <footer className="border-t bg-gray-50">
      {/* Bandeau Charte IA */}
      <div className="border-b bg-gray-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 text-white">
            <span className="text-lg">📜</span>
            <p className="text-sm">
              <span className="font-semibold">{t('ethicalMarketplace')}</span>
              {' — '}
              {t('ethicalBanner')}
            </p>
          </div>
          <Link
            href="/charte-ia"
            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
          >
            {t('discoverCharte')}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* ClawForge */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🦾</span>
              <span className="text-lg font-bold text-gray-900">ClawForge</span>
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              {t('description')}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {t('builtAccordingTo')}{' '}
              <Link
                href="/charte-ia"
                className="underline hover:text-gray-700"
              >
                {t('charteDesIA')}
              </Link>
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('marketplace')}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/skills" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('catalog')}
                </Link>
              </li>
              <li>
                <Link href="/skills?sort=popular" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('popular')}
                </Link>
              </li>
              <li>
                <Link href="/skills?priceType=free" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('free')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Créateurs */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('creators')}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/become-creator" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('becomeCreator')}
                </Link>
              </li>
              <li>
                <Link href="/docs/skill-spec" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('documentation')}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/new-skill" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('submitSkill')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('support')}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('whoAreWe')}
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('faq')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('legal')}</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/legal/terms" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('cgv')}
                </Link>
              </li>
              <li>
                <Link href="/legal/cgu" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('cgu')}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link href="/charte-ia" className="text-sm text-gray-600 hover:text-gray-900">
                  {t('charteIA')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <p className="text-xs text-gray-400">
            {t('pricingPolicy')}
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between border-t pt-8 md:flex-row">
          <p className="text-sm text-gray-500">
            {t('allRightsReserved', { year: new Date().getFullYear() })}
          </p>
          <div className="mt-4 flex items-center gap-4 md:mt-0">
            <a
              href="https://github.com/clawforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/clawforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              Discord
            </a>
            <a
              href="https://twitter.com/clawforge"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-700"
            >
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
