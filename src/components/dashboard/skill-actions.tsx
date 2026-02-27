'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, EyeOff, Eye, Loader2, X, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SkillActionsProps {
  skillId: string;
  skillSlug: string;
  status: string;
  publishedAt: string | null;
  certifiedAt: string | null;
  withdrawnBy?: string | null;
}

export function SkillActions({ skillId, skillSlug, status, publishedAt, certifiedAt, withdrawnBy }: SkillActionsProps) {
  const t = useTranslations('SkillActions');
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const handleAction = async (action: 'withdraw' | 'republish', reason?: string) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || t('error'));
        return;
      }

      setShowWithdrawModal(false);
      setWithdrawReason('');
      router.refresh();
    } catch {
      alert(t('networkError'));
    } finally {
      setLoading(null);
    }
  };

  const canWithdraw = status === 'published';
  const canRepublish = (status === 'withdrawn' && withdrawnBy === 'creator') ||
                       (status === 'draft' && !!publishedAt && !!certifiedAt);
  const canEdit = status === 'published' || status === 'draft' || status === 'rejected';
  const isBlockedByAdmin = status === 'blocked' || (status === 'withdrawn' && withdrawnBy === 'admin');

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Voir le skill publie */}
        {status === 'published' && (
          <Link
            href={`/skills/${skillSlug || skillId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-3.5 w-3.5" />
            {t('view')}
          </Link>
        )}

        {/* Modifier */}
        {canEdit && !isBlockedByAdmin && (
          <Link
            href={`/dashboard/edit-skill/${skillId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('edit')}
          </Link>
        )}

        {/* Retirer (ouvre la modal) */}
        {canWithdraw && (
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
          >
            {loading === 'withdraw' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {t('withdraw')}
          </button>
        )}

        {/* Remettre en ligne */}
        {canRepublish && (
          <button
            onClick={() => handleAction('republish')}
            disabled={!!loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            {loading === 'republish' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {t('republish')}
          </button>
        )}
      </div>

      {/* Modal de confirmation retrait */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('withdrawTitle')}</h3>
              <button
                onClick={() => { setShowWithdrawModal(false); setWithdrawReason(''); }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                {t('withdrawWarning')}
              </p>
              <p className="mt-2 text-sm text-amber-800">
                {t('withdrawNote')}
              </p>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('reasonLabel')}
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('reasonPlaceholder')}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowWithdrawModal(false); setWithdrawReason(''); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleAction('withdraw', withdrawReason || undefined)}
                disabled={!!loading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loading === 'withdraw' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('confirmWithdraw')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
