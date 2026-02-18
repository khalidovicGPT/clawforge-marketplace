import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/service';
import { ArrowLeft, Package, Download, Star, ShoppingCart } from 'lucide-react';
import { SkillCard } from '@/components/skills/skill-card';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: creator } = await supabase
    .from('users')
    .select('display_name, name')
    .eq('id', id)
    .single();

  const name = creator?.display_name || creator?.name || 'Createur';

  return {
    title: `${name} — Createur ClawForge`,
    description: `Decouvrez les skills publies par ${name} sur ClawForge Marketplace.`,
  };
}

export default async function CreatorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch creator profile
  const { data: creator, error } = await supabase
    .from('users')
    .select('id, display_name, name, avatar_url, created_at')
    .eq('id', id)
    .single();

  if (error || !creator) {
    notFound();
  }

  const creatorName = creator.display_name || creator.name || 'Createur anonyme';

  // Fetch creator's published skills with purchase counts
  const { data: skills } = await supabase
    .from('skills')
    .select('*, purchases(count)')
    .eq('creator_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  // Compute aggregate stats
  const totalSkills = skills?.length || 0;
  const totalDownloads = (skills || []).reduce((sum, s) => sum + (s.download_count || 0), 0);
  const totalPurchases = (skills || []).reduce((sum, s) => {
    const count = (s as Record<string, unknown>).purchases
      ? ((s as Record<string, unknown>).purchases as { count: number }[])?.[0]?.count ?? 0
      : 0;
    return sum + count;
  }, 0);
  const ratedSkills = (skills || []).filter(s => s.rating_avg && s.rating_avg > 0);
  const avgRating = ratedSkills.length > 0
    ? ratedSkills.reduce((sum, s) => sum + s.rating_avg, 0) / ratedSkills.length
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/creators"
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux createurs
        </Link>

        {/* Creator Header */}
        <div className="mb-8 rounded-xl border bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-blue-100 text-4xl">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creatorName}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <span>{creatorName[0].toUpperCase()}</span>
              )}
            </div>

            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{creatorName}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Membre depuis {new Date(creator.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </p>

              {/* Stats */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span><strong>{totalSkills}</strong> skill{totalSkills > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-green-500" />
                  <span><strong>{totalPurchases.toLocaleString('fr-FR')}</strong> achat{totalPurchases > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Download className="h-4 w-4 text-purple-500" />
                  <span><strong>{totalDownloads.toLocaleString('fr-FR')}</strong> telechargement{totalDownloads > 1 ? 's' : ''}</span>
                </div>
                {avgRating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span><strong>{avgRating.toFixed(1)}</strong> note moyenne</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Skills de {creatorName}
        </h2>

        {skills && skills.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun skill publie</h3>
            <p className="mt-2 text-gray-500">
              Ce createur n'a pas encore publie de skill.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
