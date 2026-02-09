import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Gérez vos skills, vos achats et votre compte créateur sur ClawForge.',
  openGraph: {
    title: 'Dashboard - ClawForge',
    description: 'Votre espace personnel sur ClawForge.',
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
