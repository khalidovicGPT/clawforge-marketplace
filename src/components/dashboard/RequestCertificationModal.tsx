'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import type { CriteriaStatus } from '@/types/database';

interface RequestCertificationModalProps {
  skillId: string;
  skillTitle: string;
  level: 'silver' | 'gold';
  criteriaStatus: CriteriaStatus[];
  canRequest: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RequestCertificationModal({
  skillId,
  skillTitle,
  level,
  criteriaStatus,
  canRequest,
  onClose,
  onSuccess,
}: RequestCertificationModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passedCount = criteriaStatus.filter(c => c.status === 'passed').length;
  const totalCount = criteriaStatus.length;
  const failedCriteria = criteriaStatus.filter(c => c.status !== 'passed');
  const levelLabel = level === 'gold' ? 'Gold' : 'Silver';
  const levelEmoji = level === 'gold' ? '🥇' : '🥈';

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/skills/${skillId}/certification-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_level: level }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Demander la certification {levelLabel} {levelEmoji}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{skillTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {canRequest ? (
            <>
              {/* Recapitulatif */}
              <div className="mb-4 rounded-lg bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-800">
                    Tous les criteres automatiques sont valides ({passedCount}/{totalCount})
                  </p>
                </div>
              </div>

              {/* Criteres passes */}
              <div className="mb-6 space-y-2">
                {criteriaStatus.filter(c => c.status === 'passed').map(c => (
                  <div key={c.criteria_id} className="flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>{c.name}</span>
                    {c.value && <span className="text-green-500">({c.value})</span>}
                  </div>
                ))}
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Je certifie que mon skill respecte les criteres de certification {levelLabel}
                  et que toutes les informations fournies sont exactes.
                </span>
              </label>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Criteres manquants */}
              <div className="mb-4 rounded-lg bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="font-medium text-amber-800">
                    Criteres manquants ({failedCriteria.length})
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {failedCriteria.map(c => (
                  <div key={c.criteria_id} className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{c.name}</span>
                    {c.value && <span className="text-red-400">({c.value})</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t p-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {canRequest ? 'Annuler' : 'Fermer'}
          </button>
          {canRequest && (
            <button
              onClick={handleSubmit}
              disabled={!accepted || submitting}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Soumettre la demande
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
