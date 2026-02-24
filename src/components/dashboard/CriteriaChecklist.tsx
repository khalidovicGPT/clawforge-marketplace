'use client';

import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import type { CriteriaStatus } from '@/types/database';

interface CriteriaChecklistProps {
  criteria: CriteriaStatus[];
}

const STATUS_ICON = {
  passed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Valide' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Non rempli' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', label: 'En attente' },
};

const CRITERIA_LABELS: Record<string, string> = {
  quality_score: 'Score qualite >= 80%',
  documentation_complete: 'README complet + API docs',
  test_coverage: 'Couverture de tests >= 70%',
  i18n_support: 'Support multi-langues (i18n)',
  sales_minimum: '5 ventes reussies minimum',
  no_critical_bugs: 'Aucun bug critique (30 jours)',
  code_quality: 'Linting sans erreurs critiques',
  silver_validated: 'Certification Silver obtenue',
  sales_volume: '50+ ventes reussies',
  high_rating: 'Note moyenne >= 4.5/5',
  responsive_support: 'Support reactif (< 24h)',
  manual_audit: 'Audit manuel du code valide',
  use_cases_doc: 'Cas d\'usage documentes',
  user_testimonials: 'Temoignages utilisateurs',
  code_review: 'Code review basique effectue',
  documentation: 'Documentation minimale presente',
  basic_tests: 'Tests automatiques basiques',
  security_scan: 'Scan de securite passe',
};

export function CriteriaChecklist({ criteria }: CriteriaChecklistProps) {
  if (criteria.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        Aucun critere a afficher
      </div>
    );
  }

  return (
    <div className="divide-y">
      {criteria.map((c) => {
        const statusConfig = STATUS_ICON[c.status];
        const Icon = statusConfig.icon;
        const label = CRITERIA_LABELS[c.name] || c.description || c.name;

        return (
          <div key={c.criteria_id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${statusConfig.bg}`}>
                <Icon className={`h-4 w-4 ${statusConfig.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {c.value && (
                  <p className="text-xs text-gray-500">{c.value}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                {c.auto_checkable ? 'Auto' : 'Manuel'}
              </span>
              {c.status === 'failed' && !c.auto_checkable && (
                <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                  <ExternalLink className="h-3 w-3" />
                  Guide
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
