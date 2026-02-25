import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const inter = localFont({
  src: [{ path: '../fonts/inter.woff2', style: 'normal' }],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ClawForge - Marketplace Skills OpenClaw',
    template: '%s | ClawForge',
  },
  description:
    'La première marketplace de skills certifiés pour OpenClaw. Découvrez, achetez et installez des skills premium pour votre agent IA.',
  keywords: [
    'OpenClaw',
    'skills',
    'marketplace',
    'IA',
    'agents',
    'automation',
    'intelligence artificielle',
  ],
  authors: [{ name: 'ClawForge' }, { name: 'ESK CONSEIL' }],
  creator: 'ClawForge',
  publisher: 'ESK CONSEIL',
  metadataBase: new URL('https://clawforge.io'),
  openGraph: {
    title: 'ClawForge - Marketplace Skills OpenClaw',
    description:
      'La première marketplace de skills certifiés pour OpenClaw. Découvrez des skills premium pour étendre votre agent IA.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'ClawForge',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ClawForge - Marketplace Skills OpenClaw',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClawForge - Marketplace Skills OpenClaw',
    description: 'Découvrez des skills certifiés pour OpenClaw',
    images: ['/og-image.png'],
    creator: '@clawforge',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <NextIntlClientProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
