'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag, Code } from 'lucide-react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const USER_FAQ: FAQItem[] = [
  {
    question: "Comment installer un skill ?",
    answer: (
      <>
        <p>L'installation est simple :</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Téléchargez le fichier ZIP depuis votre dashboard</li>
          <li>Extrayez le contenu dans le dossier <code className="rounded bg-gray-100 px-1">skills/</code> de votre agent OpenClaw</li>
          <li>Redémarrez votre agent — le skill est automatiquement détecté</li>
        </ol>
        <p className="mt-2">
          Consultez la documentation du skill pour les configurations spécifiques.
        </p>
      </>
    ),
  },
  {
    question: "Comment fonctionne le paiement ?",
    answer: (
      <>
        <p>Les paiements sont sécurisés via Stripe. Nous acceptons :</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Cartes bancaires (Visa, Mastercard, American Express)</li>
          <li>Apple Pay et Google Pay (selon votre appareil)</li>
        </ul>
        <p className="mt-2">
          Après paiement, vous recevez immédiatement l'accès au téléchargement dans votre dashboard.
        </p>
      </>
    ),
  },
  {
    question: "Puis-je demander un remboursement ?",
    answer: (
      <>
        <p>
          Les skills étant des produits numériques, le droit de rétractation ne s'applique pas 
          une fois le téléchargement effectué (conformément à l'article L.221-28 du Code de la consommation).
        </p>
        <p className="mt-2">
          Cependant, si un skill ne fonctionne pas comme décrit, contactez-nous à{' '}
          <a href="mailto:support@clawforge.io" className="text-blue-600 hover:underline">
            support@clawforge.io
          </a>
          . Nous étudierons votre demande au cas par cas.
        </p>
      </>
    ),
  },
  {
    question: "Comment contacter le support ?",
    answer: (
      <>
        <p>Plusieurs options s'offrent à vous :</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Pour un skill spécifique :</strong> utilisez l'URL de support indiquée sur la fiche du skill
          </li>
          <li>
            <strong>Pour la plateforme :</strong> contactez-nous via la{' '}
            <Link href="/contact" className="text-blue-600 hover:underline">page contact</Link>
          </li>
          <li>
            <strong>Réponse rapide :</strong> rejoignez notre{' '}
            <a href="https://discord.gg/clawforge" className="text-blue-600 hover:underline" target="_blank" rel="noopener">
              Discord
            </a>
          </li>
        </ul>
      </>
    ),
  },
];

const CREATOR_FAQ: FAQItem[] = [
  {
    question: "Comment devenir créateur ?",
    answer: (
      <>
        <p>Devenir créateur est gratuit et simple :</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Créez un compte ClawForge (via GitHub ou Google)</li>
          <li>Allez sur la page{' '}
            <Link href="/become-creator" className="text-blue-600 hover:underline">Devenir créateur</Link>
          </li>
          <li>Complétez l'onboarding Stripe (KYC requis pour recevoir des paiements)</li>
          <li>Soumettez votre premier skill !</li>
        </ol>
      </>
    ),
  },
  {
    question: "Quelle est la commission ClawForge ?",
    answer: (
      <>
        <p>
          ClawForge prend <strong>20%</strong> de commission sur chaque vente.
        </p>
        <p className="mt-2">
          Vous conservez donc <strong>80%</strong> du prix de vente. Cette commission couvre 
          les frais de plateforme, hébergement, certification et support.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Note : les frais Stripe (~2.9% + 0.25€) sont inclus dans les 20%.
        </p>
      </>
    ),
  },
  {
    question: "Comment fonctionne la certification ?",
    answer: (
      <>
        <p>Chaque skill soumis passe par un processus de certification :</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li><strong>Scan automatique :</strong> analyse antivirus (VirusTotal)</li>
          <li><strong>Validation structure :</strong> vérification du format et SKILL.md</li>
          <li><strong>Review manuelle :</strong> test fonctionnel par notre équipe</li>
        </ol>
        <p className="mt-2">
          Selon la qualité, votre skill reçoit un badge : 🥉 Bronze, 🥈 Silver, ou 🥇 Gold.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Délai moyen : 24-72h selon la complexité du skill.
        </p>
      </>
    ),
  },
  {
    question: "Comment recevoir mes paiements ?",
    answer: (
      <>
        <p>Les paiements sont gérés via Stripe Connect :</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Les revenus sont virés sur votre compte bancaire</li>
          <li>Délai standard : 7 jours après chaque vente</li>
          <li>Vous pouvez suivre vos revenus dans le dashboard Stripe</li>
        </ul>
        <p className="mt-2">
          Stripe gère également vos déclarations fiscales (formulaire 1099 pour les US, etc.).
        </p>
      </>
    ),
  },
];

function FAQSection({ title, icon: Icon, items }: { title: string; icon: typeof ShoppingBag; items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y">
        {items.map((item, index) => (
          <div key={index}>
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="flex w-full items-center justify-between p-6 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{item.question}</span>
              {openIndex === index ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            {openIndex === index && (
              <div className="border-t bg-gray-50 p-6 text-gray-600">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Foire aux questions</h1>
          <p className="mt-2 text-gray-600">
            Trouvez rapidement des réponses à vos questions
          </p>
        </div>

        <div className="mt-12 space-y-8">
          <FAQSection title="Pour les utilisateurs" icon={ShoppingBag} items={USER_FAQ} />
          <FAQSection title="Pour les créateurs" icon={Code} items={CREATOR_FAQ} />
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-xl border bg-gradient-to-r from-blue-50 to-purple-50 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Vous n'avez pas trouvé votre réponse ?
          </h3>
          <p className="mt-2 text-gray-600">
            Notre équipe est là pour vous aider.
          </p>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 font-medium text-white hover:bg-gray-800"
            >
              Nous contacter
            </Link>
            <a
              href="https://discord.gg/clawforge"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Rejoindre Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
