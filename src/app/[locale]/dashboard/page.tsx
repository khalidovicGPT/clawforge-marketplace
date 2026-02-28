import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { ensureUserProfile } from '@/lib/ensure-profile';
import { redirect } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Download, Star, Package, User, CreditCard, Plus, Clock, CheckCircle, XCircle, Upload, ShoppingCart, FileDown, AlertTriangle, Eye, Heart, MessageSquare, EyeOff, Ban, Wallet, CalendarClock } from 'lucide-react';
import { StarRating } from '@/components/skills/star-rating';
import { SkillActions } from '@/components/dashboard/skill-actions';
import { ReportIssueButton } from '@/components/dashboard/report-issue-button';
import { AgentInstallLink } from '@/components/dashboard/agent-install-link';
import { RefundButton } from '@/components/dashboard/refund-button';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES } from '@/types/database';
import { getTranslations, setRequestLocale } from 'next-intl/server';

const STATUS_ICONS = {
  pending: { icon: Clock, color: 'text-amber-600 bg-amber-100' },
  approved: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  published: { icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  pending_payment_setup: { icon: AlertTriangle, color: 'text-amber-700 bg-amber-100' },
  certified: { icon: CheckCircle, color: 'text-blue-600 bg-blue-100' },
  rejected: { icon: XCircle, color: 'text-red-600 bg-red-100' },
  changes_requested: { icon: MessageSquare, color: 'text-orange-600 bg-orange-100' },
  draft: { icon: Clock, color: 'text-gray-600 bg-gray-100' },
  withdrawn: { icon: EyeOff, color: 'text-gray-600 bg-gray-100' },
  blocked: { icon: Ban, color: 'text-red-700 bg-red-100' },
};

const STATUS_KEYS: Record<string, string> = {
  pending: 'pending',
  approved: 'approved',
  published: 'published',
  pending_payment_setup: 'pendingPaymentSetup',
  certified: 'certified',
  rejected: 'rejected',
  changes_requested: 'changesRequested',
  draft: 'draft',
  withdrawn: 'withdrawn',
  blocked: 'blocked',
};

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('DashboardPage');
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
  let userRefundRequests: { purchase_id: string; status: string }[] = [];
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

    // Get user's refund requests (pour afficher le statut dans le RefundButton)
    const { data: refundData } = await serviceClient
      .from('refund_requests')
      .select('purchase_id, status')
      .eq('user_id', user.id);
    userRefundRequests = refundData || [];
  } catch (e) {
    console.error('Failed to create Supabase service client in DashboardPage:', e);
  }

  const reviewMap = new Map(
    (userReviews || []).map((r: { skill_id: string; rating: number }) => [r.skill_id, r.rating])
  );

  const refundStatusMap = new Map(
    userRefundRequests.map((r) => [r.purchase_id, r.status])
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
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('welcome', { name: profile?.display_name || profile?.name || user.email?.split('@')[0] || '' })}
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
                <p className="text-sm text-gray-500">{t('stats.purchasedSkills')}</p>
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
                <p className="text-sm text-gray-500">{t('stats.downloads')}</p>
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
                <p className="text-sm text-gray-500">{t('stats.status')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {isCreator ? t('stats.creator') : t('stats.user')}
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
                <p className="text-sm text-gray-500">{t('stats.payments')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {hasStripeAccount ? `✓ ${t('stats.configured')}` : t('stats.notConfigured')}
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
                  💡 {t('creatorCta.title')}
                </h2>
                <p className="mt-1 text-gray-600">
                  {t('creatorCta.description')}
                </p>
              </div>
              <Link
                href="/become-creator"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
              >
                <Plus className="h-5 w-5" />
                {t('creatorCta.button')}
              </Link>
            </div>
          </div>
        )}

        {/* Creator Section - My Skills */}
        {isCreator && (
          <div className="mb-8 rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('mySkills.title')}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {t('mySkills.skillCount', { count: mySkills?.length || 0 })} • {t('mySkills.purchaseCount', { count: totalPurchases })}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/dashboard/seller"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4" />
                  {t('mySkills.sellerDashboard')}
                </Link>
                <Link
                  href="/dashboard/new-skill"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <Upload className="h-4 w-4" />
                  {t('mySkills.submitSkill')}
                </Link>
                <Link
                  href="/dashboard/agent"
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Package className="h-4 w-4" />
                  {t('mySkills.apiAgent')}
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
                    <h3 className="font-semibold text-amber-900">{t('paymentAlert.title')}</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      {t('paymentAlert.description')}
                    </p>
                    <div className="mt-3 space-y-2">
                      {mySkills.filter(s => s.status === 'pending_payment_setup').map(skill => (
                        <div key={skill.id} className="flex items-center gap-3 rounded-lg bg-white/70 p-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {t('paymentAlert.published', { title: skill.title })}
                            </p>
                            <p className="text-xs text-gray-500">
                              <Eye className="mr-1 inline h-3 w-3" />
                              {t('paymentAlert.views', { count: skill.download_count || 0 })}
                              <Heart className="ml-2 mr-1 inline h-3 w-3" />
                              {t('paymentAlert.favorites', { count: skillPurchaseStats[skill.id]?.count || 0 })}
                            </p>
                          </div>
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {t('paymentAlert.salesDisabled')}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/dashboard/seller"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                    >
                      <CreditCard className="h-4 w-4" />
                      {t('paymentAlert.configureNow')}
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
                          <p className="text-sm font-semibold text-blue-900">{t('revenue.nextPayout', { date: nextPayoutDate.toLocaleDateString(locale) })}</p>
                          <p className="text-xs text-blue-700">{t('revenue.estimatedAmount', { amount: (eligibleRevenue / 100).toFixed(2) })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600">{t('revenue.eligibleSales', { count: eligibleCount })}</p>
                        <p className="text-xs text-blue-600">{t('revenue.pendingSales', { count: pendingCount })}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium text-gray-500">{t('revenue.totalSales')}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{t('revenue.skillsSold', { count: totalPurchases })}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-amber-700">{t('revenue.pending15d')}</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-amber-700">{(pendingRevenue / 100).toFixed(2)} EUR</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-700">{t('revenue.eligibleForPayment')}</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-blue-700">{(eligibleRevenue / 100).toFixed(2)} EUR</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-xs font-medium text-green-700">{t('revenue.alreadyPaid')}</p>
                    </div>
                    <p className="mt-1 text-xl font-bold text-green-700">{(paidRevenue / 100).toFixed(2)} EUR</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {t('revenue.paymentNote')}
                  </p>
                  <a
                    href="/api/export/sales"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    {t('revenue.exportCSV')}
                  </a>
                </div>
              </div>
            )}

            {mySkills && mySkills.length > 0 ? (
              <div className="divide-y">
                {mySkills.map((skill) => {
                  const category = SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES];
                  const cert = CERTIFICATION_BADGES[skill.certification as keyof typeof CERTIFICATION_BADGES] || CERTIFICATION_BADGES.none;
                  const statusCfg = STATUS_ICONS[skill.status as keyof typeof STATUS_ICONS] || STATUS_ICONS.pending;
                  const StatusIcon = statusCfg.icon;
                  const statusKey = STATUS_KEYS[skill.status] || 'pending';

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
                            {skill.price > 0 && ` • ${(skill.price / 100).toFixed(0)}€ ${t('skillInfo.ttc')}`}
                            {skill.price === 0 && ` • ${t('skillInfo.free')}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            <ShoppingCart className="mr-1 inline h-3 w-3" />
                            {t('skillInfo.purchases', { count: skillPurchaseStats[skill.id]?.count || 0 })}
                            {' • '}
                            {t('skillInfo.netTtc', { amount: `${(((skillPurchaseStats[skill.id]?.revenue || 0) * 0.8) / 100).toFixed(2)}€` })}
                            {' • '}
                            {t('skillInfo.createdOn', { date: new Date(skill.created_at).toLocaleDateString(locale) })}
                          </p>
                          {(skill.status === 'rejected' || skill.status === 'changes_requested') && (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                              <p className="text-xs font-medium text-red-800">
                                <XCircle className="mr-1 inline h-3 w-3" />
                                {skill.status === 'rejected' ? t('skillInfo.rejectionReason') : t('skillInfo.changesRequested')}
                              </p>
                              <p className="mt-0.5 text-xs text-red-700">
                                {skill.rejection_reason || rejectionReasons[skill.id] || t('skillInfo.defaultRejection')}
                              </p>
                              {skill.rejection_feedback && (
                                <p className="mt-1 text-xs text-blue-700">
                                  {t('skillInfo.tips', { feedback: skill.rejection_feedback })}
                                </p>
                              )}
                            </div>
                          )}
                          {skill.status === 'withdrawn' && skill.withdrawn_by === 'admin' && (
                            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="text-xs font-medium text-amber-800">
                                <EyeOff className="mr-1 inline h-3 w-3" />
                                {t('skillInfo.withdrawnByAdmin')}
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
                                {t('skillInfo.withdrawnByYou')}
                              </p>
                            </div>
                          )}
                          {skill.status === 'blocked' && (
                            <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2">
                              <p className="text-xs font-medium text-red-800">
                                <Ban className="mr-1 inline h-3 w-3" />
                                {t('skillInfo.blockedByAdmin')}
                              </p>
                              {skill.blocked_reason && (
                                <p className="mt-0.5 text-xs text-red-700">{skill.blocked_reason}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${statusCfg.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {t(`status.${statusKey}`)}
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
                <h3 className="mt-4 text-lg font-medium text-gray-900">{t('emptySkills.title')}</h3>
                <p className="mt-2 text-gray-500">
                  {t('emptySkills.description')}
                </p>
                <Link
                  href="/dashboard/new-skill"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
                >
                  <Upload className="h-5 w-5" />
                  {t('emptySkills.submitFirst')}
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Purchased Skills */}
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-bold text-gray-900">{t('myPurchases.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {t('myPurchases.subtitle')}
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
                          {!purchase.price_paid || purchase.price_paid === 0 ? t('myPurchases.free') : t('myPurchases.ttc', { price: `${(purchase.price_paid / 100).toFixed(0)}€` })}
                          {' • '}
                          {t('myPurchases.acquiredOn', { date: new Date(purchase.created_at).toLocaleDateString(locale) })}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-500">{t('myPurchases.yourRating')}</span>
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
                            {t('myPurchases.download')}
                          </a>
                        )}
                        <AgentInstallLink skillId={skill.id} />
                        <Link
                          href={`/skills/${skill.slug || skill.id}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          {t('myPurchases.view')}
                        </Link>
                      </div>
                      <RefundButton
                        purchaseId={purchase.id}
                        purchasedAt={purchase.purchased_at || purchase.created_at}
                        pricePaid={purchase.price_paid}
                        paymentStatus={purchase.payment_status}
                        refundStatus={refundStatusMap.get(purchase.id) as 'pending' | 'approved' | 'rejected' | undefined}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">{t('emptyPurchases.title')}</h3>
              <p className="mt-2 text-gray-500">
                {t('emptyPurchases.description')}
              </p>
              <Link
                href="/skills"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
              >
                {t('emptyPurchases.exploreCatalog')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
