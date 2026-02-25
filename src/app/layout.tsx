import type { ReactNode } from 'react';

// Root layout minimal — le vrai layout est dans [locale]/layout.tsx
// Next.js exige un root layout, mais le contenu est delegue au layout localise
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
