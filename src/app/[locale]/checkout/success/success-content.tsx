'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CheckCircle, Download, ArrowLeft, Loader2 } from 'lucide-react';

interface Skill {
  id: string;
  title: string;
  description_short: string;
  file_url: string;
  version: string;
}

export function SuccessContent() {
  const searchParams = useSearchParams();
  const t = useTranslations('CheckoutSuccess');
  const sessionId = searchParams.get('session_id');
  const skillId = searchParams.get('skill_id');
  const isFree = searchParams.get('free') === 'true';

  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPurchase() {
      try {
        // If we have a session_id, verify the payment
        if (sessionId) {
          const response = await fetch(`/api/checkout/verify?session_id=${sessionId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Verification error');
          }

          setSkill(data.skill);
        }
        // If free download, get skill info
        else if (skillId) {
          const response = await fetch(`/api/skills/${skillId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Skill not found');
          }

          setSkill(data);
        } else {
          throw new Error('Missing parameters');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    verifyPurchase();
  }, [sessionId, skillId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">{t('verifying')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="rounded-full bg-red-100 p-4 mx-auto w-fit">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">{t('errorTitle')}</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <Link
            href="/skills"
            className="mt-6 inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Success Card */}
        <div className="rounded-2xl border bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="mt-6 text-3xl font-bold text-gray-900">
            {isFree ? t('titleFree') : t('titlePaid')}
          </h1>

          <p className="mt-2 text-gray-600">
            {isFree ? t('subtitleFree') : t('subtitlePaid')}
          </p>

          {skill && (
            <div className="mt-8 rounded-xl bg-gray-50 p-6 text-left">
              <h2 className="text-lg font-semibold text-gray-900">{skill.title}</h2>
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{skill.description_short}</p>
              <p className="mt-2 text-sm text-gray-500">{t('version', { version: skill.version || '1.0.0' })}</p>
            </div>
          )}

          {skill?.file_url && (
            <a
              href={skill.file_url}
              download
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 font-semibold text-white hover:bg-blue-700"
            >
              <Download className="h-5 w-5" />
              {t('download')}
            </a>
          )}

          <div className="mt-6 space-y-2 text-sm text-gray-600">
            <p>✓ {t.rich('dashboardLink', {
              link: (chunks: React.ReactNode) => <Link href="/dashboard" className="text-blue-600 hover:underline">{chunks}</Link>
            })}</p>
            <p>✓ {t('freeUpdates')}</p>
            <p>✓ {t('creatorSupport')}</p>
            {!isFree && <p className="text-xs text-gray-400">{t('taxNote')}</p>}
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard"
            className="rounded-xl border bg-white p-6 text-center hover:border-blue-500 transition"
          >
            <span className="text-2xl">📦</span>
            <h3 className="mt-2 font-semibold text-gray-900">{t('myPurchases')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('myPurchasesDesc')}</p>
          </Link>

          <Link
            href="/skills"
            className="rounded-xl border bg-white p-6 text-center hover:border-blue-500 transition"
          >
            <span className="text-2xl">🔍</span>
            <h3 className="mt-2 font-semibold text-gray-900">{t('explore')}</h3>
            <p className="mt-1 text-sm text-gray-600">{t('exploreDesc')}</p>
          </Link>
        </div>

        {/* Installation Instructions */}
        <div className="mt-8 rounded-xl border bg-white p-6">
          <h3 className="font-semibold text-gray-900">{t('howToInstall')}</h3>
          <ol className="mt-4 space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">1</span>
              <span>{t('step1')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">2</span>
              <span>{t.rich('step2', {
                code: (chunks: React.ReactNode) => <code className="rounded bg-gray-100 px-1">{chunks}</code>
              })}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">3</span>
              <span>{t('step3')}</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
