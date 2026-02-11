import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  Download, 
  Users,
  ArrowLeft,
  CreditCard,
  ExternalLink
} from 'lucide-react';

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/dashboard/seller');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const isCreator = profile?.role === 'creator' || profile?.role === 'admin';
  
  if (!isCreator) {
    redirect('/become-creator');
  }

  const hasStripeAccount = !!profile?.stripe_account_id && profile?.stripe_account_id !== 'pending';

  // Get seller's skills
  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  // Get sales data for creator's skills
  const skillIds = skills?.map(s => s.id) || [];
  
  const { data: sales } = skillIds.length > 0 ? await supabase
    .from('purchases')
    .select(`
      *,
      skill:skills(id, name, icon_url, category)
    `)
    .in('skill_id', skillIds)
    .eq('type', 'purchase')
    .order('purchased_at', { ascending: false })
    : { data: [] };

  // Calculate stats
  const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.price_paid || 0), 0) || 0;
  const totalSales = sales?.length || 0;
  const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  
  // Group sales by skill
  const salesBySkill = skills?.map(skill => {
    const skillSales = sales?.filter(s => s.skill_id === skill.id) || [];
    const revenue = skillSales.reduce((sum, s) => sum + (s.price_paid || 0), 0);
    return {
      ...skill,
      sales: skillSales.length,
      revenue,
      downloads: skill.downloads_count || 0
    };
  }) || [];

  // Recent sales (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentSales = sales?.filter(s => 
    new Date(s.purchased_at) > sevenDaysAgo
  ) || [];
  
  const recentRevenue = recentSales.reduce((sum, s) => sum + (s.price_paid || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Track your sales, revenue, and performance
          </p>
        </div>

        {/* Stripe Alert */}
        {!hasStripeAccount && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">
                  Payment account not configured
                </h3>
                <p className="mt-1 text-sm text-amber-700">
                  You need to complete your Stripe onboarding to receive payments.
                </p>
                <Link
                  href="/api/stripe/connect/onboard"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Complete Setup
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{(totalRevenue / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{(averageOrderValue / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Download className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Downloads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skills?.reduce((sum, s) => sum + (s.downloads_count || 0), 0) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Last 7 Days */}
        <div className="mb-8 rounded-xl border bg-gradient-to-r from-blue-50 to-purple-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Last 7 Days</h2>
              <p className="text-sm text-gray-500">Performance overview</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">
                €{(recentRevenue / 100).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                {recentSales.length} sale{recentSales.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Skills Performance */}
          <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-bold text-gray-900">Skills Performance</h2>
              <p className="mt-1 text-sm text-gray-500">
                Revenue and sales by skill
              </p>
            </div>

            {salesBySkill.length > 0 ? (
              <div className="divide-y">
                {salesBySkill.map((skill) => (
                  <div key={skill.id} className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl">
                        {skill.icon_url ? (
                          <img src={skill.icon_url} alt={skill.name} className="h-8 w-8 rounded-lg" />
                        ) : (
                          '📦'
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                        <p className="text-sm text-gray-500">
                          {skill.category} • v{skill.version}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="text-lg font-bold text-gray-900">
                          €{(skill.revenue / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{skill.sales}</p>
                        <p className="text-xs text-gray-500">Sales</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{skill.downloads}</p>
                        <p className="text-xs text-gray-500">Downloads</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Skills Yet</h3>
                <p className="mt-2 text-gray-500">
                  Submit your first skill to start earning
                </p>
                <Link
                  href="/dashboard/new-skill"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800"
                >
                  Submit a Skill
                </Link>
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Sales</h2>
              <p className="mt-1 text-sm text-gray-500">
                Last {sales?.slice(0, 10).length || 0} transactions
              </p>
            </div>

            {sales && sales.length > 0 ? (
              <div className="divide-y">
                {sales.slice(0, 10).map((sale) => (
                  <div key={sale.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                          {sale.skill?.icon_url ? (
                            <img src={sale.skill.icon_url} alt="" className="h-6 w-6 rounded" />
                          ) : (
                            '📦'
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {sale.skill?.name || 'Unknown Skill'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sale.purchased_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-green-600">
                        +€{(sale.price_paid / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <ShoppingCart className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-gray-500">No sales yet</p>
                <p className="text-sm text-gray-400">
                  Sales will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payout Info */}
        {hasStripeAccount && (
          <div className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payout Account</h3>
                <p className="text-sm text-gray-500">
                  Connected to Stripe • You receive 80% of each sale
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
