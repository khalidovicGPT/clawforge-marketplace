import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Devenir Créateur',
  description: 'Rejoignez ClawForge et monétisez vos skills OpenClaw. Gardez 80% de vos revenus, certification incluse.',
  openGraph: {
    title: 'Devenir Créateur - ClawForge',
    description: 'Monétisez vos skills OpenClaw. Programme créateurs avec 80% de commission.',
  },
};

export default function BecomeCreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
