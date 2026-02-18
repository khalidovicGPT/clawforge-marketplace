import Link from 'next/link';
import { Star, ShoppingCart, User } from 'lucide-react';

const CERTIFICATION_BADGES: Record<string, { emoji: string; label: string }> = {
  bronze: { emoji: '🥉', label: 'Bronze' },
  silver: { emoji: '🥈', label: 'Silver' },
  gold: { emoji: '🥇', label: 'Gold' },
};

const CATEGORY_EMOJIS: Record<string, string> = {
  'Communication': '📧',
  'Productivité': '⚡',
  'Développement': '💻',
  'Données': '📊',
  'Intégration': '🔗',
};

interface Skill {
  id: string;
  slug: string;
  title: string;
  description_short: string | null;
  category: string;
  price: number | null;
  currency?: string;
  certification: string | null;
  download_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  purchases?: { count: number }[];
}

interface SkillCardProps {
  skill: Skill;
  creatorName?: string;
}

function formatPrice(price: number | null | undefined, currency = 'EUR'): string {
  if (!price || price === 0) return 'Gratuit';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price / 100);
}

export function SkillCard({ skill, creatorName }: SkillCardProps) {
  const categoryEmoji = CATEGORY_EMOJIS[skill.category] || '📦';
  const certification = skill.certification
    ? CERTIFICATION_BADGES[skill.certification]
    : { emoji: '📦', label: 'Standard' };

  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group flex flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl group-hover:bg-blue-50">
            {categoryEmoji}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
              {skill.title}
            </h3>
            <p className="text-sm text-gray-500">{skill.category}</p>
            {creatorName && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                <User className="h-3 w-3" />
                {creatorName}
              </p>
            )}
          </div>
        </div>

        <span className="text-xl" title={certification.label}>
          {certification.emoji}
        </span>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-sm text-gray-600">
        {skill.description_short || 'Aucune description disponible.'}
      </p>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Star className={`h-4 w-4 ${skill.rating_avg && skill.rating_avg > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          <span>
            {skill.rating_avg && skill.rating_avg > 0
              ? `${skill.rating_avg.toFixed(1)} (${skill.rating_count || 0})`
              : 'Pas de note'}
          </span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>{(skill.purchases?.[0]?.count ?? 0).toLocaleString('fr-FR')} achat(s)</span>
        </div>
      </div>

      {/* Footer: Price */}
      <div className="mt-4 flex items-center justify-end border-t pt-4">
        <span className={`font-semibold ${!skill.price || skill.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
          {formatPrice(skill.price, skill.currency)}
        </span>
      </div>
    </Link>
  );
}
