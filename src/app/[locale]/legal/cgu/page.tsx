import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation - ClawForge",
  description: "Conditions générales d'utilisation de la plateforme ClawForge",
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <article className="rounded-xl border bg-white p-8 shadow-sm prose prose-gray max-w-none">
          <h1>Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-gray-500">Dernière mise à jour : 8 février 2026</p>

          <h2>1. Présentation du service</h2>
          <p>
            ClawForge est une marketplace de skills (extensions) pour OpenClaw, 
            une plateforme d'agents IA. ClawForge permet aux utilisateurs d'acheter 
            et télécharger des skills, et aux créateurs de publier et monétiser 
            leurs créations.
          </p>

          <h2>2. Inscription et compte</h2>
          <h3>2.1 Création de compte</h3>
          <p>
            L'inscription se fait via GitHub ou Google OAuth. En créant un compte, 
            vous garantissez que les informations fournies sont exactes.
          </p>

          <h3>2.2 Sécurité du compte</h3>
          <p>
            Vous êtes responsable de la sécurité de votre compte. En cas d'accès 
            non autorisé, prévenez-nous immédiatement à : security@clawforge.io
          </p>

          <h3>2.3 Suspension de compte</h3>
          <p>
            ClawForge se réserve le droit de suspendre ou supprimer un compte en cas 
            de violation des présentes CGU.
          </p>

          <h2>3. Utilisation du service</h2>
          <h3>3.1 Utilisation autorisée</h3>
          <p>Vous pouvez utiliser ClawForge pour :</p>
          <ul>
            <li>Parcourir et rechercher des skills</li>
            <li>Acheter et télécharger des skills</li>
            <li>Soumettre des skills en tant que créateur</li>
            <li>Laisser des avis sur les skills achetés</li>
          </ul>

          <h3>3.2 Interdictions</h3>
          <p>Il est strictement interdit de :</p>
          <ul>
            <li>Publier du contenu malveillant (malware, virus, backdoors)</li>
            <li>Contourner les mesures de sécurité de la plateforme</li>
            <li>Redistribuer des skills sans autorisation du créateur</li>
            <li>Créer plusieurs comptes pour contourner une suspension</li>
            <li>Usurper l'identité d'un autre utilisateur ou créateur</li>
            <li>Publier du contenu illégal, diffamatoire ou haineux</li>
            <li>Utiliser des bots ou scripts pour accéder au service</li>
          </ul>

          <h2>4. Programme Créateur</h2>
          <h3>4.1 Inscription</h3>
          <p>
            Pour devenir créateur, vous devez compléter l'onboarding Stripe Connect 
            et accepter les conditions du programme créateur.
          </p>

          <h3>4.2 Obligations du créateur</h3>
          <p>En tant que créateur, vous vous engagez à :</p>
          <ul>
            <li>Fournir du code fonctionnel et documenté</li>
            <li>Ne pas inclure de code malveillant</li>
            <li>Respecter les droits de propriété intellectuelle</li>
            <li>Assurer un support raisonnable via l'URL indiquée</li>
            <li>Maintenir vos skills à jour</li>
          </ul>

          <h3>4.3 Processus de certification</h3>
          <p>
            Tout skill soumis passe par un processus de certification :
          </p>
          <ol>
            <li><strong>Scan automatique</strong> : analyse antivirus (VirusTotal)</li>
            <li><strong>Validation structure</strong> : vérification SKILL.md et format</li>
            <li><strong>Review manuelle</strong> : test fonctionnel par notre équipe</li>
            <li><strong>Attribution badge</strong> : Bronze, Silver ou Gold</li>
          </ol>
          <p>
            ClawForge se réserve le droit de refuser ou retirer un skill sans justification.
          </p>

          <h2>5. Modération et retrait</h2>
          <h3>5.1 Signalement</h3>
          <p>
            Tout utilisateur peut signaler un skill problématique via le bouton 
            "Signaler" sur la fiche produit ou par email : abuse@clawforge.io
          </p>

          <h3>5.2 Procédure de retrait</h3>
          <p>En cas de signalement, ClawForge peut :</p>
          <ul>
            <li>Suspendre temporairement le skill le temps de l'enquête</li>
            <li>Retirer définitivement le skill</li>
            <li>Suspendre le compte du créateur</li>
            <li>Rembourser les acheteurs si nécessaire</li>
          </ul>

          <h3>5.3 Appel</h3>
          <p>
            Un créateur peut contester une décision de modération en contactant 
            appeal@clawforge.io sous 14 jours.
          </p>

          <h2>6. Propriété intellectuelle</h2>
          <h3>6.1 Contenu ClawForge</h3>
          <p>
            La marque ClawForge, le logo, le design et le code de la plateforme 
            sont la propriété d'ESK CONSEIL.
          </p>

          <h3>6.2 Contenu utilisateur</h3>
          <p>
            Les créateurs conservent la propriété intellectuelle de leurs skills. 
            En publiant sur ClawForge, vous accordez une licence non-exclusive 
            de distribution.
          </p>

          <h2>7. Limitation de responsabilité</h2>
          <p>
            ClawForge est fourni "en l'état". Nous ne garantissons pas :
          </p>
          <ul>
            <li>La disponibilité continue du service</li>
            <li>L'absence de bugs dans les skills tiers</li>
            <li>La compatibilité avec tous les environnements</li>
          </ul>
          <p>
            En aucun cas, ClawForge ne pourra être tenu responsable des dommages 
            indirects, perte de données ou manque à gagner.
          </p>

          <h2>8. Modifications des CGU</h2>
          <p>
            ClawForge peut modifier ces CGU à tout moment. Les utilisateurs seront 
            notifiés par email des modifications substantielles. L'utilisation 
            continue du service vaut acceptation des nouvelles CGU.
          </p>

          <h2>9. Droit applicable</h2>
          <p>
            Les présentes CGU sont régies par le droit français. Tout litige sera 
            soumis aux tribunaux compétents de Tours, France.
          </p>

          <h2>10. Contact</h2>
          <p>
            Pour toute question concernant ces CGU :
          </p>
          <ul>
            <li>Email général : contact@clawforge.io</li>
            <li>Support : support@clawforge.io</li>
            <li>Abus : abuse@clawforge.io</li>
          </ul>

          <hr />
          <p className="text-sm text-gray-500">
            ESK CONSEIL — TVA FR45850850934
          </p>
        </article>
      </div>
    </div>
  );
}
