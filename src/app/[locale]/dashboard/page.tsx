import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile } from '@/lib/ensure-profile';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Download, Star, Package, User, CreditCard, Plus, Clock, CheckCircle, XCircle, Upload, ShoppingCart, FileDown, AlertTriangle, Eye, Heart, MessageSquare, EyeOff, Ban, Wallet, CalendarClock } from 'lucide-react';
import { StarRating } from '@/components/skills/star-rating';
import { SkillActions } from '@/components/dashboard/skill-actions';
import { ReportIssueButton } from '@/components/dashboard/report-issue-button';
import { AgentInstallLink } from '@/components/dashboard/agent-install-link';
import { RefundButton } from '@/components/dashboard/refund-button';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES } from '@/types/database';

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, color: 'text-amber-600 bg-amber-100' },
  approved: { label: 'Approuve', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  published: { label: 'Publie', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  pending_payment_setup: { label: 'Paiement non configure', icon: AlertTriangle, color: 'text-amber-700 bg-amber-100' },
  certified: { label: 'Certifie', icon: CheckCircle, color: 'text-blue-600 bg-blue-100' },
  rejected: { label: 'Refuse', icon: XCircle, color: 'text-red-600 bg-red-100' },
  changes_requested: { label: 'Modifications demandees', icon: MessageSquare, color: 'text-orange-600 bg-orange-100' },
  draft: { label: 'Brouillon', icon: Clock, color: 'text-gray-600 bg-gray-100' },
  withdrawn: { label: 'Retire', icon: EyeOff, color: 'text-gray-600 bg-gray-100' },
  blocked: { label: 'Bloque', icon: Ban, color: 'text-red-700 bg-red-100' },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Ensure user profile exists (OAuth users may not have one yet)
  const profile = await ensureUserProfile(supabase, user);

  // Get purchased skills (use service client to bypass RLS on joined skills table)
  let serviceClient;
  let purchases = null;
  let userReviews = null;
  try {
    serviceClient = createServiceClient();
    const { data: purchasesData } = await serviceClient
      .from('purchases')
      .select(`
        *,
        skill:skills(
          id,
          slug,
          title,
          description_short,
          category,
          certification,
          download_count,
          file_url,
          icon_url,
          version
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    purchases = purchasesData;

    // Get user's existing reviews
    const { data: userReviewsData } = await serviceClient
      .from('reviews')
      .select('skill_id, rating')
      .eq('user_id', user.id);
    userReviews = userReviewsData;
  } catch (e) {
    console.error('Failed to create Supabase service client in DashboardPage:', e);
  }

  const reviewMap = new Map(
    (userReviews || []).map((r: { skill_id: string; rating: number }) => [r.skill_id, r.rating])
  );

  const isCreator = profile?.role === 'creator' || profile?.role === 'admin';
  const hasStripeAccount = !!profile?.stripe_account_id && profile?.stripe_onboarding_complete;

  // Get skills created by this user (if creator)
  const { data: mySkills } = isCreator ? await supabase
    .from('skills')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false }) : { data: null };

  // Recuperer les raisons de refus pour les skills rejetes ou avec modifications demandees
  const rejectedSkillIds = (mySkills || [])
    .filter(s => s.status === 'rejected' || s.status === 'changes_requested')
    .map(s => s.id);
  const rejectionReasons: Record<string, string> = {};
  if (rejectedSkillIds.length > 0 && serviceClient) {
    const { data: queueEntries } = await serviceClient
      .from('skill_validation_queue')
      .select('skill_id, rejection_reason')
      .in('skill_id', rejectedSkillIds);
    (queueEntries || []).forEach((q: { skill_id: string; rejection_reason: string | null }) => {
      if (q.rejection_reason) {
        rejectionReasons[q.skill_id] = q.rejection_reason;
      }
    });
  }

  // Calculate total downloads for creator's skills
  const totalCreatorDownloads = mySkills?.reduce((sum, skill) => sum + (skill.download_count || 0), 0) || 0;

  // Fetch purchase stats for creator's skills (purchases count + revenue per skill)
  const skillIds = (mySkills || []).map(s => s.id);
  const skillPurchaseStats: Record<string, { count: number; revenue: number }> = {};
  let totalRevenue = 0;
  let totalPurchases = 0;
  let pendingRevenue = 0;
  let eligibleRevenue = 0;
  let paidRevenue = 0;
  let pendingCount = 0;
  let eligibleCount = 0;
  if (skillIds.length > 0 && serviceClient) {
    const { data: skillPurchases } = await serviceClient
      .from('purchases')
      .select('skill_id, price_paid, payment_status, creator_amount')
      .in('skill_id', skillIds);
    (skillPurchases || []).forEach(p => {
      if (!skillPurchaseStats[p.skill_id]) {
        skillPurchaseStats[p.skill_id] = { count: 0, revenue: 0 };
      }
      skillPurchaseStats[p.skill_id].count++;
      skillPurchaseStats[p.skill_id].revenue += p.price_paid || 0;
      totalRevenue += p.price_paid || 0;
      totalPurchases++;

      const creatorAmt = p.creator_amount || Math.round((p.price_paid || 0) * 0.8);
      if (p.payment_status === 'pending') {
        pendingRevenue += creatorAmt;
        pendingCount++;
      } else if (p.payment_status === 'eligible') {
        eligibleRevenue += creatorAmt;
        eligibleCount++;
      } else if (p.payment_status === 'paid') {
        paidRevenue += creatorAmt;
      }
    });
  }

  // Date du prochain paiement (dernier jour du mois)
  const now = new Date();
  const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Bienvenue, {profile?.display_name || profile?.name || user.email?.split('@')[0]} !
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Skills achetés</p>
                <p className="text-2xl font-bold text-gray-900">{purchases?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Téléchargements</p>
                <p className="text-2xl font-bold text-gray-900">
                  {purchases?.filter(p => !p.price_paid || p.price_paid === 0).length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <p className="text-lg font-bold text-gray-900">
                  {isCreator ? 'Créateur' : 'Utilisateur'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Paiements</p>
                <p className="text-lg font-bold text-gray-900">
                  {hasStripeAccount ? '✓ Configuré' : 'Non configuré'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Creator CTA */}
        {!isCreator && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  💡 Vous créez des skills OpenClaw ?
                </h2>
                <p className="mt-1 text-gray-600">
                  Devenez créateur ClawForge et gagnez 80% de chaque vente !
                </p>
              </div>
              <Link
                href="/become-creator"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
              >
                <Plus className="h-5 w-5" />
                Devenir créateur
              </Link>
            </div>
          </div>
        )}

        {/* Creator Section - My Skills */}
        {isCreator && (
          <div className="mb-8 rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Mes skills</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {mySkills?.length || 0} skill(s) • {totalPurchases} achat(s)
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/dashboard/seller"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Dashboard vendeur
                </Link>
                <Link
                  href="/dashboard/new-skill"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <Upload className="h-4 w-4" />
                  Soumettre un skill
                </Link>
                <Link
                  href="/dashboard/agent"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Package className="h-4 w-4" />
                  API Agent
                </Link>
              </div>
            </div>

            {/* Payment Setup Alert for pending_payment_setup skills */}
            {mySkills && mySkills.some(s => s.status === 'pending_payment_setup') && (
              <div className="border-b bg-amber-50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900">PAIEMENT NON CONFIGURE</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Configurez Stripe pour activer les ventes de vos skills payants.
                    </p>
                    <div className="mt-3 space-y-2">
                      {mySkills.filter(s => s.status === 'pending_payment_setup').map(skill => (
                        <div key={skill.id} className="flex items-center gap-3 rounded-lg bg-white/70 p-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              Skill &quot;{skill.title}&quot; publie
                            </p>
                            <p className="text-xs text-gray-500">
                              <Eye className="mr-1 inline h-3 w-3" />
                              {skill.download_count || 0} vues
                              <Heart className="ml-2 mr-1 inline h-3 w-3" />
                              {skillPurchaseStats[skill.id]?.count || 0} favoris
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Ventes desactivees
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/dashboard/seller"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <CreditCard className="h-4 w-4" />
                      Configurer maintenant
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Breakdown */}
            {totalRevenue > 0 && (
              <div className="border-b p-6">
                {/* Prochain paiement */}
                {(pendingRevenue > 0 || eligibleRevenue > 0) && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CalendarClock className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Prochain paiement : {nextPayoutDate.toLocaleDateString('fr-FR')}</p>
                          <p className="text-xs text-blue-700">Montant estime : {(eligibleRevenue / 100).toFixed(2)} EUR</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600">{eligibleCount} vente(s) eligible(s)</p>
                        <p className="text-xs text-blue-600">{pendingCount} vente(s) en attente</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">Total ventes</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{totalPurchases} skill(s)</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-amber-700">En attente (15j)</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-amber-700">{(pendingRevenue / 100).toFixed(2)} EUR</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-700">Eligible au paiement</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-blue-700">{(eligibleRevenue / 100).toFixed(2)} EUR</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-xs font-medium text-green-700">Deja verse</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-green-700">{(paidRevenue / 100).toFixed(2)} EUR</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Les paiements sont verses le dernier jour du mois. Commission ClawForge : 20%.
                  </p>
                  <a
                    href="/api/export/sales"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Export CSV
                  </a>
                </div>
              </div>
            )}

            {mySkills && mySkills.length > 0 ? (
              <div className="divide-y">
                {mySkills.map((skill) => {
                  const category = SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES];
                  const cert = CERTIFICATION_BADGES[skill.certification as keyof typeof CERTIFICATION_BADGES] || CERTIFICATION_BADGES.none;
                  const status = STATUS_CONFIG[skill.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;

                  return (
                    <div key={skill.id} className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                          {skill.icon_url ? (
                            <img src={skill.icon_url} alt={skill.title} className="h-10 w-10 rounded-lg" />
                          ) : (
                            category?.emoji || '📦'
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{skill.title}</h3>
                            <span title={cert.label}>{cert.emoji}</span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {category?.label || skill.category} • v{skill.version}
                            {skill.price > 0 && ` • ${(skill.price / 100).toFixed(0)}€ TTC`}
                            {skill.price === 0 && ' • Gratuit'}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            <ShoppingCart className="mr-1 inline h-3 w-3" />
                            {skillPurchaseStats[skill.id]?.count || 0} achat(s)
                            {' • '}
                            {(((skillPurchaseStats[skill.id]?.revenue || 0) * 0.8) / 100).toFixed(2)}€ net TTC
                            {' • '}
                            Créé le {new Date(skill.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          {(skill.status === 'rejected' || skill.status === 'changes_requested') && (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                              <p className="text-xs font-medium text-red-800">
                                <XCircle className="mr-1 inline h-3 w-3" />
                                {skill.status === 'rejected' ? 'Raison du refus :' : 'Modifications demandees :'}
                              </p>
                              <p className="mt-0.5 text-xs text-red-700">
                                {skill.rejection_reason || rejectionReasons[skill.id] || 'Ce skill ne respecte pas les criteres de validation. Veuillez corriger et re-soumettre.'}
                              </p>
                              {skill.rejection_feedback && (
                                <p className="mt-1 text-xs text-blue-700">
                                  Conseils : {skill.rejection_feedback}
                                </p>
                              )}
                            </div>
                          )}
                          {skill.status === 'withdrawn' && skill.withdrawn_by === 'admin' && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="text-xs font-medium text-amber-800">
                                <EyeOff className="mr-1 inline h-3 w-3" />
                                Retire par l'administration
                              </p>
                              {skill.withdrawn_reason && (
                                <p className="mt-0.5 text-xs text-amber-700">{skill.withdrawn_reason}</p>
                              )}
                            </div>
                          )}
                          {skill.status === 'withdrawn' && skill.withdrawn_by === 'creator' && (
                            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-medium text-gray-600">
                                <EyeOff className="mr-1 inline h-3 w-3" />
                                Retire par vous
                              </p>
                            </div>
                          )}
                          {skill.status === 'blocked' && (
                            <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                              <p className="text-xs font-medium text-red-800">
                                <Ban className="mr-1 inline h-3 w-3" />
                                Bloque par l'administration
                              </p>
                              {skill.blocked_reason && (
                                <p className="mt-0.5 text-xs text-red-700">{skill.blocked_reason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                        <ReportIssueButton
                          skillId={skill.id}
                          skillTitle={skill.title}
                          skillVersion={skill.version || '1.0.0'}
                          skillStatus={skill.status}
                        />
                        <SkillActions
                          skillId={skill.id}
                          skillSlug={skill.slug || skill.id}
                          status={skill.status}
                          publishedAt={skill.published_at}
                          certifiedAt={skill.certified_at}
                          withdrawnBy={skill.withdrawn_by}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun skill</h3>
                <p className="mt-2 text-gray-500">
                  Vous n'avez pas encore soumis de skill.
                </p>
                <Link
                  href="/dashboard/new-skill"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
                >
                  <Upload className="h-5 w-5" />
                  Soumettre mon premier skill
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Purchased Skills */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-bold text-gray-900">Mes achats</h2>
            <p className="mt-1 text-sm text-gray-500">
              Skills et téléchargements gratuits
            </p>
          </div>

          {purchases && purchases.length > 0 ? (
            <div className="divide-y">
              {purchases.map((purchase) => {
                const skill = purchase.skill;
                if (!skill) return null;
                
                const category = SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES];
                const cert = CERTIFICATION_BADGES[skill.certification as keyof typeof CERTIFICATION_BADGES] || CERTIFICATION_BADGES.none;

                return (
                  <div key={purchase.id} className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                        {skill.icon_url ? (
                          <img src={skill.icon_url} alt={skill.title} className="h-10 w-10 rounded-lg" />
                        ) : (
                          category?.emoji || '📦'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{skill.title}</h3>
                          <span title={cert.label}>{cert.emoji}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {category?.label || skill.category} • v{skill.version}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {!purchase.price_paid || purchase.price_paid === 0 ? 'Gratuit' : `${(purchase.price_paid / 100).toFixed(0)}€ TTC`}
                          {' • '}
                          Acquis le {new Date(purchase.created_at).toLocaleDateString('fr-FR')}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Votre note :</span>
                          <StarRating
                            skillId={skill.id}
                            initialRating={reviewMap.get(skill.id) || 0}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        {skill.file_url && (
                          <a
                            href={skill.file_url}
                            download
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Download className="h-4 w-4" />
                            Telecharger
                          </a>
                        )}
                        <AgentInstallLink skillId={skill.id} />
                        <Link
                          href={`/skills/${skill.slug || skill.id}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          Voir →
                        </Link>
                      </div>
                      <RefundButton
                        purchaseId={purchase.id}
                        purchasedAt={purchase.purchased_at || purchase.created_at}
                        pricePaid={purchase.price_paid}
                        paymentStatus={purchase.payment_status}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun achat</h3>
              <p className="mt-2 text-gray-500">
                Vous n'avez pas encore acheté ou téléchargé de skill.
              </p>
              <Link
                href="/skills"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
              >
                Explorer le catalogue
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
