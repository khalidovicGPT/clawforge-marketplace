'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RotateCcw,
  Check,
  X,
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface RefundRequest {
  id: string;
  purchase_id: string;
  user_id: string;
  skill_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  admin_notes: string | null;
  requested_at: string;
  resolved_at: string | null;
  user: { id: string; email: string; display_name: string | null } | null;
  skill: { id: string; title: string; slug: string; creator_id: string } | null;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approuve', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refuse', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export default function AdminRefundsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?redirect=/admin/refunds'); return; }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'admin');
    }
    checkAccess();
  }, [router]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/refunds?status=${filter}`);
      const data = await res.json();
      setRequests(data.refund_requests || []);
    } catch {
      console.error('Erreur chargement remboursements');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) fetchRequests();
  }, [isAdmin, fetchRequests]);

  const handleAction = async (requestId: string, action: 'approve' | 'reject') => {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refundRequestId: requestId,
          action,
          adminNotes: adminNotes[requestId] || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchRequests();
      } else {
        alert(data.error || 'Erreur');
      }
    } catch {
      alert('Erreur reseau');
    } finally {
      setActionLoading(null);
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
          <h1 className="mt-4 text-xl font-bold text-red-800">Acces refuse</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Retour admin
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <RotateCcw className="h-8 w-8 text-rose-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Remboursements</h1>
            <p className="mt-1 text-gray-600">Gerer les demandes de remboursement des acheteurs</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === s ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {s === 'pending' ? 'En attente' : s === 'approved' ? 'Approuves' : s === 'rejected' ? 'Refuses' : 'Tous'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <p className="mt-4 text-gray-500">Aucune demande de remboursement {filter === 'pending' ? 'en attente' : ''}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const statusConf = STATUS_CONFIG[req.status];
              const StatusIcon = statusConf.icon;
              return (
                <div key={req.id} className="rounded-xl border bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusConf.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConf.label}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {(req.amount / 100).toFixed(2)} EUR
                        </span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Skill :</span> {req.skill?.title || 'N/A'}</p>
                        <p><span className="font-medium">Acheteur :</span> {req.user?.display_name || req.user?.email || 'N/A'}</p>
                        <p><span className="font-medium">Date :</span> {new Date(req.requested_at).toLocaleDateString('fr-FR')}</p>
                      </div>

                      <div className="mt-3 rounded-lg bg-gray-50 p-3">
                        <p className="text-xs font-medium text-gray-500">Raison du remboursement</p>
                        <p className="mt-1 text-sm text-gray-700">{req.reason}</p>
                      </div>

                      {req.admin_notes && (
                        <div className="mt-2 rounded-lg bg-blue-50 p-3">
                          <p className="text-xs font-medium text-blue-600">Note admin</p>
                          <p className="mt-1 text-sm text-blue-800">{req.admin_notes}</p>
                        </div>
                      )}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          placeholder="Note admin (obligatoire pour refus)"
                          value={adminNotes[req.id] || ''}
                          onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                          className="w-56 rounded-lg border p-2 text-sm"
                          rows={2}
                        />
                        <button
                          onClick={() => handleAction(req.id, 'approve')}
                          disabled={actionLoading === req.id}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading === req.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Approuver
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'reject')}
                          disabled={actionLoading === req.id || (adminNotes[req.id] || '').length < 5}
                          title={(adminNotes[req.id] || '').length < 5 ? 'Note admin requise (min. 5 caractères)' : undefined}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Refuser
                        </button>
                        {(adminNotes[req.id] || '').length > 0 && (adminNotes[req.id] || '').length < 5 && (
                          <p className="text-xs text-red-500">Note requise (min. 5 car.)</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
