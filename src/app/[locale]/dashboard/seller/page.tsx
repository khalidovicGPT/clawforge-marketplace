'use client';

import { useState, useEffect } from 'react';
import { useRouter, Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import {
  Upload,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Code,
  Zap,
  ArrowRight,
  Loader2,
  ExternalLink,
  Package,
  Plus,
  FileText,
  CalendarClock,
  Wallet,
  Clock,
} from 'lucide-react';
import { CreatorTermsModal } from '@/components/dashboard/creator-terms-modal';

type StripeStatus = 'loading' | 'complete' | 'pending' | 'no_account';

export default function SellerDashboardPage() {
  const router = useRouter();
  const t = useTranslations('SellerDashboardPage');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>('loading');
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [skillCount, setSkillCount] = useState(0);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [payoutSummary, setPayoutSummary] = useState<{
    pending: { count: number; amount: number };
    eligible: { count: number; amount: number };
    next_payout_date: string;
    next_payout_estimated: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login?redirect=/dashboard/seller');
      return;
    }

    // Get profile
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profileData);
    setTermsAccepted(!!profileData?.creator_terms_accepted_at);

    // Auto-upgrade to creator if not already
    if (profileData && profileData.role !== 'creator' && profileData.role !== 'admin') {
      await fetch('/api/user/become-creator', { method: 'POST' });
      setProfile({ ...profileData, role: 'creator' });
    }

    // Charger le résumé des payouts
    try {
      const payoutRes = await fetch('/api/creator/payouts');
      if (payoutRes.ok) {
        const payoutData = await payoutRes.json();
        setPayoutSummary(payoutData.summary);
      }
    } catch {
      // Pas critique
    }

    // Count skills
    const { count } = await supabase
      .from('skills')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', user.id);

    setSkillCount(count || 0);

    // Determine Stripe status from profile data (no API call if no account)
    const stripeId = profileData?.stripe_account_id as string | null;
    const hasStripeAccount = stripeId && stripeId.startsWith('acct_');

    if (!hasStripeAccount) {
      // No Stripe account in DB → simple "not configured" state, no API call needed
      setStripeStatus('no_account');
    } else if (profileData?.stripe_onboarding_complete) {
      setStripeStatus('complete');
    } else {
      // Has account but not complete → check with Stripe API
      try {
        const res = await fetch('/api/stripe/connect/status');
        const data = await res.json();
        if (data.error) {
          // API error while checking existing account → show pending (not error)
          setStripeStatus('pending');
        } else {
          setStripeStatus(data.status);
        }
      } catch {
        setStripeStatus('pending');
      }
    }

    setLoading(false);
  }

  async function handleConnectStripe() {
    setConnectLoading(true);
    setStripeError(null);

    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('stripeError'));
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      // Keep current stripeStatus (don't switch to 'error'), show inline message instead
      const message = err instanceof Error ? err.message : t('unknownError');
      setStripeError(message);
      setConnectLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-4 text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const displayName = (profile?.name as string) || (profile?.email as string)?.split('@')[0] || 'Createur';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white">
          <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300">
            {t('creatorSpace')}
          </span>
          <h1 className="mt-4 text-3xl font-bold">
            {t('welcome', { name: displayName })}
          </h1>
          <p className="mt-2 text-gray-300">
            {t('subtitle')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          {/* Create Skill Card - Always available */}
          <Link
            href="/dashboard/new-skill"
            className="group flex items-start gap-4 rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-200">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('createSkill')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('createSkillDescription')}
              </p>
              {stripeStatus !== 'complete' && (
                <p className="mt-1 text-xs text-amber-600">
                  {t('freeSkillsAvailable')}
                </p>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                {t('start')} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* My Skills Card */}
          <Link
            href="/dashboard"
            className="group flex items-start gap-4 rounded-xl border bg-white p-6 transition-all hover:shadow-md"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('mySkills')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {skillCount === 0
                  ? t('noSkillsYet')
                  : t('skillsSubmitted', { count: skillCount })
                }
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-600">
                {t('viewDashboard')} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>

        {/* Stripe Configuration Section */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">{t('paymentConfig')}</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {t('paymentConfigDescription')}
            </p>
          </div>

          <div className="p-6">
            {stripeStatus === 'complete' && (
              <div className="flex items-start gap-4 rounded-lg bg-green-50 p-4">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">{t('stripeConnected')}</h3>
                  <p className="mt-1 text-sm text-green-700">
                    {t('stripeConnectedDescription')}
                  </p>
                </div>
              </div>
            )}

            {stripeStatus === 'pending' && (
              <div className="flex items-start gap-4 rounded-lg bg-amber-50 p-4">
                <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">{t('configInProgress')}</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    {t('configInProgressDescription')}
                  </p>
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectLoading}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {connectLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('connecting')}
                      </>
                    ) : (
                      <>
                        {t('resumeConfig')}
                        <ExternalLink className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {stripeStatus === 'no_account' && (
              <div className="flex items-start gap-4 rounded-lg bg-blue-50 p-4">
                <CreditCard className="h-6 w-6 flex-shrink-0 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">{t('configurePayments')}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {t('configurePaymentsDescription')}
                  </p>

                  {stripeError && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {t('connectionFailed')}
                      </div>
                      <p className="mt-1 pl-6 text-xs text-amber-600">{stripeError}</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleConnectStripe}
                      disabled={connectLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {connectLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('connecting')}
                        </>
                      ) : (
                        <>
                          {t('connectStripe')}
                          <ExternalLink className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    {stripeError ? (
                      <Link
                        href="/dashboard/new-skill"
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                        {t('createFreeSkill')}
                      </Link>
                    ) : (
                      <Link
                        href="/faq"
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        {t('learnMoreFees')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stripeStatus === 'loading' && (
              <div className="flex items-center gap-3 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">{t('checkingStripe')}</p>
              </div>
            )}
          </div>
        </div>

        {/* CGV Créateur */}
        {!termsAccepted && stripeStatus === 'complete' && (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-4">
              <FileText className="h-6 w-6 flex-shrink-0 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">{t('newCreatorTerms')}</h3>
                <p className="mt-1 text-sm text-amber-700">
                  {t('newCreatorTermsDescription')}
                </p>
                <button
                  onClick={() => setShowTermsModal(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  <FileText className="h-4 w-4" />
                  {t('consultAndAccept')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Résumé des revenus */}
        {stripeStatus === 'complete' && payoutSummary && (
          <div className="mt-8 rounded-xl border bg-white shadow-sm">
            <div className="border-b p-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">{t('revenue')}</h2>
              </div>
            </div>
            <div className="p-6">
              {/* Prochain paiement */}
              <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {t('nextPayout', { date: new Date(payoutSummary.next_payout_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) })}
                    </p>
                    <p className="text-xs text-blue-700">
                      {t('estimatedAmount', { amount: (payoutSummary.next_payout_estimated / 100).toFixed(2) })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-amber-50 p-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                    <p className="text-xs font-medium text-amber-700">{t('pending15d')}</p>
                  </div>
                  <p className="mt-1 text-xl font-bold text-amber-700">
                    {(payoutSummary.pending.amount / 100).toFixed(2)} EUR
                  </p>
                  <p className="text-xs text-amber-600">{payoutSummary.pending.count} {t('sales')}</p>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    <p className="text-xs font-medium text-green-700">{t('eligibleForPayment')}</p>
                  </div>
                  <p className="mt-1 text-xl font-bold text-green-700">
                    {(payoutSummary.eligible.amount / 100).toFixed(2)} EUR
                  </p>
                  <p className="text-xs text-green-600">{payoutSummary.eligible.count} {t('sales')}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                {t('paymentNote')}
              </p>
            </div>
          </div>
        )}

        {showTermsModal && (
          <CreatorTermsModal
            onAccepted={() => {
              setShowTermsModal(false);
              setTermsAccepted(true);
            }}
            onClose={() => setShowTermsModal(false)}
          />
        )}

        {/* Resources */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <Code className="h-5 w-5 text-blue-600" />
            <h3 className="mt-3 font-semibold text-gray-900">{t('documentation')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('documentationDescription')}</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <Zap className="h-5 w-5 text-amber-600" />
            <h3 className="mt-3 font-semibold text-gray-900">{t('bestPractices')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('bestPracticesDescription')}</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="mt-3 font-semibold text-gray-900">{t('certification')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('certificationDescription')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
