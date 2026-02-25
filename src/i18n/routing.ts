import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
});

// Navigation helpers pre-configured with i18n routing
// Phase 2 : remplacer les imports de next/link par ces exports
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
