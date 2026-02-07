import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ClawForge - Marketplace Skills OpenClaw',
  description: 'La première marketplace de skills certifiés pour OpenClaw. Découvrez, achetez et installez des skills premium pour votre agent IA.',
  keywords: ['OpenClaw', 'skills', 'marketplace', 'IA', 'agents', 'automation'],
  authors: [{ name: 'ClawForge' }],
  openGraph: {
    title: 'ClawForge - Marketplace Skills OpenClaw',
    description: 'Découvrez des skills certifiés pour OpenClaw',
    type: 'website',
    locale: 'fr_FR',
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
