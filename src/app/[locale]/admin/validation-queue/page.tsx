'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Award,
  Star,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from 'lucide-react';

interface SilverQueueItem {
  skill_id: string;
  name: string;
  slug: string;
  version: string;
  silver_score: number | null;
  criteria: Record<string, number> | null;
  submitted_at: string;
}

interface GoldEligibleItem {
  skill_id: string;
  name: string;
  sales: number;
  rating: number;
  rating_count: number;
}

interface RejectedItem {
  skill_id: string;
  name: string;
  reason: string;
  rejected_at: string;
}

interface QueueData {
  silver_queue: SilverQueueItem[];
  gold_eligible: GoldEligibleItem[];
  rejected: RejectedItem[];
}

type CertifyAction = 'approve' | 'reject';

export default function ValidationQueuePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QueueData>({ silver_queue: [], gold_eligible: [], rejected: [] });
  const [expandedSection, setExpandedSection] = useState<'silver' | 'gold' | 'rejected' | null>('silver');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Action states
  const [actionSkillId, setActionSkillId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<CertifyAction | null>(null);
  const [actionLevel, setActionLevel] = useState<'silver' | 'gold'>('silver');
  const [actionNotes, setActionNotes] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        router.push('/login?redirect=/admin/validation-queue');
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

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/skills/pending-review');
      if (!res.ok) {
        if (res.status === 403) {
          setIsAdmin(false);
          return;
        }
        throw new Error(`Erreur ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchQueue();
  }, [isAdmin, fetchQueue]);

  const handleCertify = async (skillId: string, action: CertifyAction, level?: 'silver' | 'gold', notes?: string, reason?: string) => {
    setSubmitting(true);
    try {
      const body = action === 'approve'
        ? { action: 'approve', level, notes }
        : { action: 'reject', reason };

      const res = await fetch(`/api/skills/${skillId}/certify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Erreur ${res.status}`);
      }

      showToast(json.message || (action === 'approve' ? 'Skill certifie !' : 'Skill rejete.'), 'success');
      setActionSkillId(null);
      setActionType(null);
      setActionNotes('');
      setActionReason('');
      fetchQueue();
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSection = (section: 'silver' | 'gold' | 'rejected') => {
    setExpandedSection(prev => prev === section ? null : section);
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

  // Loading
  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const silverCount = data.silver_queue.length;
  const goldCount = data.gold_eligible.length;
  const rejectedCount = data.rejected.length;

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
              <h1 className="text-3xl font-bold text-gray-900">File de Validation</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Pipeline de certification Bronze / Silver / Gold
            </p>
          </div>

          <button
            onClick={fetchQueue}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Rafraichir
          </button>
        </div>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div
            className={`cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm transition ${
              expandedSection === 'silver' ? 'border-slate-400' : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => toggleSection('silver')}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En attente Silver</p>
                <p className="text-xl font-bold text-gray-900">{silverCount}</p>
              </div>
            </div>
          </div>

          <div
            className={`cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm transition ${
              expandedSection === 'gold' ? 'border-yellow-400' : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => toggleSection('gold')}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Eligibles Gold</p>
                <p className="text-xl font-bold text-gray-900">{goldCount}</p>
              </div>
            </div>
          </div>

          <div
            className={`cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm transition ${
              expandedSection === 'rejected' ? 'border-red-400' : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => toggleSection('rejected')}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Rejetes recemment</p>
                <p className="text-xl font-bold text-gray-900">{rejectedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center rounded-xl border bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Silver Queue */}
            {expandedSection === 'silver' && (
              <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥈</span>
                    <h2 className="text-lg font-bold text-gray-900">En attente de revue Silver</h2>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {silverCount}
                    </span>
                  </div>
                  <button onClick={() => toggleSection('silver')}>
                    {expandedSection === 'silver' ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {silverCount === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="mx-auto h-10 w-10 text-green-300" />
                    <p className="mt-3 text-gray-500">Aucun skill en attente de revue Silver</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.silver_queue.map((item) => (
                      <div key={item.skill_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-500">
                                v{item.version} &middot; Soumis le {new Date(item.submitted_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Score */}
                            {item.silver_score !== null && (
                              <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                                item.silver_score >= 80
                                  ? 'bg-green-100 text-green-700'
                                  : item.silver_score >= 60
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                              }`}>
                                <Star className="h-3.5 w-3.5" />
                                {item.silver_score}/100
                              </div>
                            )}

                            {/* Actions */}
                            <a
                              href={`/skills/${item.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                              title="Voir le skill"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => {
                                setActionSkillId(item.skill_id);
                                setActionType('approve');
                                setActionLevel('silver');
                              }}
                              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              Approuver
                            </button>
                            <button
                              onClick={() => {
                                setActionSkillId(item.skill_id);
                                setActionType('reject');
                              }}
                              className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              Rejeter
                            </button>
                          </div>
                        </div>

                        {/* Criteria breakdown */}
                        {item.criteria && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(item.criteria).map(([key, value]) => (
                              <span
                                key={key}
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  value >= 16
                                    ? 'bg-green-50 text-green-700'
                                    : value >= 10
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {key}: {value}/20
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Gold Eligible */}
            {expandedSection === 'gold' && (
              <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b bg-yellow-50 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🥇</span>
                    <h2 className="text-lg font-bold text-gray-900">Eligibles Gold</h2>
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
                      {goldCount}
                    </span>
                  </div>
                </div>

                {goldCount === 0 ? (
                  <div className="p-8 text-center">
                    <Award className="mx-auto h-10 w-10 text-yellow-300" />
                    <p className="mt-3 text-gray-500">Aucun skill eligible Gold pour le moment</p>
                    <p className="mt-1 text-xs text-gray-400">Criteres : Silver + 50 ventes + note moyenne &ge; 4.5</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.gold_eligible.map((item) => (
                      <div key={item.skill_id} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.sales} ventes &middot; {item.rating.toFixed(1)}/5 ({item.rating_count} avis)
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-700">
                            <Star className="h-3.5 w-3.5" />
                            {item.rating.toFixed(1)}
                          </div>
                          <button
                            onClick={() => {
                              setActionSkillId(item.skill_id);
                              setActionType('approve');
                              setActionLevel('gold');
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-yellow-500 px-3 py-2 text-sm font-medium text-white hover:bg-yellow-600"
                          >
                            <Award className="h-3.5 w-3.5" />
                            Certifier Gold
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rejected */}
            {expandedSection === 'rejected' && (
              <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="flex items-center justify-between border-b bg-red-50 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❌</span>
                    <h2 className="text-lg font-bold text-gray-900">Rejetes recemment</h2>
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {rejectedCount}
                    </span>
                  </div>
                </div>

                {rejectedCount === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="mx-auto h-10 w-10 text-green-300" />
                    <p className="mt-3 text-gray-500">Aucun skill rejete recemment</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {data.rejected.map((item) => (
                      <div key={item.skill_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              Rejete le {new Date(item.rejected_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Rejete
                          </div>
                        </div>
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
                          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                          <p className="text-sm text-red-700">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Modal */}
      {actionSkillId && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                {actionType === 'approve' ? (
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                ) : (
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                )}
                <h2 className="text-lg font-bold text-gray-900">
                  {actionType === 'approve'
                    ? `Approuver ${actionLevel === 'gold' ? 'Gold' : 'Silver'}`
                    : 'Rejeter le skill'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setActionSkillId(null);
                  setActionType(null);
                  setActionNotes('');
                  setActionReason('');
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {actionType === 'approve' ? (
                <div>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <p className="text-sm text-green-700">
                      Ce skill sera certifie <strong>{actionLevel === 'gold' ? 'Gold 🥇' : 'Silver 🥈'}</strong>
                    </p>
                  </div>
                  <label htmlFor="action-notes" className="mb-1 block text-sm font-medium text-gray-700">
                    Notes (optionnel)
                  </label>
                  <textarea
                    id="action-notes"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    rows={3}
                    placeholder="Notes internes..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700">
                      Le createur sera notifie du rejet avec votre feedback.
                    </p>
                  </div>
                  <label htmlFor="action-reason" className="mb-1 block text-sm font-medium text-gray-700">
                    Raison du rejet <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="action-reason"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    rows={3}
                    placeholder="Expliquez pourquoi le skill est rejete..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t p-6">
              <button
                onClick={() => {
                  setActionSkillId(null);
                  setActionType(null);
                  setActionNotes('');
                  setActionReason('');
                }}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleCertify(
                  actionSkillId,
                  actionType,
                  actionLevel,
                  actionNotes || undefined,
                  actionReason || undefined,
                )}
                disabled={submitting || (actionType === 'reject' && !actionReason.trim())}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  actionType === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {actionType === 'approve' ? 'Confirmer la certification' : 'Confirmer le rejet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
