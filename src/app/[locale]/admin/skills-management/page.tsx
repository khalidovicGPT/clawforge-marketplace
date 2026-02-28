'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/routing';
import {
  Shield,
  Loader2,
  XCircle,
  Search,
  Eye,
  EyeOff,
  Ban,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';

// Types locaux pour la page
interface SkillRow {
  id: string;
  title: string;
  slug: string;
  version: string;
  status: string;
  certification: string;
  created_at: string;
  withdrawn_by: string | null;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
  blocked_at: string | null;
  blocked_reason: string | null;
  blocked_permanently: boolean;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_feedback: string | null;
  is_visible: boolean;
  sales_count: number;
  creator: { id: string; name: string | null; email: string; avatar_url: string | null } | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  action_at: string;
  reason: string | null;
  previous_status: string;
  new_status: string;
  admin: { name: string | null; email: string } | null;
}

type ModalType = 'withdraw' | 'reject' | 'block' | 'reactivate' | 'history' | null;

export default function SkillsManagementPage() {
  const router = useRouter();
  const t = useTranslations('AdminSkillsManagement');
  const tc = useTranslations('Common');

  const STATUS_BADGES: Record<string, { label: string; color: string }> = {
    published: { label: t('statusPublished'), color: 'bg-green-100 text-green-700' },
    pending: { label: t('statusPending'), color: 'bg-yellow-100 text-yellow-700' },
    rejected: { label: t('statusRejected'), color: 'bg-red-100 text-red-700' },
    withdrawn: { label: t('statusWithdrawn'), color: 'bg-gray-100 text-gray-600' },
    blocked: { label: t('statusBlocked'), color: 'bg-red-200 text-red-800' },
    draft: { label: t('statusDraft'), color: 'bg-gray-100 text-gray-500' },
    certified: { label: t('statusCertified'), color: 'bg-blue-100 text-blue-700' },
    pending_payment_setup: { label: t('statusPendingPayment'), color: 'bg-amber-100 text-amber-700' },
  };

  const CERT_BADGES: Record<string, { label: string; emoji: string }> = {
    none: { label: t('certNone'), emoji: '' },
    bronze: { label: t('certBronze'), emoji: '🥉' },
    silver: { label: t('certSilver'), emoji: '🥈' },
    gold: { label: t('certGold'), emoji: '🥇' },
  };

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtres
  const [statusFilter, setStatusFilter] = useState('all');
  const [certFilter, setCertFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillRow | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalFeedback, setModalFeedback] = useState('');
  const [modalPermanent, setModalPermanent] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Auth check
  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/admin/skills-management');
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

  // Fetch skills
  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusFilter,
        certification: certFilter,
      });

      const res = await fetch(`/api/admin/skills-management?${params}`);
      if (!res.ok) throw new Error(t('errorPrefix'));

      const data = await res.json();
      setSkills(data.skills || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setToast({ type: 'error', message: t('errorPrefix') });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, certFilter, t]);

  useEffect(() => {
    if (isAdmin) fetchSkills();
  }, [isAdmin, fetchSkills]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Actions
  const openModal = (type: ModalType, skill: SkillRow) => {
    setSelectedSkill(skill);
    setModalType(type);
    setModalReason('');
    setModalFeedback('');
    setModalPermanent(false);
    setHistory([]);

    if (type === 'history') {
      fetchHistory(skill.id);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedSkill(null);
    setModalLoading(false);
  };

  const fetchHistory = async (skillId: string) => {
    try {
      const res = await fetch(`/api/admin/skills/${skillId}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch {
      // ignore
    }
  };

  const handleAction = async () => {
    if (!selectedSkill || !modalType) return;
    setModalLoading(true);

    try {
      let endpoint = '';
      let bodyData: Record<string, unknown> = {};

      switch (modalType) {
        case 'withdraw':
          endpoint = `/api/admin/skills/${selectedSkill.id}/withdraw`;
          bodyData = { reason: modalReason };
          break;
        case 'reject':
          endpoint = `/api/admin/skills/${selectedSkill.id}/reject`;
          bodyData = { reason: modalReason, feedback: modalFeedback };
          break;
        case 'block':
          endpoint = `/api/admin/skills/${selectedSkill.id}/block`;
          bodyData = { reason: modalReason, permanent: modalPermanent };
          break;
        case 'reactivate':
          endpoint = `/api/admin/skills/${selectedSkill.id}/reactivate`;
          bodyData = { note: modalReason };
          break;
        default:
          return;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ type: 'error', message: data.error || tc('error') });
        return;
      }

      setToast({ type: 'success', message: data.message || t('actionSuccess') });
      closeModal();
      fetchSkills();
    } catch {
      setToast({ type: 'error', message: tc('networkError') });
    } finally {
      setModalLoading(false);
    }
  };

  // Filtrage local par recherche (nom skill ou email createur)
  const filteredSkills = searchQuery.trim()
    ? skills.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.creator?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.creator?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : skills;

  // --- RENDER ---

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
          <h1 className="mt-4 text-xl font-bold text-red-800">{tc('accessDenied')}</h1>
          <p className="mt-2 text-sm text-red-600">{tc('adminOnly')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-1 text-gray-600">{t('subtitle', { count: total })}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">{t('allStatuses')}</option>
            <option value="published">{t('statusPublished')}</option>
            <option value="pending">{t('statusPending')}</option>
            <option value="rejected">{t('statusRejected')}</option>
            <option value="withdrawn">{t('statusWithdrawn')}</option>
            <option value="blocked">{t('statusBlocked')}</option>
            <option value="draft">{t('statusDraft')}</option>
          </select>

          <select
            value={certFilter}
            onChange={(e) => { setCertFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="all">{t('allCertifications')}</option>
            <option value="none">{t('certNone')}</option>
            <option value="bronze">{t('certBronze')}</option>
            <option value="silver">{t('certSilver')}</option>
            <option value="gold">{t('certGold')}</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="p-12 text-center text-gray-500">{t('noSkillsFound')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colSkill')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colCreator')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colStatus')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colCertification')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colDate')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colSales')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{t('colActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredSkills.map((skill) => {
                    const statusBadge = STATUS_BADGES[skill.status] || STATUS_BADGES.draft;
                    const certBadge = CERT_BADGES[skill.certification] || CERT_BADGES.none;

                    return (
                      <tr key={skill.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{skill.title}</div>
                          <div className="text-xs text-gray-500">v{skill.version}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{skill.creator?.name || '—'}</div>
                          <div className="text-xs text-gray-500">{skill.creator?.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.label}
                          </span>
                          {skill.withdrawn_by === 'admin' && skill.status === 'withdrawn' && (
                            <span className="ml-1 text-xs text-gray-400">({t('withdrawnByAdmin')})</span>
                          )}
                          {skill.withdrawn_by === 'creator' && skill.status === 'withdrawn' && (
                            <span className="ml-1 text-xs text-gray-400">({t('withdrawnByCreator')})</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {certBadge.emoji} {certBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(skill.created_at).toLocaleDateString(undefined)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {skill.sales_count}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* Voir */}
                            {skill.slug && (
                              <a
                                href={`/skills/${skill.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                title={t('viewPage')}
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                            )}

                            {/* Retirer (si publie ou certifie) */}
                            {['published', 'certified', 'pending'].includes(skill.status) && (
                              <button
                                onClick={() => openModal('withdraw', skill)}
                                className="rounded p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                                title={t('withdrawSkill')}
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            )}

                            {/* Rejeter (si en attente) */}
                            {['pending', 'certified'].includes(skill.status) && (
                              <button
                                onClick={() => openModal('reject', skill)}
                                className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                                title={t('rejectSkill')}
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}

                            {/* Bloquer (tout sauf deja bloque) */}
                            {skill.status !== 'blocked' && (
                              <button
                                onClick={() => openModal('block', skill)}
                                className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                                title={t('blockSkill')}
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}

                            {/* Reactiver (si retire/rejete/bloque) */}
                            {['withdrawn', 'rejected', 'blocked'].includes(skill.status) && (
                              <button
                                onClick={() => openModal('reactivate', skill)}
                                className="rounded p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700"
                                title={t('reactivateSkill')}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}

                            {/* Historique */}
                            <button
                              onClick={() => openModal('history', skill)}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title={t('historyTitle')}
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-sm text-gray-500">
                {t('pageOf', { page, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======= MODALS ======= */}
      {modalType && selectedSkill && modalType !== 'history' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {modalType === 'withdraw' && t('modalWithdrawTitle')}
                {modalType === 'reject' && t('modalRejectTitle')}
                {modalType === 'block' && t('modalBlockTitle')}
                {modalType === 'reactivate' && t('modalReactivateTitle')}
              </h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">{selectedSkill.title}</p>
              <p className="text-xs text-gray-500">{selectedSkill.creator?.email}</p>
            </div>

            {/* Avertissement blocage */}
            {modalType === 'block' && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">{t('blockWarningTitle')}</p>
                  <p className="text-xs text-red-600">
                    {t('blockWarningDescription')}
                  </p>
                </div>
              </div>
            )}

            {/* Champ raison */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {modalType === 'reactivate' ? t('labelNoteOptional') : t('labelReasonRequired')}
              </label>
              <textarea
                value={modalReason}
                onChange={(e) => setModalReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={
                  modalType === 'withdraw' ? t('placeholderWithdraw') :
                  modalType === 'reject' ? t('placeholderReject') :
                  modalType === 'block' ? t('placeholderBlock') :
                  t('placeholderReactivate')
                }
              />
            </div>

            {/* Champ feedback (rejet uniquement) */}
            {modalType === 'reject' && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('labelFeedback')}
                </label>
                <textarea
                  value={modalFeedback}
                  onChange={(e) => setModalFeedback(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder={t('placeholderFeedback')}
                />
              </div>
            )}

            {/* Checkbox permanent (blocage uniquement) */}
            {modalType === 'block' && (
              <label className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={modalPermanent}
                  onChange={(e) => setModalPermanent(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{t('permanentBlock')}</span>
              </label>
            )}

            {/* Notification email */}
            {modalType !== 'reactivate' && (
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-500">
                <span>{t('emailNotification')}</span>
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAction}
                disabled={modalLoading || (modalType !== 'reactivate' && !modalReason.trim())}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  modalType === 'block' ? 'bg-red-600 hover:bg-red-700' :
                  modalType === 'reactivate' ? 'bg-green-600 hover:bg-green-700' :
                  modalType === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {modalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  modalType === 'withdraw' ? t('confirmWithdraw') :
                  modalType === 'reject' ? t('confirmReject') :
                  modalType === 'block' ? t('confirmBlock') :
                  t('confirmReactivate')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historique */}
      {modalType === 'history' && selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {t('historyTitle')} — {selectedSkill.title}
              </h2>
              <button onClick={closeModal} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {history.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{t('noHistory')}</p>
            ) : (
              <div className="max-h-96 divide-y overflow-y-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.action_at).toLocaleDateString(undefined, {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {entry.previous_status} → {entry.new_status}
                      {entry.admin && ` • ${t('byAdmin', { name: entry.admin.name || entry.admin.email })}`}
                    </div>
                    {entry.reason && (
                      <p className="mt-1 text-xs text-gray-600 italic">{entry.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
