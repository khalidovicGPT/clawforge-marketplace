'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Shield,
  ShieldCheck,
  Key,
  ListChecks,
  Users,
  XCircle,
  Loader2,
  Settings,
  Flag,
  RotateCcw,
  Banknote,
} from 'lucide-react';

const ADMIN_PAGES = [
  { href: '/admin/skills', key: 'certification', icon: ShieldCheck, color: 'bg-blue-100 text-blue-600' },
  { href: '/admin/validation-queue', key: 'validationQueue', icon: ListChecks, color: 'bg-amber-100 text-amber-600' },
  { href: '/admin/skills-management', key: 'skillsManagement', icon: Settings, color: 'bg-orange-100 text-orange-600' },
  { href: '/admin/users', key: 'users', icon: Users, color: 'bg-green-100 text-green-600' },
  { href: '/admin/agent-keys', key: 'agentKeys', icon: Key, color: 'bg-purple-100 text-purple-600' },
  { href: '/admin/skill-reports', key: 'reports', icon: Flag, color: 'bg-red-100 text-red-600' },
  { href: '/admin/refunds', key: 'refunds', icon: RotateCcw, color: 'bg-rose-100 text-rose-600' },
  { href: '/admin/payouts', key: 'payouts', icon: Banknote, color: 'bg-emerald-100 text-emerald-600' },
];

export default function AdminPage() {
  const t = useTranslations('AdminPage');
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/admin');
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setIsAdmin(profile?.role === 'admin');
    }
    checkAccess();
  }, [router]);

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-red-800">{t('accessDenied')}</h1>
          <p className="mt-2 text-red-600">
            {t('adminOnly')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-1 text-gray-600">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <Link
                key={page.href}
                href={page.href}
                className="group rounded-xl border bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${page.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                  {t(`pages.${page.key}.title`)}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {t(`pages.${page.key}.description`)}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
