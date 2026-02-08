import Link from 'next/link';
import { Metadata } from 'next';
import { Search, CreditCard, Download, Zap, UserPlus, Upload, Shield, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Comment ça marche - ClawForge',
  description: 'Découvrez comment utiliser ClawForge pour acheter des skills OpenClaw ou devenir créateur et monétiser vos skills.',
};

const USER_STEPS = [
  {
    icon: Search,
    title: 'Parcourez le catalogue',
    description: 'Explorez des centaines de skills certifiés. Filtrez par catégorie, prix ou certification pour trouver exactement ce dont vous avez besoin.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: CreditCard,
    title: 'Achetez ou téléchargez',
    description: 'Paiement sécurisé via Stripe. Les skills gratuits sont téléchargeables immédiatement. Tout est accessible depuis votre dashboard.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Download,
    title: 'Installez dans OpenClaw',
    description: 'Extrayez le ZIP dans votre dossier skills/. OpenClaw détecte automatiquement le nouveau skill au redémarrage.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Zap,
    title: 'Profitez !',
    description: 'Votre agent est maintenant plus puissant. Utilisez les nouvelles capacités et gagnez en productivité.',
    color: 'bg-amber-100 text-amber-600',
  },
];

const CREATOR_STEPS = [
  {
    icon: UserPlus,
    title: 'Créez votre compte',
    description: 'Inscrivez-vous gratuitement via GitHub ou Google. Complétez le processus Stripe pour recevoir vos paiements.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Upload,
    title: 'Soumettez votre skill',
    description: 'Uploadez votre skill via le dashboard. Ajoutez une description, fixez votre prix, choisissez votre licence.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Shield,
    title: 'Passez la certification',
    description: 'Notre équipe vérifie la sécurité, la qualité et la documentation. Recevez un badge Bronze, Silver ou Gold.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Wallet,
    title: 'Gagnez 80% des ventes',
    description: 'Chaque vente vous rapporte 80%. Les paiements sont virés directement sur votre compte bancaire via Stripe.',
    color: 'bg-amber-100 text-amber-600',
  },
];

function StepSection({ 
  title, 
  subtitle, 
  steps, 
  ctaText, 
  ctaHref,
  reversed = false 
}: { 
  title: string; 
  subtitle: string; 
  steps: typeof USER_STEPS; 
  ctaText: string; 
  ctaHref: string;
  reversed?: boolean;
}) {
  return (
    <section className={`py-16 ${reversed ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
          <p className="mt-2 text-gray-600">{subtitle}</p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              {/* Step number */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-1 text-xs font-bold text-white">
                {index + 1}
              </div>
              
              {/* Icon */}
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${step.color}`}>
                <step.icon className="h-8 w-8" />
              </div>
              
              {/* Content */}
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-b from-gray-50 to-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
            Comment ça marche ?
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            ClawForge connecte les utilisateurs OpenClaw aux meilleurs créateurs de skills. 
            Que vous cherchiez à étendre votre agent ou à monétiser vos créations, 
            le processus est simple et rapide.
          </p>
        </div>
      </section>

      {/* For Users */}
      <StepSection
        title="Pour les utilisateurs"
        subtitle="Trouvez et installez des skills en quelques clics"
        steps={USER_STEPS}
        ctaText="Explorer le catalogue"
        ctaHref="/skills"
      />

      {/* For Creators */}
      <StepSection
        title="Pour les créateurs"
        subtitle="Monétisez votre expertise OpenClaw"
        steps={CREATOR_STEPS}
        ctaText="Devenir créateur"
        ctaHref="/become-creator"
        reversed
      />

      {/* Stats/Trust Section */}
      <section className="bg-gray-900 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Pourquoi choisir ClawForge ?
            </h2>
            <p className="mt-2 text-gray-400">
              La marketplace de référence pour OpenClaw
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">100%</div>
              <div className="mt-2 text-gray-400">Skills certifiés</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">80%</div>
              <div className="mt-2 text-gray-400">Pour les créateurs</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white">24-48h</div>
              <div className="mt-2 text-gray-400">Certification rapide</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Prêt à commencer ?
          </h2>
          <p className="mt-2 text-gray-600">
            Rejoignez la communauté ClawForge dès maintenant.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-8 py-3 font-medium text-white hover:bg-gray-800"
            >
              Voir les skills
            </Link>
            <Link
              href="/become-creator"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-8 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Devenir créateur
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
