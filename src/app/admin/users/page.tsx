'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Ban,
  Unlock,
  UserCog,
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'creator' | 'admin';
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
  skills_count: number;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
  creator: { label: 'Createur', color: 'bg-blue-100 text-blue-700' },
  user: { label: 'Utilisateur', color: 'bg-gray-100 text-gray-700' },
};

type ModalType = 'role' | 'block' | 'unblock' | 'delete' | null;

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Modal
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Verifier les droits admin
  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/admin/users');
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

  // Charger les utilisateurs
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur ${res.status}`);
      }

      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (e) {
      console.error('Fetch users error:', e);
      setFetchError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  // Recherche avec debounce
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Actions
  const openModal = (type: ModalType, user: AdminUser) => {
    setSelectedUser(user);
    setModalType(type);
    setNewRole(user.role);
    setActionMessage(null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setActionMessage(null);
  };

  const executeAction = async () => {
    if (!selectedUser || !modalType) return;
    setActionLoading(true);
    setActionMessage(null);

    try {
      if (modalType === 'delete') {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setActionMessage({ type: 'success', text: data.message });
        setTimeout(() => { closeModal(); fetchUsers(); }, 1500);
      } else if (modalType === 'role') {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'change_role', role: newRole }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setActionMessage({ type: 'success', text: data.message });
        setTimeout(() => { closeModal(); fetchUsers(); }, 1500);
      } else if (modalType === 'block' || modalType === 'unblock') {
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: modalType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setActionMessage({ type: 'success', text: data.message });
        setTimeout(() => { closeModal(); fetchUsers(); }, 1500);
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: e instanceof Error ? e.message : 'Erreur inconnue' });
    } finally {
      setActionLoading(false);
    }
  };

  // Ecrans de chargement / acces refuse
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
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tete */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour a l'administration
          </Link>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
              <p className="mt-1 text-gray-600">
                {total} utilisateur{total !== 1 ? 's' : ''} inscrits
              </p>
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par email ou nom..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Tous les roles</option>
            <option value="admin">Admins</option>
            <option value="creator">Createurs</option>
            <option value="user">Utilisateurs</option>
          </select>
        </div>

        {/* Erreur */}
        {fetchError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Erreur :</strong> {fetchError}
          </div>
        )}

        {/* Tableau */}
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              Aucun utilisateur trouve
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Utilisateur</th>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Skills</th>
                    <th className="px-6 py-3">Stripe</th>
                    <th className="px-6 py-3">Inscription</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => {
                    const roleInfo = ROLE_LABELS[u.role] || ROLE_LABELS.user;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full" />
                              ) : (
                                <span className="text-sm font-medium">
                                  {(u.name || u.email)[0].toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {u.name || 'Sans nom'}
                              </p>
                              <p className="text-xs text-gray-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {u.skills_count}
                        </td>
                        <td className="px-6 py-4">
                          {u.stripe_onboarding_complete ? (
                            <span className="text-xs text-green-600">Configure</span>
                          ) : u.stripe_account_id ? (
                            <span className="text-xs text-amber-600">En cours</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal('role', u)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="Changer le role"
                            >
                              <UserCog className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openModal('block', u)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600"
                              title="Bloquer"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openModal('unblock', u)}
                              className="rounded-lg p-2 text-gray-400 hover:bg-green-50 hover:text-green-600"
                              title="Debloquer"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                            {u.role !== 'admin' && (
                              <button
                                onClick={() => openModal('delete', u)}
                                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Precedent
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalType && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            {/* Titre du modal */}
            <div className="mb-4 flex items-center gap-3">
              {modalType === 'delete' && <AlertTriangle className="h-6 w-6 text-red-500" />}
              {modalType === 'block' && <ShieldAlert className="h-6 w-6 text-amber-500" />}
              {modalType === 'unblock' && <Unlock className="h-6 w-6 text-green-500" />}
              {modalType === 'role' && <Shield className="h-6 w-6 text-blue-500" />}
              <h2 className="text-lg font-semibold text-gray-900">
                {modalType === 'delete' && 'Supprimer l\'utilisateur'}
                {modalType === 'block' && 'Bloquer l\'utilisateur'}
                {modalType === 'unblock' && 'Debloquer l\'utilisateur'}
                {modalType === 'role' && 'Changer le role'}
              </h2>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              <strong>{selectedUser.name || selectedUser.email}</strong>
              <br />
              <span className="text-gray-400">{selectedUser.email}</span>
            </p>

            {modalType === 'delete' && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Cette action est irreversible. L'utilisateur, ses skills et toutes ses donnees seront
                definitivement supprimes.
              </div>
            )}

            {modalType === 'block' && (
              <p className="mb-4 text-sm text-gray-500">
                L'utilisateur ne pourra plus se connecter a ClawForge. Ses skills resteront visibles.
              </p>
            )}

            {modalType === 'unblock' && (
              <p className="mb-4 text-sm text-gray-500">
                L'utilisateur pourra a nouveau se connecter a ClawForge.
              </p>
            )}

            {modalType === 'role' && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nouveau role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="user">Utilisateur</option>
                  <option value="creator">Createur</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}

            {/* Message de retour */}
            {actionMessage && (
              <div className={`mb-4 rounded-lg p-3 text-sm ${
                actionMessage.type === 'success'
                  ? 'border border-green-200 bg-green-50 text-green-700'
                  : 'border border-red-200 bg-red-50 text-red-700'
              }`}>
                {actionMessage.text}
              </div>
            )}

            {/* Boutons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={executeAction}
                disabled={actionLoading || (actionMessage?.type === 'success')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  modalType === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : modalType === 'block'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : modalType === 'unblock'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {modalType === 'delete' && 'Supprimer'}
                {modalType === 'block' && 'Bloquer'}
                {modalType === 'unblock' && 'Debloquer'}
                {modalType === 'role' && 'Mettre a jour'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
