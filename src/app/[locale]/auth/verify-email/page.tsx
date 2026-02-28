'use client';

import { useState, Suspense } from 'react';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

function VerifyEmailContent() {
  const t = useTranslations('VerifyEmailPage');
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResent(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('resendError'));
      }

      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-8">
      <div className="text-5xl mb-4">&#9993;&#65039;</div>

      <h1 className="text-2xl font-bold text-gray-900">
        {t('title')}
      </h1>

      <p className="mt-3 text-gray-600">
        {t('sentTo')}{' '}
        {email ? (
          <strong className="text-gray-900">{email}</strong>
        ) : (
          t('yourEmail')
        )}
        .
      </p>

      <p className="mt-2 text-sm text-gray-500">
        {t('clickLink')}
      </p>

      <div className="mt-4 flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
        <span className="text-xl leading-none">&#9888;&#65039;</span>
        <p className="text-sm text-amber-800">
          <strong>{t('cantFind')}</strong>{' '}
          {t.rich('checkSpam', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {resent && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {t('resentSuccess')}
          </div>
        )}

        {email && (
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {resending
              ? t('resending')
              : resent
                ? t('resent')
                : t('resend')}
          </button>
        )}

        <Link
          href="/login"
          className="block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 text-center"
        >
          {t('goToLogin')}
        </Link>
      </div>

    </div>
  );
}

export default function VerifyEmailPage() {
  const t = useTranslations('VerifyEmailPage');
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <Suspense fallback={<div className="text-gray-500">{t('loading')}</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
