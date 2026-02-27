'use client';

import { useState } from 'react';
import { RotateCcw, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RefundButtonProps {
  purchaseId: string;
  purchasedAt: string;
  pricePaid: number;
  paymentStatus?: string;
  refundStatus?: 'pending' | 'approved' | 'rejected' | null;
}

const REFUND_WINDOW_DAYS = 15;

export function RefundButton({ purchaseId, purchasedAt, pricePaid, paymentStatus, refundStatus }: RefundButtonProps) {
  const t = useTranslations('RefundButton');
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Pas de remboursement pour les gratuits
  if (!pricePaid || pricePaid === 0) return null;

  // Déjà remboursé
  if (paymentStatus === 'refunded') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <CheckCircle className="h-3 w-3" />
        {t('refunded')}
      </span>
    );
  }

  // Demande de remboursement en cours
  if (refundStatus === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
        <Clock className="h-3 w-3" />
        {t('processing')}
      </span>
    );
  }

  // Vérifier la fenêtre de 15 jours
  const purchased = new Date(purchasedAt);
  const deadline = new Date(purchased.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysLeft === 0) return null;

  const handleSubmit = async () => {
    if (reason.length < 10) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/refunds/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error || t('error') });
      }
    } catch {
      setResult({ success: false, message: t('networkError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
      >
        <RotateCcw className="h-3 w-3" />
        {t('requestRefund', { days: daysLeft })}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">{t('modalTitle')}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {t('modalDescription', { days: daysLeft, amount: (pricePaid / 100).toFixed(2) })}
            </p>

            {result ? (
              <div className={`mt-4 rounded-lg p-4 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.message}
                  </p>
                </div>
                <button
                  onClick={() => { setShowModal(false); setResult(null); setReason(''); }}
                  className="mt-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('placeholder')}
                  className="mt-4 w-full rounded-lg border p-3 text-sm focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  rows={3}
                />
                {reason.length > 0 && reason.length < 10 && (
                  <p className="mt-1 text-xs text-red-500">{t('minChars', { count: reason.length })}</p>
                )}

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => { setShowModal(false); setReason(''); }}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={reason.length < 10 || loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {t('confirm')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
