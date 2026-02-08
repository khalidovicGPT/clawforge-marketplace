import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Download, Star, Package, User, CreditCard, Plus } from 'lucide-react';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES } from '@/types/database';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get purchased skills
  const { data: purchases } = await supabase
    .from('purchases')
    .select(`
      *,
      skill:skills(
        id,
        name,
        description,
        category,
        certification_level,
        download_count,
        file_url,
        icon_url,
        version
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const isCreator = profile?.role === 'creator' || profile?.role === 'admin';
  const hasStripeAccount = !!profile?.stripe_account_id && profile?.stripe_onboarding_complete;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Bienvenue, {profile?.display_name || user.email?.split('@')[0]} !
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
                  {purchases?.filter(p => p.type === 'free_download').length || 0}
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
                const cert = CERTIFICATION_BADGES[skill.certification_level as keyof typeof CERTIFICATION_BADGES] || CERTIFICATION_BADGES.none;
                
                return (
                  <div key={purchase.id} className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                        {skill.icon_url ? (
                          <img src={skill.icon_url} alt={skill.name} className="h-10 w-10 rounded-lg" />
                        ) : (
                          category?.emoji || '📦'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                          <span title={cert.label}>{cert.emoji}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {category?.label || skill.category} • v{skill.version}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {purchase.type === 'free_download' ? 'Gratuit' : `${(purchase.price_paid / 100).toFixed(0)}€`}
                          {' • '}
                          Acquis le {new Date(purchase.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {skill.file_url && (
                        <a
                          href={skill.file_url}
                          download
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4" />
                          Télécharger
                        </a>
                      )}
                      <Link
                        href={`/skills/${skill.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Voir →
                      </Link>
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
