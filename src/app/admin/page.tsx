'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from 'lucide-react';

const ADMIN_PAGES = [
  {
    href: '/admin/skills',
    title: 'Certification des Skills',
    description: 'Valider, certifier ou rejeter les skills soumis par les createurs',
    icon: ShieldCheck,
    color: 'bg-blue-100 text-blue-600',
  },
  {
    href: '/admin/validation-queue',
    title: 'File de validation',
    description: 'Suivre la file Silver/Gold et les skills en attente de review',
    icon: ListChecks,
    color: 'bg-amber-100 text-amber-600',
  },
  {
    href: '/admin/skills-management',
    title: 'Gestion des Skills',
    description: 'Retirer, rejeter, bloquer ou reactiver les skills du marketplace',
    icon: Settings,
    color: 'bg-orange-100 text-orange-600',
  },
  {
    href: '/admin/users',
    title: 'Gestion des utilisateurs',
    description: 'Lister, modifier les roles, bloquer ou supprimer des comptes',
    icon: Users,
    color: 'bg-green-100 text-green-600',
  },
  {
    href: '/admin/agent-keys',
    title: 'Cles API Agents',
    description: 'Gerer les cles API pour QualityClaw et les agents automatises',
    icon: Key,
    color: 'bg-purple-100 text-purple-600',
  },
  {
    href: '/admin/skill-reports',
    title: 'Signalements',
    description: 'Gerer les signalements des createurs (faux positifs, bugs, etc.)',
    icon: Flag,
    color: 'bg-red-100 text-red-600',
  },
];

export default function AdminPage() {
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
          <h1 className="mt-4 text-xl font-bold text-red-800">Acces refuse</h1>
          <p className="mt-2 text-red-600">
            Cette page est reservee aux administrateurs.
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
            <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
            <p className="mt-1 text-gray-600">
              Panneau d'administration ClawForge
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
                  {page.title}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  {page.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
