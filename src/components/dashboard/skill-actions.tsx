'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, EyeOff, Eye, Loader2 } from 'lucide-react';

interface SkillActionsProps {
  skillId: string;
  skillSlug: string;
  status: string;
  publishedAt: string | null;
  certifiedAt: string | null;
}

export function SkillActions({ skillId, skillSlug, status, publishedAt, certifiedAt }: SkillActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'withdraw' | 'republish') => {
    setLoading(action);
    try {
      const res = await fetch(`/api/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur');
        return;
      }

      router.refresh();
    } catch {
      alert('Erreur réseau');
    } finally {
      setLoading(null);
    }
  };

  const canWithdraw = status === 'published';
  const canRepublish = status === 'draft' && !!publishedAt && !!certifiedAt;
  const canEdit = status === 'published' || status === 'draft';

  return (
    <div className="flex items-center gap-2">
      {/* View published skill */}
      {status === 'published' && (
        <Link
          href={`/skills/${skillSlug || skillId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir
        </Link>
      )}

      {/* Edit skill → new version */}
      {canEdit && (
        <Link
          href={`/dashboard/edit-skill/${skillId}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </Link>
      )}

      {/* Withdraw published skill */}
      {canWithdraw && (
        <button
          onClick={() => handleAction('withdraw')}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          {loading === 'withdraw' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          Retirer
        </button>
      )}

      {/* Republish without validation */}
      {canRepublish && (
        <button
          onClick={() => handleAction('republish')}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
        >
          {loading === 'republish' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          Republier
        </button>
      )}
    </div>
  );
}
