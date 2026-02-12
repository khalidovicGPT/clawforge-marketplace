'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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
} from 'lucide-react';

type StripeStatus = 'loading' | 'complete' | 'pending' | 'no_account';

export default function SellerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>('loading');
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [skillCount, setSkillCount] = useState(0);

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

    // Auto-upgrade to creator if not already
    if (profileData && profileData.role !== 'creator' && profileData.role !== 'admin') {
      await fetch('/api/user/become-creator', { method: 'POST' });
      setProfile({ ...profileData, role: 'creator' });
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
        throw new Error(data.error || 'Erreur lors de la connexion Stripe');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      // Keep current stripeStatus (don't switch to 'error'), show inline message instead
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setStripeError(message);
      setConnectLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-4 text-gray-500">Chargement de votre espace createur...</p>
        </div>
      </div>
    );
  }

  const displayName = (profile?.display_name as string) || (profile?.email as string)?.split('@')[0] || 'Createur';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white">
          <span className="inline-block rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300">
            Espace Createur
          </span>
          <h1 className="mt-4 text-3xl font-bold">
            Bienvenue, {displayName} !
          </h1>
          <p className="mt-2 text-gray-300">
            Gerez vos skills, configurez vos paiements et suivez vos ventes.
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
              <h3 className="text-lg font-semibold text-gray-900">Creer un skill</h3>
              <p className="mt-1 text-sm text-gray-500">
                Soumettez un nouveau skill au catalogue ClawForge.
              </p>
              {stripeStatus !== 'complete' && (
                <p className="mt-1 text-xs text-amber-600">
                  Les skills gratuits sont disponibles sans Stripe.
                </p>
              )}
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                Commencer <ArrowRight className="h-4 w-4" />
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
              <h3 className="text-lg font-semibold text-gray-900">Mes skills</h3>
              <p className="mt-1 text-sm text-gray-500">
                {skillCount === 0
                  ? "Vous n'avez pas encore soumis de skill."
                  : `${skillCount} skill(s) soumis.`
                }
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-purple-600">
                Voir le dashboard <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>

        {/* Stripe Configuration Section */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-900">Configuration des paiements</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Connectez Stripe pour recevoir les paiements de vos ventes.
            </p>
          </div>

          <div className="p-6">
            {stripeStatus === 'complete' && (
              <div className="flex items-start gap-4 rounded-lg bg-green-50 p-4">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Stripe connecte</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Votre compte Stripe est configure. Vous recevrez 80% de chaque vente directement sur votre compte.
                  </p>
                </div>
              </div>
            )}

            {stripeStatus === 'pending' && (
              <div className="flex items-start gap-4 rounded-lg bg-amber-50 p-4">
                <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-900">Configuration en cours</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    Votre compte Stripe n&apos;est pas encore finalise. Completez la configuration pour recevoir des paiements.
                  </p>
                  <button
                    onClick={handleConnectStripe}
                    disabled={connectLoading}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {connectLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        Reprendre la configuration
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
                  <h3 className="font-semibold text-gray-900">Configurer mes paiements</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Pour vendre des skills payants, connectez votre compte Stripe.
                    C&apos;est securise et prend 2 minutes. ClawForge preleve 20% de commission, vous gardez 80%.
                  </p>

                  {stripeError && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        La connexion a echoue. Reessayez ou creez un skill gratuit en attendant.
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
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          Connecter mon compte Stripe
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
                        Creer un skill gratuit
                      </Link>
                    ) : (
                      <Link
                        href="/faq"
                        className="text-sm font-medium text-gray-500 hover:text-gray-700"
                      >
                        En savoir plus sur les frais
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {stripeStatus === 'loading' && (
              <div className="flex items-center gap-3 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                <p className="text-sm text-gray-500">Verification du statut Stripe...</p>
              </div>
            )}
          </div>
        </div>

        {/* Resources */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <Code className="h-5 w-5 text-blue-600" />
            <h3 className="mt-3 font-semibold text-gray-900">Documentation</h3>
            <p className="mt-1 text-sm text-gray-500">Guides pour creer des skills de qualite.</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <Zap className="h-5 w-5 text-amber-600" />
            <h3 className="mt-3 font-semibold text-gray-900">Bonnes pratiques</h3>
            <p className="mt-1 text-sm text-gray-500">Conseils pour maximiser vos ventes.</p>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="mt-3 font-semibold text-gray-900">Certification</h3>
            <p className="mt-1 text-sm text-gray-500">Obtenez un badge Bronze, Silver ou Gold.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
