import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente - ClawForge',
  description: 'Conditions générales de vente de la marketplace ClawForge',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <article className="rounded-xl border bg-white p-8 shadow-sm prose prose-gray max-w-none">
          <h1>Conditions Générales de Vente</h1>
          <p className="text-sm text-gray-500">Dernière mise à jour : 8 février 2026</p>

          <h2>1. Identification du vendeur</h2>
          <p>
            <strong>ESK CONSEIL</strong><br />
            Numéro de TVA : FR45850850934<br />
            Email : contact@clawforge.io
          </p>

          <h2>2. Objet</h2>
          <p>
            Les présentes Conditions Générales de Vente (CGV) régissent les transactions 
            effectuées sur la marketplace ClawForge, une plateforme de vente de skills 
            (extensions logicielles) pour OpenClaw.
          </p>

          <h2>3. Prix et paiement</h2>
          <h3>3.1 Prix affichés</h3>
          <p>
            Les prix sont affichés en euros (€) TTC. Le prix applicable est celui en vigueur 
            au moment de la validation de la commande.
          </p>

          <h3>3.2 Répartition des revenus</h3>
          <p>
            Pour chaque vente, la répartition est la suivante :
          </p>
          <ul>
            <li><strong>80%</strong> pour le créateur du skill</li>
            <li><strong>20%</strong> pour ClawForge (commission plateforme)</li>
          </ul>

          <h3>3.3 Moyens de paiement</h3>
          <p>
            Les paiements sont traités via Stripe. Les moyens de paiement acceptés incluent 
            les cartes bancaires (Visa, Mastercard, American Express).
          </p>

          <h2>4. Livraison</h2>
          <p>
            Les skills sont des produits numériques. La livraison est immédiate après 
            validation du paiement. L'acheteur reçoit un accès au téléchargement depuis 
            son dashboard.
          </p>

          <h2>5. Droit de rétractation</h2>
          <p>
            Conformément à l'article L.221-28 du Code de la consommation, le droit de 
            rétractation ne peut être exercé pour les contenus numériques fournis sur 
            un support immatériel dont l'exécution a commencé avec l'accord préalable 
            exprès du consommateur et pour lesquels il a renoncé à son droit de rétractation.
          </p>
          <p>
            En téléchargeant un skill, l'acheteur reconnaît expressément renoncer à son 
            droit de rétractation.
          </p>

          <h2>6. Garantie et responsabilité</h2>
          <h3>6.1 Certification</h3>
          <p>
            Tous les skills vendus sur ClawForge passent un processus de certification 
            (sécurité, qualité, documentation). Cependant, ClawForge ne peut garantir 
            l'absence totale de bugs ou la compatibilité avec tous les environnements.
          </p>

          <h3>6.2 Limitation de responsabilité</h3>
          <p>
            ClawForge agit en qualité d'intermédiaire. La responsabilité de ClawForge 
            ne saurait être engagée pour :
          </p>
          <ul>
            <li>Les dommages indirects résultant de l'utilisation d'un skill</li>
            <li>L'interruption temporaire du service</li>
            <li>Les contenus fournis par les créateurs tiers</li>
          </ul>

          <h3>6.3 Support</h3>
          <p>
            Le support technique est assuré par le créateur du skill via l'URL de support 
            indiquée sur la fiche produit. ClawForge peut intervenir en cas de litige.
          </p>

          <h2>7. Propriété intellectuelle</h2>
          <p>
            L'achat d'un skill confère une licence d'utilisation selon les termes définis 
            par le créateur (MIT, Apache-2.0, ou Propriétaire). Cette licence ne confère 
            aucun droit de propriété sur le code source.
          </p>

          <h2>8. Données personnelles</h2>
          <p>
            Le traitement des données personnelles est détaillé dans notre{' '}
            <a href="/legal/privacy">Politique de Confidentialité</a>.
          </p>

          <h2>9. Résolution des litiges</h2>
          <p>
            En cas de litige, une solution amiable sera recherchée avant toute action 
            judiciaire. Le consommateur peut recourir gratuitement au service de médiation 
            de la consommation.
          </p>

          <h2>10. Droit applicable</h2>
          <p>
            Les présentes CGV sont soumises au droit français. Tout litige relatif à leur 
            interprétation sera de la compétence exclusive des tribunaux français.
          </p>

          <hr />
          <p className="text-sm text-gray-500">
            Pour toute question, contactez-nous : contact@clawforge.io
          </p>
        </article>
      </div>
    </div>
  );
}
