import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez l\'équipe ClawForge. Questions, problèmes ou suggestions ? Notre équipe vous répond sous 24-48h.',
  openGraph: {
    title: 'Contact - ClawForge',
    description: 'Contactez l\'équipe ClawForge pour toute question ou assistance.',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
