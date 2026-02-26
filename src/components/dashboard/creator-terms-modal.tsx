'use client';

import { useState } from 'react';
import { Loader2, FileText, CheckCircle } from 'lucide-react';

interface CreatorTermsModalProps {
  onAccepted: () => void;
  onClose?: () => void;
}

export function CreatorTermsModal({ onAccepted, onClose }: CreatorTermsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/creator/accept-terms', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        onAccepted();
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur reseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Conditions Generales Createur</h2>
        </div>

        <div className="mt-6 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold">En devenant createur sur ClawForge, vous acceptez :</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>Delai de protection de 15 jours minimum</strong> — Les acheteurs disposent
                d'une periode de 15 jours apres l'achat pour demander un remboursement.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>Paiements mensuels le dernier jour du mois</strong> — Vos revenus sont
                verses en une fois, le dernier jour de chaque mois, pour tous les achats
                eligibles (ayant depasse le delai de 15 jours).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>Annulation en cas de remboursement</strong> — Si un acheteur obtient un
                remboursement dans les 15 jours, la vente est annulee et ne sera pas incluse
                dans votre versement.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>Commission ClawForge de 20%</strong> — La plateforme retient 20% de chaque
                vente. Vous recevez 80% du montant TTC.
              </span>
            </li>
          </ul>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Plus tard
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            J'accepte les conditions
          </button>
        </div>
      </div>
    </div>
  );
}
