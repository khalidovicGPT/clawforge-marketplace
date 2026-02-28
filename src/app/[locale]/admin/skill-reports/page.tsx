'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/routing';
import {
  Shield,
  Loader2,
  XCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  Send,
} from 'lucide-react';

interface ReportRow {
  id: string;
  skill_id: string;
  report_type: string;
  description: string;
  attachment_url: string | null;
  status: string;
  priority: string;
  admin_notes: string | null;
  resolution_action: string | null;
  resolved_at: string | null;
  created_at: string;
  skill: { id: string; title: string; slug: string; version: string; status: string; certification: string } | null;
  reporter: { id: string; name: string | null; email: string } | null;
}

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'bg-red-100 text-red-700' },
  under_review: { label: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Resolu', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejete', color: 'bg-gray-100 text-gray-600' },
  escalated: { label: 'Escalade', color: 'bg-purple-100 text-purple-700' },
};

const PRIORITY_BADGES: Record<string, { label: string; color: string }> = {
  high: { label: 'HIGH', color: 'bg-red-200 text-red-800' },
  normal: { label: 'NORM', color: 'bg-yellow-200 text-yellow-800' },
  low: { label: 'LOW', color: 'bg-gray-200 text-gray-600' },
};

const TYPE_LABELS: Record<string, string> = {
  false_positive: 'Faux positif',
  system_bug: 'Bug systeme',
  unclear_error: 'Erreur incomprehensible',
  other: 'Autre',
};

const RESOLUTION_OPTIONS = [
  { value: 'skill_approved', label: 'Skill approuve' },
  { value: 'skill_rejected', label: 'Skill maintenu rejete' },
  { value: 'bug_fixed', label: 'Bug systeme corrige' },
  { value: 'no_action', label: 'Pas d\'action necessaire' },
];

