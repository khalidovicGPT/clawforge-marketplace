'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Bot, Key, Eye, EyeOff, Copy, RefreshCw,
  CheckCircle, Loader2, AlertTriangle, Clock, Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ApiKeyInfo {
  id: string;
  name: string;
  permissions: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

function maskKey(key: string): string {
  if (key.length <= 20) return key;
  return key.slice(0, 12) + '•'.repeat(key.length - 16) + key.slice(-4);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Jamais';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STORAGE_KEY = 'clf_agent_api_key';

function saveKeyToStorage(key: string) {
  try { localStorage.setItem(STORAGE_KEY, key); } catch { /* SSR / perm */ }
}

function loadKeyFromStorage(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function clearKeyFromStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* SSR / perm */ }
}

export default function AgentDashboardPage() {
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [plainKey, setPlainKey] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<'key' | 'prompt' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/keys');
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login?redirect=/dashboard/agent';
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const creator = profile?.role === 'creator' || profile?.role === 'admin';
      setIsCreator(creator);
      if (creator) {
        const stored = loadKeyFromStorage();
        if (stored) setPlainKey(stored);
        fetchKeys();
      } else {
        setLoading(false);
      }
    };
    checkStatus();
  }, [fetchKeys]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setPlainKey(null);
    try {
      const res = await fetch('/api/agent/keys', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPlainKey(data.api_key);
        setJustGenerated(true);
        setShowKey(true);
        saveKeyToStorage(data.api_key);
        await fetchKeys();
      } else {
        setError(data.error || 'Erreur lors de la generation');
      }
    } catch {
      setError('Erreur reseau');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setRevoking(keyId);
    try {
      const res = await fetch('/api/agent/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_id: keyId }),
      });
      if (res.ok) {
        await fetchKeys();
        setPlainKey(null);
        setJustGenerated(false);
        clearKeyFromStorage();
      }
    } catch {
      // Silencieux
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = async (text: string, type: 'key' | 'prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback
    }
  };

  const activeKey = keys.find(k => !k.revoked_at);
  const hasPlainKey = !!plainKey;
  const displayKey = plainKey || (activeKey ? `clf_sk_live_${'•'.repeat(20)}` : null);

  const apiKeyDisplay = plainKey || '[Collez votre cle API ici]';

  const promptTemplate = `J'ai un skill a publier sur ClawForge.
Voici ma cle API : ${apiKeyDisplay}
Le skill est dans le dossier : [chemin vers le dossier du skill]
Instructions :
1. Cree un ZIP de ce dossier (avec le dossier racine inclus)
2. Envoie-le a https://clawforge-marketplace.vercel.app/api/skills/agent/publish
3. Utilise la cle API dans le header Authorization: Bearer ${apiKeyDisplay}
4. Retourne-moi l'URL du skill publie`;

  if (isCreator === null || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Bot className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">Acces reserve aux createurs</h2>
          <p className="mt-2 text-gray-600">
            Devenez createur pour publier des skills via un agent OpenClaw.
          </p>
          <Link
            href="/become-creator"
            className="mt-6 inline-block rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Devenir createur
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        {/* Header */}
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Bot className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Publier via Agent</h1>
              <p className="text-sm text-gray-600">
                Publiez vos skills automatiquement depuis un agent OpenClaw
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section cle API */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Key className="h-5 w-5 text-gray-500" />
              Votre cle API
            </h2>

            {displayKey ? (
              <div className="mt-4 space-y-4">
                {/* Affichage de la cle */}
                <div className="flex items-center gap-2 rounded-lg border bg-gray-50 p-3">
                  <code className="flex-1 font-mono text-sm text-gray-800">
                    {showKey && hasPlainKey ? plainKey : maskKey(displayKey)}
                  </code>
                  {hasPlainKey && (
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      title={showKey ? 'Masquer' : 'Reveler'}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                  {hasPlainKey && (
                    <button
                      onClick={() => copyToClipboard(plainKey!, 'key')}
                      className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      title="Copier"
                    >
                      {copied === 'key' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                {justGenerated && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      <strong>Cle generee avec succes !</strong> Elle est sauvegardee localement dans ce navigateur.
                      Si vous changez de navigateur, regenerez-en une.
                    </span>
                  </div>
                )}

                {!hasPlainKey && activeKey && (
                  <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                    <Key className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Cle non disponible dans ce navigateur. Regenerez-en une pour la voir.
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {activeKey ? 'Regenerer la cle' : 'Generer une cle'}
                  </button>
                  {activeKey && (
                    <button
                      onClick={() => handleRevoke(activeKey.id)}
                      disabled={revoking === activeKey.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {revoking === activeKey.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Revoquer
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Aucune cle API active. Generez-en une pour commencer.</p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  Generer une cle API
                </button>
              </div>
            )}
          </div>

          {/* Section prompt a copier */}
          {activeKey && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">Prompt pret a copier</h2>
              <p className="mt-1 text-sm text-gray-600">
                Collez ce prompt dans votre agent OpenClaw pour publier un skill :
              </p>

              <div className="relative mt-4 rounded-lg border bg-gray-900 p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm text-green-400">
                  {promptTemplate}
                </pre>
                <button
                  onClick={() => copyToClipboard(promptTemplate, 'prompt')}
                  className="absolute right-3 top-3 rounded p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white"
                  title="Copier le prompt"
                >
                  {copied === 'prompt' ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              {!hasPlainKey && activeKey && (
                <p className="mt-2 text-xs text-gray-500">
                  Le prompt contient un placeholder. Regenerez votre cle pour obtenir un prompt complet.
                </p>
              )}
            </div>
          )}

          {/* Historique des cles */}
          {keys.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">Historique des cles</h2>
              <div className="mt-3 divide-y rounded-lg border">
                {keys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${key.revoked_at ? 'bg-red-400' : 'bg-green-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{key.name}</p>
                        <p className="text-xs text-gray-500">
                          {key.revoked_at ? (
                            <>Revoquee le {formatDate(key.revoked_at)}</>
                          ) : (
                            <>
                              <Clock className="mr-1 inline h-3 w-3" />
                              Dernier usage : {formatDate(key.last_used_at)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(key.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lien vers la doc */}
          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              Consultez le{' '}
              <Link href="/docs/creators" className="font-medium underline hover:text-blue-900">
                guide de packaging
              </Link>
              {' '}pour preparer votre skill au format attendu (SKILL.md obligatoire via agent).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
