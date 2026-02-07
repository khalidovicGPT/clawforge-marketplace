import Link from 'next/link';
import { Star } from 'lucide-react';
import { SKILL_CATEGORIES, CERTIFICATION_BADGES, type SkillWithCreator } from '@/types/database';
import { formatPrice, formatNumber } from '@/lib/utils';

interface SkillCardProps {
  skill: SkillWithCreator;
}

export function SkillCard({ skill }: SkillCardProps) {
  const category = SKILL_CATEGORIES[skill.category as keyof typeof SKILL_CATEGORIES];
  const certification = CERTIFICATION_BADGES[skill.certification];

  return (
    <Link
      href={`/skills/${skill.slug}`}
      className="group flex flex-col rounded-xl border bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl group-hover:bg-blue-50">
            {skill.icon_url ? (
              <img
                src={skill.icon_url}
                alt={skill.title}
                className="h-8 w-8 rounded"
              />
            ) : (
              category?.emoji || '📦'
            )}
          </div>
          
          {/* Title & Category */}
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
              {skill.title}
            </h3>
            <p className="text-sm text-gray-500">{category?.label || skill.category}</p>
          </div>
        </div>
        
        {/* Certification Badge */}
        <span className="text-xl" title={certification.label}>
          {certification.emoji}
        </span>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-sm text-gray-600">
        {skill.description_short}
      </p>

      {/* Stats */}
      <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
        {skill.rating_avg && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{skill.rating_avg.toFixed(1)}</span>
          </div>
        )}
        <span>•</span>
        <span>{formatNumber(skill.downloads_count)} téléchargements</span>
      </div>

      {/* Footer: Creator & Price */}
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          {skill.creator.avatar_url ? (
            <img
              src={skill.creator.avatar_url}
              alt={skill.creator.display_name || 'Créateur'}
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
              {skill.creator.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span className="text-sm text-gray-600">
            {skill.creator.display_name || 'Anonyme'}
          </span>
        </div>
        
        <span className={`font-semibold ${skill.price_type === 'free' ? 'text-green-600' : 'text-gray-900'}`}>
          {formatPrice(skill.price)}
        </span>
      </div>
    </Link>
  );
}
