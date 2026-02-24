'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Loader2,
  XCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { CertificationLevelCard } from '@/components/dashboard/CertificationLevelCard';
import type { Certification } from '@/types/database';

interface SkillCertData {
  id: string;
  title: string;
  slug: string;
  certification: Certification;
  quality_score: number;
  sales_count: number;
  average_rating: number;
}

export default function CertificationDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<SkillCertData[]>([]);
  const [isCreator, setIsCreator] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?redirect=/dashboard/certification');
      return;
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'creator' && profile?.role !== 'admin') {
      setIsCreator(false);
      setLoading(false);
      return;
    }
    setIsCreator(true);

    const { data: mySkills } = await supabase
      .from('skills')
      .select('id, title, slug, certification, quality_score, sales_count, average_rating')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    setSkills(mySkills || []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-red-800">Acces reserve aux createurs</h1>
          <p className="mt-2 text-red-600">
            Devenez createur pour acceder au dashboard de certification.
          </p>
          <Link
            href="/become-creator"
            className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Devenir createur
          </Link>
        </div>
      </div>
    );
  }

  function getLevelStatus(certification: Certification, targetLevel: 'bronze' | 'silver' | 'gold') {
    const order: Certification[] = ['none', 'bronze', 'silver', 'gold'];
    const currentIdx = order.indexOf(certification);
    const targetIdx = order.indexOf(targetLevel);

    if (currentIdx >= targetIdx) return 'achieved' as const;
    if (currentIdx === targetIdx - 1) return 'in_progress' as const;
    return 'locked' as const;
  }

  function getProgress(skill: SkillCertData, targetLevel: 'silver' | 'gold') {
    if (targetLevel === 'silver') {
      const checks = [
        skill.quality_score >= 80,
        skill.quality_score >= 60,    // docs
        skill.quality_score >= 70,    // tests
        skill.sales_count >= 5,
        true,                         // no critical bugs
        skill.quality_score >= 60,    // code quality
      ];
      const autoPassable = checks.filter(Boolean).length;
      return Math.round((autoPassable / 7) * 100); // 7 criteres Silver total
    }
    // Gold
    const checks = [
      skill.certification === 'silver',
      skill.sales_count >= 50,
      skill.average_rating >= 4.5,
    ];
    const autoPassable = checks.filter(Boolean).length;
    return Math.round((autoPassable / 7) * 100); // 7 criteres Gold total
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Certification</h1>
              <p className="mt-1 text-gray-600">
                Suivez la progression de vos skills vers Silver et Gold
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Rafraichir
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
            <Shield className="mx-auto h-12 w-12 text-gray-300" />
            <h2 className="mt-4 text-lg font-bold text-gray-900">Aucun skill</h2>
            <p className="mt-2 text-gray-500">
              Soumettez un skill pour commencer le processus de certification.
            </p>
            <Link
              href="/dashboard/new-skill"
              className="mt-4 inline-block rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Soumettre un skill
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {skills.map((skill: SkillCertData) => {
              const nextLevel = skill.certification === 'bronze' ? 'silver'
                : skill.certification === 'silver' ? 'gold'
                : null;

              return (
                <div key={skill.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  {/* Skill header */}
                  <div className="flex items-center justify-between border-b p-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{skill.title}</h2>
                      <p className="text-sm text-gray-500">
                        Score qualite : {skill.quality_score}/100 • {skill.sales_count} vente(s)
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/skills/${skill.id}/certification`}
                      className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                      Voir les details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  {/* Level cards */}
                  <div className="grid gap-4 p-6 sm:grid-cols-3">
                    <CertificationLevelCard
                      level="bronze"
                      status={getLevelStatus(skill.certification, 'bronze')}
                      progress={100}
                    />
                    <CertificationLevelCard
                      level="silver"
                      status={getLevelStatus(skill.certification, 'silver')}
                      progress={getLevelStatus(skill.certification, 'silver') === 'in_progress'
                        ? getProgress(skill, 'silver')
                        : 0}
                    />
                    <CertificationLevelCard
                      level="gold"
                      status={getLevelStatus(skill.certification, 'gold')}
                      progress={getLevelStatus(skill.certification, 'gold') === 'in_progress'
                        ? getProgress(skill, 'gold')
                        : 0}
                    />
                  </div>

                  {/* Next step CTA */}
                  {nextLevel && (
                    <div className="border-t bg-gray-50 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Prochain objectif : <strong>{nextLevel === 'gold' ? 'Gold 🥇' : 'Silver 🥈'}</strong>
                        </p>
                        <Link
                          href={`/dashboard/skills/${skill.id}/certification`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          Voir les criteres →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
