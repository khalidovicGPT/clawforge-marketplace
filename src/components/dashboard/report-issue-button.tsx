'use client';

import { useState } from 'react';
import { Loader2, X, Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReportIssueButtonProps {
  skillId: string;
  skillTitle: string;
  skillVersion: string;
  skillStatus: string;
}

const REPORT_TYPE_KEYS = ['falsePositive', 'systemBug', 'unclearError', 'other'] as const;
const REPORT_TYPE_VALUES = ['false_positive', 'system_bug', 'unclear_error', 'other'];

export function ReportIssueButton({ skillId, skillTitle, skillVersion, skillStatus }: ReportIssueButtonProps) {
  const t = useTranslations('ReportIssueButton');
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async () => {
    if (!reportType || description.trim().length < 50) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/skills/${skillId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: reportType,
          description: description.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({ type: 'error', message: data.error || t('error') });
        return;
      }

      setResult({ type: 'success', message: data.message || t('reportSent') });
      setTimeout(() => {
        setShowModal(false);
        setReportType('');
        setDescription('');
        setResult(null);
      }, 3000);
    } catch {
      setResult({ type: 'error', message: t('networkError') });
    } finally {
      setLoading(false);
    }
  };

  // N'afficher le bouton que pour les skills rejetes, en attente, ou avec modifications demandees
  const showButton = ['rejected', 'pending', 'changes_requested'].includes(skillStatus);
  if (!showButton) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
      >
        <Flag className="h-3.5 w-3.5" />
        {t('button')}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('modalTitle')}</h3>
              <button
                onClick={() => { setShowModal(false); setResult(null); }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">{skillTitle} v{skillVersion}</p>
              <p className="text-xs text-gray-500">{t('status', { status: skillStatus })}</p>
            </div>

            {result ? (
              <div className={`rounded-lg p-4 text-center ${
                result.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}>
                <p className="text-sm font-medium">{result.message}</p>
              </div>
            ) : (
              <>
                {/* Type de probleme */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    {t('typeLabel')}
                  </label>
                  <div className="space-y-2">
                    {REPORT_TYPE_KEYS.map((key, idx) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="report_type"
                          value={REPORT_TYPE_VALUES[idx]}
                          checked={reportType === REPORT_TYPE_VALUES[idx]}
                          onChange={(e) => setReportType(e.target.value)}
                          className="h-4 w-4 border-gray-300 text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{t(`types.${key}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    {t('descriptionLabel')} <span className="text-xs text-gray-400">{t('descriptionHint')}</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('placeholder')}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    {t('charCount', { count: description.length })}
                  </p>
                </div>

                {/* Boutons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => { setShowModal(false); setResult(null); }}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !reportType || description.trim().length < 50}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('submit')
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
