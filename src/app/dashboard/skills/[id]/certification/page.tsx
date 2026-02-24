'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  Loader2,
  XCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { CertificationLevelCard } from '@/components/dashboard/CertificationLevelCard';
import { CriteriaChecklist } from '@/components/dashboard/CriteriaChecklist';
import { RequestCertificationModal } from '@/components/dashboard/RequestCertificationModal';
import type { Certification, SkillCertificationStatus } from '@/types/database';

const SILVER_GUIDE: Record<string, string> = {
  quality_score: 'Ameliorez la documentation, ajoutez des tests et nettoyez le code pour augmenter votre score.',
  documentation_complete: 'Ajoutez un README complet avec sections : Installation, Usage, Exemples, Configuration.',
  test_coverage: 'Ecrivez des tests unitaires pour couvrir au moins 70% de votre code.',
  i18n_support: 'Ajoutez le support multi-langues avec des fichiers de traduction (en, fr minimum).',
  sales_minimum: 'Continuez a promouvoir votre skill pour atteindre 5 ventes.',
  no_critical_bugs: 'Corrigez tous les bugs critiques signales par les utilisateurs.',
  code_quality: 'Corrigez les erreurs de linting et suivez les bonnes pratiques.',
};

const GOLD_GUIDE: Record<string, string> = {
  silver_validated: 'Obtenez d\'abord la certification Silver.',
  sales_volume: 'Atteignez 50 ventes pour prouver l\'adoption de votre skill.',
  high_rating: 'Maintenez une note moyenne de 4.5/5 ou plus.',
  responsive_support: 'Repondez aux demandes de support en moins de 24 heures.',
  manual_audit: 'Un audit manuel sera effectue par l\'equipe QualityClaw.',
  use_cases_doc: 'Documentez au moins 3 cas d\'usage concrets de votre skill.',
  user_testimonials: 'Obtenez des temoignages d\'utilisateurs satisfaits.',
};

export default function SkillCertificationPage() {
  const router = useRouter();
  const params = useParams();
  const skillId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillTitle, setSkillTitle] = useState('');
  const [certification, setCertification] = useState<Certification>('none');
  const [certStatus, setCertStatus] = useState<SkillCertificationStatus | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Recuperer le skill
      const { data: skill } = await supabase
        .from('skills')
        .select('id, title, certification, creator_id')
        .eq('id', skillId)
        .single();

      if (!skill) {
        setError('Skill introuvable');
        setLoading(false);
        return;
      }

      if (skill.creator_id !== user.id) {
        // Verifier si admin
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role !== 'admin') {
          setError('Non autorise');
          setLoading(false);
          return;
        }
      }

      setSkillTitle(skill.title);
      setCertification(skill.certification as Certification);

      // Recuperer le statut de certification
      const res = await fetch(`/api/skills/${skillId}/certification-status`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Erreur ${res.status}`);
      }

      const status: SkillCertificationStatus = await res.json();
      setCertStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [skillId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getLevelStatus(current: Certification, target: 'bronze' | 'silver' | 'gold') {
    const order: Certification[] = ['none', 'bronze', 'silver', 'gold'];
    const currentIdx = order.indexOf(current);
    const targetIdx = order.indexOf(target);
    if (currentIdx >= targetIdx) return 'achieved' as const;
    if (currentIdx === targetIdx - 1) return 'in_progress' as const;
    return 'locked' as const;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h1 className="mt-4 text-xl font-bold text-red-800">{error}</h1>
          <Link href="/dashboard" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-700">
            Retour au dashboard
          </Link>
        </div>
      </div>
    );
  }

  const nextLevel = certStatus?.next_level;
  const guide = nextLevel === 'gold' ? GOLD_GUIDE : SILVER_GUIDE;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back + Header */}
        <div className="mb-6">
          <Link
            href="/dashboard/certification"
            className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour a la certification
          </Link>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{skillTitle}</h1>
                <p className="text-gray-600">
                  Niveau actuel : <strong>
                    {certification === 'none' ? 'Non certifie' :
                     certification === 'bronze' ? '🥉 Bronze' :
                     certification === 'silver' ? '🥈 Silver' : '🥇 Gold'}
                  </strong>
                  {nextLevel && (
                    <span className="ml-2">
                      • Prochain niveau : <strong>
                        {nextLevel === 'silver' ? '🥈 Silver' : '🥇 Gold'}
                      </strong>
                      {certStatus && ` (${certStatus.progress_percentage}% complete)`}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Pending request banner */}
        {certStatus?.pending_request && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="h-6 w-6 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                Demande de certification {certStatus.pending_request.requested_level === 'gold' ? 'Gold' : 'Silver'} en cours
              </p>
              <p className="text-sm text-amber-700">
                Soumise le {new Date(certStatus.pending_request.requested_at).toLocaleDateString('fr-FR')}
                — Delai estime : 2-3 jours ouvres
              </p>
            </div>
          </div>
        )}

        {/* Level cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <CertificationLevelCard
            level="bronze"
            status={getLevelStatus(certification, 'bronze')}
            progress={100}
          />
          <CertificationLevelCard
            level="silver"
            status={getLevelStatus(certification, 'silver')}
            progress={certStatus?.next_level === 'silver' ? certStatus.progress_percentage : 0}
          />
          <CertificationLevelCard
            level="gold"
            status={getLevelStatus(certification, 'gold')}
            progress={certStatus?.next_level === 'gold' ? certStatus.progress_percentage : 0}
          />
        </div>

        {/* Criteria grid */}
        {certStatus && certStatus.criteria_status.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Criteres {nextLevel === 'gold' ? 'Gold' : 'Silver'}
              </h2>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                certStatus.progress_percentage >= 100
                  ? 'bg-green-100 text-green-700'
                  : certStatus.progress_percentage >= 50
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {certStatus.progress_percentage}%
              </span>
            </div>

            <CriteriaChecklist criteria={certStatus.criteria_status} />

            {/* Request button */}
            <div className="border-t p-6">
              {certStatus.can_request_upgrade && !certStatus.pending_request ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Demander la certification {nextLevel === 'gold' ? 'Gold 🥇' : 'Silver 🥈'}
                </button>
              ) : certStatus.pending_request ? (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-amber-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Demande en cours de traitement</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-gray-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">
                    Completez tous les criteres pour debloquer la demande
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guide section */}
        {certStatus && certStatus.missing_criteria.length > 0 && (
          <div className="rounded-xl border bg-white shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                Comment passer {nextLevel === 'gold' ? 'Gold' : 'Silver'} ?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Guide etape par etape pour les criteres manquants
              </p>
            </div>

            <div className="divide-y">
              {certStatus.missing_criteria.map((criteriaName: string) => (
                <div key={criteriaName} className="px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                      ?
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{criteriaName}</p>
                      <p className="mt-1 text-sm text-gray-600">
                        {guide[criteriaName] || 'Contactez le support pour plus d\'informations.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && certStatus && nextLevel && (
        <RequestCertificationModal
          skillId={skillId}
          skillTitle={skillTitle}
          level={nextLevel as 'silver' | 'gold'}
          criteriaStatus={certStatus.criteria_status}
          canRequest={certStatus.can_request_upgrade}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setSuccessMessage('Demande de certification soumise avec succes ! Vous recevrez un email de confirmation.');
            fetchData();
          }}
        />
      )}
    </div>
  );
}
