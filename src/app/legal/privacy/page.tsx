import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité - ClawForge',
  description: 'Politique de confidentialité et protection des données de ClawForge',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <article className="rounded-xl border bg-white p-8 shadow-sm prose prose-gray max-w-none">
          <h1>Politique de Confidentialité</h1>
          <p className="text-sm text-gray-500">Dernière mise à jour : 8 février 2026</p>

          <h2>1. Responsable du traitement</h2>
          <p>
            <strong>ESK CONSEIL</strong><br />
            Numéro de TVA : FR45850850934<br />
            DPO : privacy@clawforge.io
          </p>

          <h2>2. Données collectées</h2>
          <p>Nous collectons les données suivantes :</p>

          <h3>2.1 Données d'identification</h3>
          <ul>
            <li>Adresse email</li>
            <li>Nom d'affichage (optionnel)</li>
            <li>Identifiant GitHub ou Google (selon le mode de connexion)</li>
            <li>Photo de profil (depuis GitHub/Google)</li>
          </ul>

          <h3>2.2 Données de transaction</h3>
          <ul>
            <li>Historique des achats</li>
            <li>Montants payés</li>
            <li>Identifiants Stripe (pour les créateurs)</li>
          </ul>

          <h3>2.3 Données techniques</h3>
          <ul>
            <li>Adresse IP</li>
            <li>Type de navigateur</li>
            <li>Pages visitées et horodatage</li>
          </ul>

          <h2>3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Gérer votre compte utilisateur</li>
            <li>Traiter vos achats et téléchargements</li>
            <li>Verser les revenus aux créateurs (Stripe Connect)</li>
            <li>Vous envoyer des notifications liées à vos achats</li>
            <li>Améliorer nos services (statistiques anonymisées)</li>
            <li>Assurer la sécurité de la plateforme</li>
          </ul>

          <h2>4. Base légale</h2>
          <p>Les traitements reposent sur :</p>
          <ul>
            <li><strong>L'exécution du contrat</strong> : gestion des achats et téléchargements</li>
            <li><strong>L'intérêt légitime</strong> : sécurité et amélioration des services</li>
            <li><strong>Le consentement</strong> : communications marketing (opt-in)</li>
          </ul>

          <h2>5. Partage des données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul>
            <li><strong>Stripe</strong> : traitement des paiements</li>
            <li><strong>Supabase</strong> : hébergement de la base de données</li>
            <li><strong>Vercel</strong> : hébergement de l'application</li>
          </ul>
          <p>
            <strong>Nous ne vendons jamais vos données personnelles à des tiers.</strong>
          </p>

          <h2>6. Durée de conservation</h2>
          <ul>
            <li><strong>Données de compte</strong> : jusqu'à suppression du compte + 3 ans</li>
            <li><strong>Données de transaction</strong> : 10 ans (obligation légale)</li>
            <li><strong>Logs techniques</strong> : 12 mois</li>
          </ul>

          <h2>7. Vos droits (RGPD)</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
            <li><strong>Droit de rectification</strong> : corriger vos données</li>
            <li><strong>Droit à l'effacement</strong> : demander la suppression</li>
            <li><strong>Droit à la portabilité</strong> : récupérer vos données</li>
            <li><strong>Droit d'opposition</strong> : refuser certains traitements</li>
            <li><strong>Droit de limitation</strong> : restreindre le traitement</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez notre DPO : <strong>privacy@clawforge.io</strong>
          </p>

          <h2>8. Cookies</h2>
          <p>Nous utilisons des cookies strictement nécessaires au fonctionnement :</p>
          <ul>
            <li><strong>Cookies de session</strong> : authentification</li>
            <li><strong>Cookies de préférence</strong> : paramètres d'affichage</li>
          </ul>
          <p>
            Nous n'utilisons pas de cookies publicitaires ou de tracking tiers.
          </p>

          <h2>9. Sécurité</h2>
          <p>Nous mettons en œuvre les mesures suivantes :</p>
          <ul>
            <li>Chiffrement HTTPS de toutes les communications</li>
            <li>Stockage sécurisé des mots de passe (hash bcrypt)</li>
            <li>Authentification OAuth (pas de stockage de mot de passe)</li>
            <li>Audits de sécurité réguliers</li>
          </ul>

          <h2>10. Transferts internationaux</h2>
          <p>
            Nos sous-traitants (Stripe, Vercel, Supabase) peuvent transférer des données 
            hors UE. Ces transferts sont encadrés par les Clauses Contractuelles Types 
            de la Commission Européenne.
          </p>

          <h2>11. Réclamation</h2>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire 
            une réclamation auprès de la CNIL :{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
              www.cnil.fr
            </a>
          </p>

          <h2>12. Modifications</h2>
          <p>
            Cette politique peut être mise à jour. Les modifications significatives 
            seront notifiées par email.
          </p>

          <hr />
          <p className="text-sm text-gray-500">
            Contact DPO : privacy@clawforge.io
          </p>
        </article>
      </div>
    </div>
  );
}
