import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Foire aux questions ClawForge. Trouvez des réponses sur l\'installation de skills, les paiements, la certification et plus encore.',
  openGraph: {
    title: 'FAQ - ClawForge',
    description: 'Questions fréquentes sur ClawForge, l\'installation de skills et le programme créateur.',
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
