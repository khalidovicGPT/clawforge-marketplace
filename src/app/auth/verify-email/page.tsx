'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
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
        throw new Error(data.error || 'Erreur lors du renvoi');
      }

      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-xl border shadow-sm p-8">
          <div className="text-5xl mb-4">&#9993;&#65039;</div>

          <h1 className="text-2xl font-bold text-gray-900">
            Vérifiez votre email
          </h1>

          <p className="mt-3 text-gray-600">
            Un lien d&apos;activation a été envoyé à{' '}
            {email ? (
              <strong className="text-gray-900">{email}</strong>
            ) : (
              'votre adresse email'
            )}
            .
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Cliquez sur le lien dans l&apos;email pour activer votre compte. Le
            lien est valable 24&nbsp;heures.
          </p>

          <div className="mt-6 space-y-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            {resent && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Email renvoyé avec succès !
              </div>
            )}

            {email && (
              <button
                onClick={handleResend}
                disabled={resending || resent}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {resending
                  ? 'Envoi en cours...'
                  : resent
                    ? 'Email renvoyé'
                    : 'Renvoyer l\'email'}
              </button>
            )}

            <Link
              href="/login"
              className="block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Aller à la connexion
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            Pensez à vérifier vos spams si vous ne trouvez pas l&apos;email.
          </p>
        </div>
      </div>
    </div>
  );
}
