'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import {
  Banknote,
  Loader2,
  ArrowLeft,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface PayoutSummary {
  creator_id: string;
  creator_email: string;
  creator_name: string;
  eligible_amount: number;
  eligible_count: number;
  pending_amount: number;
  pending_count: number;
}

interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  platform_fee: number;
  gross_amount: number;
  purchases_count: number;
  period_start: string;
  period_end: string;
  status: string;
  stripe_transfer_id: string | null;
  error_message: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'statusPending', color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: 'statusProcessing', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'statusCompleted', color: 'bg-green-100 text-green-800' },
  failed: { label: 'statusFailed', color: 'bg-red-100 text-red-800' },
};

export default function AdminPayoutsPage() {
  const router = useRouter();
  const t = useTranslations('AdminPayouts');
  const tc = useTranslations('Common');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary[]>([]);
  const [triggerLoading, setTriggerLoading] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?redirect=/admin/payouts'); return; }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'admin');
    }
    checkAccess();
  }, [router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // Récupérer les payouts récents
      const { data: payoutsData } = await supabase
        .from('creator_payouts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setPayouts(payoutsData || []);

      // Récupérer le résumé des ventes éligibles par créateur
      const { data: eligiblePurchases } = await supabase
        .from('purchases')
        .select(`
          skill_id, price_paid, payment_status,
          skill:skills!purchases_skill_id_fkey(creator_id)
        `)
        .in('payment_status', ['eligible', 'pending'])
        .gt('price_paid', 0);

      // Grouper par créateur
      const creatorMap = new Map<string, PayoutSummary>();
      for (const p of (eligiblePurchases || [])) {
        const creatorId = (p.skill as unknown as { creator_id: string })?.creator_id;
        if (!creatorId) continue;
        const existing = creatorMap.get(creatorId) || {
          creator_id: creatorId,
          creator_email: '',
          creator_name: '',
          eligible_amount: 0,
          eligible_count: 0,
          pending_amount: 0,
          pending_count: 0,
        };
        const creatorAmt = Math.round((p.price_paid || 0) * 0.8);
        if (p.payment_status === 'eligible') {
          existing.eligible_amount += creatorAmt;
          existing.eligible_count++;
        } else {
          existing.pending_amount += creatorAmt;
          existing.pending_count++;
        }
        creatorMap.set(creatorId, existing);
      }

      // Enrichir avec les infos créateur
      const creatorIds = Array.from(creatorMap.keys());
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('users')
          .select('id, email, name')
          .in('id', creatorIds);
        for (const c of (creators || [])) {
          const entry = creatorMap.get(c.id);
          if (entry) {
            entry.creator_email = c.email;
            entry.creator_name = c.name || c.email.split('@')[0];
          }
        }
      }

      setSummary(Array.from(creatorMap.values()).sort((a, b) => b.eligible_amount - a.eligible_amount));
    } catch (err) {
      console.error('Fetch payouts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleTriggerPayout = async () => {
    if (!confirm(t('confirmTrigger'))) return;
    setTriggerLoading(true);
    try {
      const res = await fetch('/api/admin/trigger-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        alert(t('payoutSuccess', { completed: data.summary?.completed || 0, failed: data.summary?.failed || 0 }));
        fetchData();
      } else {
        alert(data.error || tc('error'));
      }
    } catch {
      alert(tc('networkError'));
    } finally {
      setTriggerLoading(false);
    }
  };

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
        </div>
      </div>
    );
  }

  const totalEligible = summary.reduce((sum, s) => sum + s.eligible_amount, 0);
  const totalPending = summary.reduce((sum, s) => sum + s.pending_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> {t('backAdmin')}
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Banknote className="h-8 w-8 text-emerald-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
              <p className="mt-1 text-gray-600">{t('subtitle')}</p>
            </div>
          </div>
          <button
            onClick={handleTriggerPayout}
            disabled={triggerLoading || totalEligible === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {triggerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {t('triggerPayout')}
          </button>
        </div>

        {/* Résumé */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              <p className="text-sm font-medium">{t('pendingLabel')}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{(totalPending / 100).toFixed(2)} EUR</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-blue-600">
              <CheckCircle className="h-5 w-5" />
              <p className="text-sm font-medium">{t('eligibleLabel')}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{(totalEligible / 100).toFixed(2)} EUR</p>
          </div>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Banknote className="h-5 w-5" />
              <p className="text-sm font-medium">{t('creatorsLabel')}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{summary.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Créateurs avec ventes éligibles */}
            {summary.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-lg font-bold text-gray-900">{t('eligibleByCreator')}</h2>
                <div className="rounded-xl border bg-white shadow-sm">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">{t('colCreator')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">{t('colEligible')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">{t('colPending')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">{t('colSales')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summary.map((s) => (
                        <tr key={s.creator_id}>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{s.creator_name}</p>
                            <p className="text-xs text-gray-500">{s.creator_email}</p>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-blue-700">
                            {(s.eligible_amount / 100).toFixed(2)} EUR
                          </td>
                          <td className="px-6 py-4 text-right text-amber-700">
                            {(s.pending_amount / 100).toFixed(2)} EUR
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {s.eligible_count + s.pending_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Historique des payouts */}
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t('payoutHistory')}</h2>
            {payouts.length === 0 ? (
              <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
                <Banknote className="mx-auto h-12 w-12 text-gray-300" />
                <p className="mt-4 text-gray-500">{t('noPayouts')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((p) => {
                  const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={p.id} className="rounded-xl border bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {(p.amount / 100).toFixed(2)} EUR
                            <span className="ml-2 text-sm text-gray-500">
                              ({t('gross')}: {(p.gross_amount / 100).toFixed(2)} EUR, {t('commission')}: {(p.platform_fee / 100).toFixed(2)} EUR)
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {t('period')}: {p.period_start} {t('periodTo')} {p.period_end} — {p.purchases_count} {t('salesCount')}
                          </p>
                          {p.stripe_transfer_id && (
                            <p className="mt-1 text-xs text-gray-400">Transfer: {p.stripe_transfer_id}</p>
                          )}
                          {p.error_message && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              {p.error_message}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusConf.color}`}>
                            {t(statusConf.label)}
                          </span>
                          {p.paid_at && (
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(p.paid_at).toLocaleDateString(undefined)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
