'use client';

import { useState } from 'react';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface CreatorTermsModalProps {
  onAccepted: () => void;
  onClose?: () => void;
}

export function CreatorTermsModal({ onAccepted, onClose }: CreatorTermsModalProps) {
  const t = useTranslations('CreatorTermsModal');
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
        setError(data.error || t('errorGeneric'));
      }
    } catch {
      setError(t('networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">{t('title')}</h2>
        </div>

        <div className="mt-6 max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold">{t('intro')}</p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>{t('term1Title')}</strong> — {t('term1Description')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>{t('term2Title')}</strong> — {t('term2Description')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>{t('term3Title')}</strong> — {t('term3Description')}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
              <span>
                <strong>{t('term4Title')}</strong> — {t('term4Description')}
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
              {t('later')}
            </button>
          )}
          <button
            onClick={handleAccept}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