export default function SkillReportsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtres
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Detail / Respond
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [respondStatus, setRespondStatus] = useState('resolved');
  const [respondNotes, setRespondNotes] = useState('');
  const [respondAction, setRespondAction] = useState('');
  const [respondNotify, setRespondNotify] = useState(true);
  const [respondLoading, setRespondLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login?redirect=/admin/skill-reports'); return; }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      setIsAdmin(profile?.role === 'admin');
    }
    checkAccess();
  }, [router]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        status: statusFilter,
        type: typeFilter,
        priority: priorityFilter,
      });
      const res = await fetch(`/api/admin/skill-reports?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setToast({ type: 'error', message: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, typeFilter, priorityFilter]);

  useEffect(() => { if (isAdmin) fetchReports(); }, [isAdmin, fetchReports]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  const openDetail = (report: ReportRow) => {
    setSelectedReport(report);
    setRespondStatus(report.status === 'open' ? 'resolved' : report.status);
    setRespondNotes(report.admin_notes || '');
    setRespondAction(report.resolution_action || '');
    setRespondNotify(true);
  };

  const handleRespond = async () => {
    if (!selectedReport) return;
    setRespondLoading(true);
    try {
      const res = await fetch(`/api/admin/skill-reports/${selectedReport.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: respondStatus,
          admin_notes: respondNotes,
          resolution_action: respondAction || null,
          notify_user: respondNotify,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ type: 'error', message: data.error || 'Erreur' }); return; }
      setToast({ type: 'success', message: 'Reponse enregistree' });
      setSelectedReport(null);
      fetchReports();
    } catch {
      setToast({ type: 'error', message: 'Erreur reseau' });
    } finally {
      setRespondLoading(false);
    }
  };

  const openCount = reports.filter(r => r.status === 'open').length;

  if (isAdmin === null) {
    return (<div className="flex min-h-screen items-center justify-center bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>);
  }
  if (!isAdmin) {
    return (<div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center"><XCircle className="mx-auto h-12 w-12 text-red-400" /><h1 className="mt-4 text-xl font-bold text-red-800">Acces refuse</h1></div></div>);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-3">
          <Flag className="h-8 w-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Signalements Createurs</h1>
            <p className="mt-1 text-gray-600">
              {total} signalement(s)
              {openCount > 0 && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{openCount} nouveau(x)</span>}
            </p>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="all">Tous statuts</option>
            <option value="open">Ouverts</option>
            <option value="under_review">En cours</option>
            <option value="resolved">Resolus</option>
            <option value="rejected">Rejetes</option>
            <option value="escalated">Escalades</option>
          </select>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="all">Tous types</option>
            <option value="false_positive">Faux positif</option>
            <option value="system_bug">Bug systeme</option>
            <option value="unclear_error">Erreur incomprehensible</option>
            <option value="other">Autre</option>
          </select>
          <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="all">Toutes priorites</option>
            <option value="high">Haute</option>
            <option value="normal">Normale</option>
            <option value="low">Basse</option>
          </select>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border bg-white p-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center text-gray-500">Aucun signalement</div>
          ) : (
            reports.map((report) => {
              const statusBadge = STATUS_BADGES[report.status] || STATUS_BADGES.open;
              const priorityBadge = PRIORITY_BADGES[report.priority] || PRIORITY_BADGES.normal;
              return (
                <div key={report.id} className="rounded-xl border bg-white p-4 shadow-sm hover:border-blue-200 transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {TYPE_LABELS[report.report_type] || report.report_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {report.skill?.title || 'Skill supprime'} v{report.skill?.version || '?'}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{report.description}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        par {report.reporter?.email || '?'} • {new Date(report.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {report.skill?.slug && (
                        <a href={`/skills/${report.skill.slug}`} target="_blank" rel="noopener noreferrer"
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="Voir le skill">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <button onClick={() => openDetail(report)}
                        className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                        Traiter
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} / {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal detail + reponse */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
          <div className="mx-4 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Signalement — {selectedReport.skill?.title || 'Skill'}
              </h2>
              <button onClick={() => setSelectedReport(null)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Infos */}
            <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium">{TYPE_LABELS[selectedReport.report_type] || selectedReport.report_type}</p>
              </div>
              <div>
                <p className="text-gray-500">Createur</p>
                <p className="font-medium">{selectedReport.reporter?.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Skill</p>
                <p className="font-medium">{selectedReport.skill?.title} v{selectedReport.skill?.version}</p>
              </div>
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium">{new Date(selectedReport.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Description createur */}
            <div className="mb-4">
              <p className="mb-1 text-sm font-medium text-gray-700">Description du createur</p>
              <div className="rounded-lg border bg-white p-3 text-sm text-gray-700 whitespace-pre-wrap">
                {selectedReport.description}
              </div>
            </div>

            {selectedReport.attachment_url && (
              <div className="mb-4">
                <a href={selectedReport.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline">
                  Voir la piece jointe
                </a>
              </div>
            )}

            <hr className="my-4" />

            {/* Reponse admin */}
            <h3 className="mb-3 text-sm font-bold text-gray-900">Reponse Admin</h3>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
              <select value={respondStatus} onChange={(e) => setRespondStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="open">Ouvert</option>
                <option value="under_review">En cours d'examen</option>
                <option value="resolved">Resolu</option>
                <option value="rejected">Rejete</option>
                <option value="escalated">Escalade</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Notes admin *</label>
              <textarea value={respondNotes} onChange={(e) => setRespondNotes(e.target.value)}
                rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Votre reponse au createur..." />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Action de resolution</label>
              <div className="space-y-2">
                {RESOLUTION_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="resolution" value={opt.value}
                      checked={respondAction === opt.value}
                      onChange={(e) => setRespondAction(e.target.value)}
                      className="h-4 w-4 border-gray-300 text-blue-600" />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="mb-4 flex items-center gap-2">
              <input type="checkbox" checked={respondNotify} onChange={(e) => setRespondNotify(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Notifier le createur par email</span>
            </label>

            <div className="flex justify-end gap-3">
              <button onClick={() => setSelectedReport(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleRespond}
                disabled={respondLoading || !respondNotes.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {respondLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enregistrer la reponse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
