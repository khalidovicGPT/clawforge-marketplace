'use client';

import Link from 'next/link';
import { Star, ShoppingCart, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  status?: string;
  download_count: number | null;
  rating_avg: number | null;
  rating_count: number | null;
  purchases?: { count: number }[];
}

interface SkillCardProps {
  skill: Skill;
  creatorName?: string;
}

export function SkillCard({ skill, creatorName }: SkillCardProps) {
  const t = useTranslations('SkillCard');
  const categoryEmoji = CATEGORY_EMOJIS[skill.category] || '📦';
  const certification = skill.certification
    ? CERTIFICATION_BADGES[skill.certification]
    : { emoji: '📦', label: t('standard') };

  const formatPrice = (price: number | null | undefined, currency = 'EUR'): string => {
    if (!price || price === 0) return t('free');
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(price / 100) + ' TTC';
  };

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
        {skill.description_short || t('noDescription')}
      </p>

      {/* Stats */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Star className={`h-4 w-4 ${skill.rating_avg && skill.rating_avg > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
          <span>
            {skill.rating_avg && skill.rating_avg > 0
              ? `${skill.rating_avg.toFixed(1)} (${skill.rating_count || 0})`
              : t('noRating')}
          </span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>{t('purchases', { count: (skill.purchases?.[0]?.count ?? 0).toLocaleString('fr-FR') })}</span>
        </div>
      </div>

      {/* Footer: Price */}
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        {skill.status === 'pending_payment_setup' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {t('paymentNotConfigured')}
          </span>
        )}
        <span className={`ml-auto font-semibold ${!skill.price || skill.price === 0 ? 'text-green-600' : skill.status === 'pending_payment_setup' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {formatPrice(skill.price, skill.currency)}
        </span>
      </div>
    </Link>
  );
}
