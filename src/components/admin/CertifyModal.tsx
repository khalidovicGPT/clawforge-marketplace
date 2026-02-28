'use client';

import { useState } from 'react';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

type CertificationLevel = 'bronze' | 'silver' | 'gold' | 'rejected';

interface CertifyModalProps {
  skill: {
    id: string;
    title: string;
    status: string;
    certification: string;
  };
  onClose: () => void;
  onCertify: (skillId: string, certification: CertificationLevel, comment?: string) => Promise<void>;
}

export function CertifyModal({ skill, onClose, onCertify }: CertifyModalProps) {
  const t = useTranslations('CertifyModal');
  const [selected, setSelected] = useState<CertificationLevel | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const CERT_OPTIONS: { value: CertificationLevel; label: string; emoji: string; description: string; color: string }[] = [
    {
      value: 'bronze',
      label: 'Bronze',
      emoji: '🥉',
      description: t('bronzeDesc'),
      color: 'border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-800',
    },
    {
      value: 'silver',
      label: 'Silver',
      emoji: '🥈',
      description: t('silverDesc'),
      color: 'border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-800',
    },
    {
      value: 'gold',
      label: 'Gold',
      emoji: '🥇',
      description: t('goldDesc'),
      color: 'border-yellow-400 bg-yellow-50 hover:bg-yellow-100 text-yellow-800',
    },
    {
      value: 'rejected',
      label: t('rejectedLabel'),
      emoji: '❌',
      description: t('rejectedDesc'),
      color: 'border-red-400 bg-red-50 hover:bg-red-100 text-red-800',
    },
  ];

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await onCertify(skill.id, selected, comment || undefined);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">{t('title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Skill info */}
        <div className="border-b bg-gray-50 px-6 py-4">
          <p className="text-sm text-gray-500">{t('skillToCertify')}</p>
          <p className="font-semibold text-gray-900">{skill.title}</p>
        </div>

        {/* Certification options */}
        <div className="space-y-3 p-6">
          <p className="text-sm font-medium text-gray-700">{t('certLevel')}</p>
          <div className="grid grid-cols-2 gap-3">
            {CERT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSelected(opt.value);
                  setConfirmOpen(false);
                }}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition ${
                  selected === opt.value
                    ? opt.color + ' ring-2 ring-offset-1 ring-blue-500'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className="text-center text-xs text-gray-500">{opt.description}</span>
              </button>
            ))}
          </div>

          {/* Comment */}
          <div className="mt-4">
            <label htmlFor="cert-comment" className="mb-1 block text-sm font-medium text-gray-700">
              {t('commentLabel')}
            </label>
            <textarea
              id="cert-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={t('commentPlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t p-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('cancel')}
          </button>

          {!confirmOpen ? (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!selected || loading}
              className="rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('submit')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-600">{t('confirm')}</span>
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                {t('no')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('processing') : t('yesConfirm')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
