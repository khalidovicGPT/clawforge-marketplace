'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { routing } from '@/i18n/routing';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale = locale === 'fr' ? 'en' : 'fr';
  const label = otherLocale.toUpperCase();

  const handleSwitch = () => {
    router.replace(pathname, { locale: otherLocale });
  };

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      title={otherLocale === 'en' ? 'Switch to English' : 'Passer en français'}
    >
      <Globe className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
