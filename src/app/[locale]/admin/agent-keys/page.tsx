'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from '@/i18n/routing';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Bot,
} from 'lucide-react';

interface AgentKey {
  id: string;
  name: string;
  agent_name: string | null;
  role: string;
  permissions: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

const AGENTS = [
  { name: 'QualityClaw', description: 'Service qualite — validation Silver/Gold', defaultRole: 'moderator', defaultPerms: ['read', 'certify', 'review', 'download'] },
  { name: 'DevClaw', description: 'Developpement des skills', defaultRole: 'agent', defaultPerms: ['read', 'publish', 'download'] },
  { name: 'ResearchClaw', description: 'R&D / Analyse', defaultRole: 'readonly', defaultPerms: ['read'] },
  { name: 'ContentClaw', description: 'Documentation', defaultRole: 'readonly', defaultPerms: ['read'] },
];

const PERMISSIONS = [
  { id: 'read', label: 'Lecture', description: 'Lire les skills et metadonnees' },
  { id: 'certify', label: 'Certifier', description: 'Attribuer les certifications Bronze/Silver/Gold' },
  { id: 'review', label: 'Review', description: 'Publier des revues de securite' },
  { id: 'download', label: 'Telecharger', description: 'Telecharger les fichiers ZIP des skills' },
  { id: 'publish', label: 'Publier', description: 'Soumettre et publier des skills' },
];

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  moderator: { label: 'Moderateur', color: 'bg-purple-100 text-purple-800' },
  agent: { label: 'Agent', color: 'bg-blue-100 text-blue-800' },
  readonly: { label: 'Lecture seule', color: 'bg-gray-100 text-gray-700' },
};

export default function AdminAgentKeysPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<AgentKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Formulaire de creation
  const [showForm, setShowForm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].name);
  const [selectedRole, setSelectedRole] = useState(AGENTS[0].defaultRole);
  const [selectedPerms, setSelectedPerms] = useState<string[]>(AGENTS[0].defaultPerms);
  const [creating, setCreating] = useState(false);

  // Cle generee (affichee une seule fois)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);
  const [copied, setCopied] = useState(false);

  // Revocation
  const [revoking, setRevoking] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Verification admin
  useEffect(() => {
    async function checkAccess() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?redirect=/admin/agent-keys');
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

  // Charger les cles
  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agent-keys');
      if (!res.ok) {
        if (res.status === 403) {
          setIsAdmin(false);
          return;
        }
        throw new Error(`Erreur ${res.status}`);
      }
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchKeys();
  }, [isAdmin, fetchKeys]);

  // Quand on change d'agent, pre-remplir le role et les permissions
  const handleAgentChange = (agentName: string) => {
    setSelectedAgent(agentName);
    const agent = AGENTS.find(a => a.name === agentName);
    if (agent) {
      setSelectedRole(agent.defaultRole);
      setSelectedPerms(agent.defaultPerms);
    }
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  // Generer une cle
  const handleGenerate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/admin/agent-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: selectedAgent,
          role: selectedRole,
          permissions: selectedPerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Erreur creation');
      }

      setGeneratedKey(data.plain_key);
      setShowKey(true);
      setCopied(false);
      showToast(data.message, 'success');
      fetchKeys();
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  // Copier la cle
  const handleCopy = async () => {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Revoquer une cle
  const handleRevoke = async (keyId: string) => {
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/admin/agent-keys?id=${keyId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || 'Erreur revocation');
      }

      showToast('Cle revoquee', 'success');
      fetchKeys();
    } catch (e) {
      showToast(`Erreur : ${e instanceof Error ? e.message : 'inconnue'}`, 'error');
    } finally {
      setRevoking(null);
    }
  };

  // Acces refuse
  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-red-800">Acces refuse</h1>
          <p className="mt-2 text-red-600">Cette page est reservee aux administrateurs.</p>
        </div>
      </div>
    );
  }

  // Chargement
  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Key className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Cles API Agents</h1>
            </div>
            <p className="mt-2 text-gray-600">
              Gerez les cles d&apos;acces API pour les agents OpenClaw
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchKeys}
              disabled={loading}
              className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50"
              title="Rafraichir"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setGeneratedKey(null); }}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Generer nouvelle cle
            </button>
          </div>
        </div>

        {/* Formulaire de generation */}
        {showForm && (
          <div className="mb-8 rounded-xl border border-purple-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Nouvelle cle API</h2>

            {/* Cle generee */}
            {generatedKey && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">
                    Cle generee — Copiez-la maintenant !
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-white px-3 py-2 font-mono text-sm text-gray-900 border">
                    {showKey ? generatedKey : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="rounded-md border p-2 text-gray-500 hover:bg-gray-50"
                    title={showKey ? 'Masquer' : 'Afficher'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'border bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copie !' : 'Copier'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-green-700">
                  Cette cle ne sera plus jamais affichee. Conservez-la en lieu sur.
                </p>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Selection agent */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Agent</label>
                <div className="space-y-2">
                  {AGENTS.map(agent => (
                    <label
                      key={agent.name}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                        selectedAgent === agent.name
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="agent"
                        value={agent.name}
                        checked={selectedAgent === agent.name}
                        onChange={() => handleAgentChange(agent.name)}
                        className="accent-purple-600"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{agent.name}</span>
                        </div>
                        <p className="text-xs text-gray-500">{agent.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Role et permissions */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="moderator">Moderateur — certification et review</option>
                  <option value="agent">Agent — lecture et publication</option>
                  <option value="readonly">Lecture seule</option>
                </select>

                <label className="mb-2 block text-sm font-medium text-gray-700">Permissions</label>
                <div className="space-y-2">
                  {PERMISSIONS.map(perm => (
                    <label
                      key={perm.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition ${
                        selectedPerms.includes(perm.id)
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPerms.includes(perm.id)}
                        onChange={() => togglePerm(perm.id)}
                        className="accent-purple-600"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{perm.label}</span>
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-gray-500">
                Format : <code className="rounded bg-gray-100 px-1.5 py-0.5">clf_qc_live_{'{'}&hellip;{'}'}</code>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowForm(false); setGeneratedKey(null); }}
                  className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={creating || selectedPerms.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  Generer la cle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des cles actives */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Cles actives ({activeKeys.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center rounded-xl border bg-white p-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="rounded-xl border bg-white p-12 text-center">
              <Key className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune cle active</h3>
              <p className="mt-2 text-gray-500">
                Generez une cle API pour permettre aux agents d&apos;acceder a l&apos;API.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeKeys.map(key => {
                const roleBadge = ROLE_BADGES[key.role] || ROLE_BADGES.agent;
                return (
                  <div key={key.id} className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                        <Bot className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{key.agent_name || key.name}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleBadge.color}`}>
                            {roleBadge.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {key.permissions.map(p => (
                            <span key={p} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {p}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          Creee le {new Date(key.created_at).toLocaleDateString('fr-FR')}
                          {key.last_used_at && (
                            <> &middot; Derniere utilisation : {new Date(key.last_used_at).toLocaleDateString('fr-FR')}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking === key.id}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {revoking === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Revoquer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cles revoquees */}
        {revokedKeys.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-500">
              Cles revoquees ({revokedKeys.length})
            </h2>
            <div className="space-y-2">
              {revokedKeys.map(key => (
                <div key={key.id} className="flex items-center justify-between rounded-xl border border-dashed bg-gray-50 p-4 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                      <Bot className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">{key.agent_name || key.name}</span>
                      <p className="text-xs text-gray-400">
                        Revoquee le {new Date(key.revoked_at!).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                    Revoquee
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
