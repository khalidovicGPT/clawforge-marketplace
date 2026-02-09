import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à ClawForge pour accéder à votre dashboard et gérer vos skills.',
  openGraph: {
    title: 'Connexion - ClawForge',
    description: 'Accédez à votre compte ClawForge.',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
