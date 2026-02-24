'use client';

import { CheckCircle, Lock, Clock } from 'lucide-react';

type LevelStatus = 'achieved' | 'in_progress' | 'locked';

interface CertificationLevelCardProps {
  level: 'bronze' | 'silver' | 'gold';
  status: LevelStatus;
  progress: number;
}

const LEVEL_CONFIG = {
  bronze: {
    emoji: '🥉',
    label: 'Bronze',
    bgAchieved: 'bg-amber-50 border-amber-300',
    bgProgress: 'bg-amber-50/50 border-amber-200',
    bgLocked: 'bg-gray-50 border-gray-200',
    progressColor: 'bg-amber-500',
    textColor: 'text-amber-700',
  },
  silver: {
    emoji: '🥈',
    label: 'Silver',
    bgAchieved: 'bg-slate-50 border-slate-400',
    bgProgress: 'bg-slate-50/50 border-slate-200',
    bgLocked: 'bg-gray-50 border-gray-200',
    progressColor: 'bg-slate-500',
    textColor: 'text-slate-700',
  },
  gold: {
    emoji: '🥇',
    label: 'Gold',
    bgAchieved: 'bg-yellow-50 border-yellow-400',
    bgProgress: 'bg-yellow-50/50 border-yellow-200',
    bgLocked: 'bg-gray-50 border-gray-200',
    progressColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
  },
};

export function CertificationLevelCard({ level, status, progress }: CertificationLevelCardProps) {
  const config = LEVEL_CONFIG[level];
  const bg = status === 'achieved' ? config.bgAchieved
    : status === 'in_progress' ? config.bgProgress
    : config.bgLocked;

  return (
    <div className={`rounded-xl border-2 p-5 transition-all ${bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.emoji}</span>
          <div>
            <h3 className={`text-lg font-bold ${status === 'locked' ? 'text-gray-400' : config.textColor}`}>
              {config.label}
            </h3>
            <p className="text-sm text-gray-500">
              {status === 'achieved' && 'Obtenu'}
              {status === 'in_progress' && `${progress}% complete`}
              {status === 'locked' && 'Verrouille'}
            </p>
          </div>
        </div>

        <div>
          {status === 'achieved' && (
            <CheckCircle className="h-7 w-7 text-green-500" />
          )}
          {status === 'in_progress' && (
            <Clock className={`h-7 w-7 ${config.textColor}`} />
          )}
          {status === 'locked' && (
            <Lock className="h-7 w-7 text-gray-300" />
          )}
        </div>
      </div>

      {status === 'in_progress' && (
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full ${config.progressColor} transition-all duration-500`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
