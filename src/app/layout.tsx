import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const inter = localFont({
  src: [
    { path: './fonts/inter.woff2', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ClawForge - Marketplace Skills OpenClaw',
    template: '%s | ClawForge',
  },
  description: 'La première marketplace de skills certifiés pour OpenClaw. Découvrez, achetez et installez des skills premium pour votre agent IA.',
  keywords: ['OpenClaw', 'skills', 'marketplace', 'IA', 'agents', 'automation', 'intelligence artificielle'],
  authors: [{ name: 'ClawForge' }, { name: 'ESK CONSEIL' }],
  creator: 'ClawForge',
  publisher: 'ESK CONSEIL',
  metadataBase: new URL('https://clawforge.com'),
  openGraph: {
    title: 'ClawForge - Marketplace Skills OpenClaw',
    description: 'La première marketplace de skills certifiés pour OpenClaw. Découvrez des skills premium pour étendre votre agent IA.',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
