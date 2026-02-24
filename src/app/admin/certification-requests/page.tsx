'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Loader2,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

interface CertificationRequestItem {
  id: string;
  skill_id: string;
  requested_level: string;
  requested_at: string;
  status: string;
  feedback: string | null;
  quality_score_at_request: number | null;
  reviewed_at: string | null;
  skill: {
    id: string;
    title: string;
    slug: string;
    certification: string;
    quality_score: number;
    creator_id: string;
  } | null;
  requester: {
    id: string;
    email: string;
    display_name: string | null;
    name: string | null;
  } | null;
  reviewer: {
    id: string;
    display_name: string | null;
    name: string | null;
  } | null;
}

type Tab = 'pending' | 'approved' | 'rejected';

export default function CertificationRequestsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CertificationRequestItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Review modal
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/admin/certification-requests');
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

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/certification/requests');
      if (!res.ok) {
        if (res.status === 403) { setIsAdmin(false); return; }
        throw new Error(`Erreur ${res.status}`);
      }
      const data = await res.json();
      setRequests(data);
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchRequests();
  }, [isAdmin, fetchRequests]);

  const handleReview = async () => {
    if (!reviewId) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/certification/${reviewId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: reviewDecision,
          feedback: reviewFeedback || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);

      showToast(data.message || 'Demande traitee', 'success');
      setReviewId(null);
      setReviewFeedback('');
      fetchRequests();
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Access check
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
        </div>
      </div>
    );
  }

  const filtered = requests.filter((r: CertificationRequestItem) => r.status === activeTab);
  const pendingCount = requests.filter((r: CertificationRequestItem) => r.status === 'pending').length;
  const approvedCount = requests.filter((r: CertificationRequestItem) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r: CertificationRequestItem) => r.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour a l'admin
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Demandes de Certification</h1>
                <p className="mt-1 text-gray-600">
                  Gerez les demandes Silver et Gold des createurs
                </p>
              </div>
            </div>

            <button
              onClick={fetchRequests}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Rafraichir
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { key: 'pending' as Tab, label: 'En attente', count: pendingCount, color: 'amber' },
            { key: 'approved' as Tab, label: 'Approuvees', count: approvedCount, color: 'green' },
            { key: 'rejected' as Tab, label: 'Rejetees', count: rejectedCount, color: 'red' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-2 py-0.5 text-xs ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : `bg-${tab.color}-100 text-${tab.color}-700`
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center rounded-xl border bg-white p-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-gray-300" />
            <p className="mt-3 text-gray-500">
              Aucune demande {activeTab === 'pending' ? 'en attente' : activeTab === 'approved' ? 'approuvee' : 'rejetee'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3">Skill</th>
                  <th className="px-6 py-3">Createur</th>
                  <th className="px-6 py-3">Niveau</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((req: CertificationRequestItem) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{req.skill?.title || 'Skill inconnu'}</p>
                        <p className="text-xs text-gray-500">
                          Actuel : {req.skill?.certification || '—'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {req.requester?.display_name || req.requester?.name || req.requester?.email || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        req.requested_level === 'gold'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.requested_level === 'gold' ? '🥇 Gold' : '🥈 Silver'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(req.requested_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        (req.quality_score_at_request || 0) >= 80
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.quality_score_at_request || 0}/100
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          {req.skill?.slug && (
                            <Link
                              href={`/skills/${req.skill.slug}`}
                              target="_blank"
                              className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
                              title="Voir le skill"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => {
                              setReviewId(req.id);
                              setReviewDecision('approved');
                              setReviewFeedback('');
                            }}
                            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            Approuver
                          </button>
                          <button
                            onClick={() => {
                              setReviewId(req.id);
                              setReviewDecision('rejected');
                              setReviewFeedback('');
                            }}
                            className="flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <ThumbsDown className="h-3 w-3" />
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {req.status === 'approved' ? (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approuve
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              Rejete
                            </span>
                          )}
                          {req.reviewer && (
                            <span className="text-xs text-gray-400">
                              par {req.reviewer.display_name || req.reviewer.name}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-6">
              <div className="flex items-center gap-3">
                {reviewDecision === 'approved' ? (
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                ) : (
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                )}
                <h2 className="text-lg font-bold text-gray-900">
                  {reviewDecision === 'approved' ? 'Approuver la certification' : 'Rejeter la demande'}
                </h2>
              </div>
              <button
                onClick={() => { setReviewId(null); setReviewFeedback(''); }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {reviewDecision === 'approved' ? (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <p className="text-sm text-green-700">
                    Le skill sera certifie et le createur notifie par email.
                  </p>
                </div>
              ) : (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-700">
                    Le createur sera notifie du rejet avec votre feedback.
                  </p>
                </div>
              )}

              <label htmlFor="review-feedback" className="mb-1 block text-sm font-medium text-gray-700">
                Feedback {reviewDecision === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id="review-feedback"
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                rows={3}
                placeholder={reviewDecision === 'approved'
                  ? 'Notes optionnelles...'
                  : 'Expliquez pourquoi la demande est rejetee...'}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t p-6">
              <button
                onClick={() => { setReviewId(null); setReviewFeedback(''); }}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleReview}
                disabled={submitting || (reviewDecision === 'rejected' && !reviewFeedback.trim())}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  reviewDecision === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {reviewDecision === 'approved' ? 'Confirmer' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
