'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { CertifyModal } from '@/components/admin/CertifyModal';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  RefreshCw,
  FileText,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Loader2,
} from 'lucide-react';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES } from '@/types/database';

interface SkillWithCreatorAndTest {
  id: string;
  title: string;
  slug: string;
  description_short: string;
  description_long: string | null;
  category: string;
  price: number | null;
  price_type: string;
  status: string;
  certification: string;
  creator_id: string;
  file_url: string | null;
  file_size: number | null;
  download_count: number;
  version: string;
  created_at: string;
  submitted_at: string | null;
  certified_at: string | null;
  rejection_reason: string | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  test: {
    virustotal_result: string | null;
    lint_passed: boolean;
    structure_valid: boolean;
    recommended_certification: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: 'En attente', icon: Clock, color: 'text-amber-600 bg-amber-100' },
  approved: { label: 'Approuve', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  published: { label: 'Publie', icon: CheckCircle, color: 'text-blue-600 bg-blue-100' },
  rejected: { label: 'Rejete', icon: XCircle, color: 'text-red-600 bg-red-100' },
  draft: { label: 'Brouillon', icon: FileText, color: 'text-gray-600 bg-gray-100' },
};

const VT_CONFIG: Record<string, { label: string; icon: typeof ShieldCheck; color: string }> = {
  clean: { label: 'Clean', icon: ShieldCheck, color: 'text-green-600' },
  suspicious: { label: 'Suspect', icon: ShieldAlert, color: 'text-amber-600' },
  malicious: { label: 'Malveillant', icon: ShieldAlert, color: 'text-red-600' },
  pending: { label: 'En cours', icon: ShieldQuestion, color: 'text-gray-500' },
};

export default function AdminSkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillWithCreatorAndTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [certifySkill, setCertifySkill] = useState<SkillWithCreatorAndTest | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check admin access
  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/admin/skills');
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);
    }
    checkAccess();
  }, [router]);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/skills?status=${statusFilter}`);
      if (!res.ok) {
        if (res.status === 403) {
          setIsAdmin(false);
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.details || err.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setSkills(data.skills || []);
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) fetchSkills();
  }, [isAdmin, fetchSkills]);

  const handleCertify = async (skillId: string, certification: string, comment?: string) => {
    const res = await fetch(`/api/admin/skills/${skillId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certification, comment }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.details
        ? `${data.error} : ${data.details}`
        : data.error || 'Erreur lors de la certification';
      showToast(msg, 'error');
      throw new Error(msg);
    }

    showToast(data.message || 'Skill certifie !', 'success');
    fetchSkills();
  };

  // Access denied
  if (isAdmin === false) {
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

  // Loading admin check
  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const pendingCount = skills.filter(s => s.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Certification des Skills</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Gerez la certification et la qualite des skills soumis
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                En attente
                {pendingCount > 0 && statusFilter === 'all' && (
                  <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === 'all'
                    ? 'bg-gray-200 text-gray-800'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tous
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchSkills}
              disabled={loading}
              className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
              title="Rafraichir"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {(['pending', 'approved', 'published', 'rejected'] as const).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = skills.filter(s => s.status === status).length;
            const Icon = config.icon;
            return (
              <div key={status} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{config.label}</p>
                    <p className="text-xl font-bold text-gray-900">{count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Skills Table */}
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : skills.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {statusFilter === 'pending' ? 'Aucun skill en attente' : 'Aucun skill'}
            </h3>
            <p className="mt-2 text-gray-500">
              {statusFilter === 'pending'
                ? 'Tous les skills ont ete traites !'
                : 'Aucun skill ne correspond au filtre.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            {/* Table Header */}
            <div className="hidden border-b bg-gray-50 px-6 py-3 md:grid md:grid-cols-12 md:gap-4">
              <div className="col-span-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Skill
              </div>
              <div className="col-span-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Createur
              </div>
              <div className="col-span-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Prix
              </div>
              <div className="col-span-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Securite
              </div>
              <div className="col-span-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Statut
              </div>
              <div className="col-span-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </div>
              <div className="col-span-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y">
              {skills.map((skill) => {
                const category = SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES];
                const cert = CERTIFICATION_BADGES[skill.certification as keyof typeof CERTIFICATION_BADGES] || CERTIFICATION_BADGES.none;
                const statusConf = STATUS_CONFIG[skill.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConf.icon;
                const vtResult = skill.test?.virustotal_result;
                const vtConf = vtResult ? VT_CONFIG[vtResult] : null;
                const VtIcon = vtConf?.icon || ShieldQuestion;

                return (
                  <div
                    key={skill.id}
                    className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-12 md:items-center"
                  >
                    {/* Skill info */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl">
                        {category?.emoji || '📦'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-gray-900">{skill.title}</p>
                          <span title={cert.label}>{cert.emoji}</span>
                        </div>
                        <p className="truncate text-sm text-gray-500">
                          {category?.label || skill.category} &middot; v{skill.version}
                        </p>
                        {skill.status === 'rejected' && skill.rejection_reason && (
                          <p className="mt-1 truncate text-xs text-red-600" title={skill.rejection_reason}>
                            Motif : {skill.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Creator */}
                    <div className="col-span-2 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {skill.creator?.name || 'Inconnu'}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {skill.creator?.email || ''}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="col-span-1">
                      <span className={`text-sm font-semibold ${skill.price === 0 || !skill.price ? 'text-green-600' : 'text-gray-900'}`}>
                        {!skill.price || skill.price === 0
                          ? 'Gratuit'
                          : `${(skill.price / 100).toFixed(0)}€`}
                      </span>
                    </div>

                    {/* VirusTotal */}
                    <div className="col-span-1">
                      {vtConf ? (
                        <div className={`flex items-center gap-1 ${vtConf.color}`}>
                          <VtIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">{vtConf.label}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConf.color}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConf.label}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-1">
                      <p className="text-xs text-gray-500">
                        {new Date(skill.submitted_at || skill.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {skill.file_url && (
                        <a
                          href={skill.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          title="Telecharger le ZIP"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      {skill.slug && (
                        <a
                          href={`/skills/${skill.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                          title="Voir la page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => setCertifySkill(skill)}
                        className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Certifier
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Certify Modal */}
      {certifySkill && (
        <CertifyModal
          skill={certifySkill}
          onClose={() => setCertifySkill(null)}
          onCertify={handleCertify}
        />
      )}
    </div>
  );
}
