'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bot, Copy, CheckCircle, RefreshCw, Loader2, Clock } from 'lucide-react';

interface AgentInstallLinkProps {
  skillId: string;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://clawforge-marketplace.vercel.app';

export function AgentInstallLink({ skillId }: AgentInstallLinkProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/skills/download-token?skill_id=${skillId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setToken(data.token.token);
          setExpiresAt(data.token.expiresAt);
        }
      }
    } catch {
      // Silencieux
    }
  }, [skillId]);

  useEffect(() => {
    if (open && !token) fetchToken();
  }, [open, token, fetchToken]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/skills/download-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: skillId }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setExpiresAt(data.expires_at);
      }
    } catch {
      // Silencieux
    } finally {
      setLoading(false);
    }
  };

  const downloadUrl = token ? `${APP_URL}/api/skills/download?token=${token}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `Installe ce skill sur mon agent :\n${downloadUrl}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
        title="Installer via un agent OpenClaw"
      >
        <Bot className="h-3.5 w-3.5" />
        Agent
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-blue-800">
        <Bot className="h-3.5 w-3.5" />
        Installer via agent
      </div>

      {token ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              value={downloadUrl}
              className="flex-1 rounded border bg-white px-2 py-1 font-mono text-xs text-gray-700"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={handleCopy}
              className="rounded p-1.5 text-blue-600 hover:bg-blue-100"
              title="Copier le lien"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Clock className="h-3 w-3" />
              Expire dans {daysLeft} jour{daysLeft !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Nouveau lien
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-xs text-blue-700">
            Generez un lien pour installer ce skill via votre agent.
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-2 inline-flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bot className="h-3 w-3" />}
            Generer le lien
          </button>
        </div>
      )}
    </div>
  );
}
