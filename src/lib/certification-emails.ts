/**
 * Templates email pour le systeme de certification.
 */

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:48px;">&#129470;</span>
      <h1 style="margin:12px 0 0;color:#111;font-size:24px;">ClawForge</h1>
    </div>
    ${content}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">
      ClawForge Marketplace &mdash; Automatisez votre business
    </p>
  </div>
</body>
</html>`;
}

/**
 * Email envoye quand un createur soumet une demande de certification.
 */
export function buildCertificationRequestEmail(
  name: string,
  skillName: string,
  level: string,
  qualityScore: number,
  passedCriteria: number,
  totalCriteria: number,
): string {
  const levelEmoji = level === 'gold' ? '&#129351;' : '&#129352;';
  const levelLabel = level === 'gold' ? 'Gold' : 'Silver';

  return emailLayout(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${name}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Vous avez demand&eacute; la certification <strong>${levelLabel} ${levelEmoji}</strong> pour votre skill
      &laquo;&nbsp;<strong>${skillName}</strong>&nbsp;&raquo;.
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Notre &eacute;quipe QualityClaw examine votre demande.
      D&eacute;lai estim&eacute;&nbsp;: <strong>2-3 jours ouvr&eacute;s</strong>.
    </p>
    <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#666;font-size:14px;">
        <strong>Score qualit&eacute; actuel :</strong> ${qualityScore}/100
      </p>
      <p style="margin:0;color:#666;font-size:14px;">
        <strong>Crit&egrave;res valid&eacute;s :</strong> ${passedCriteria}/${totalCriteria}
      </p>
    </div>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Vous serez notifi&eacute; d&egrave;s que la d&eacute;cision sera prise.
    </p>
  `);
}

/**
 * Email envoye quand une certification Silver est accordee.
 */
export function buildCertificationApprovedEmail(
  name: string,
  skillName: string,
  level: string,
  baseUrl: string,
): string {
  const levelEmoji = level === 'gold' ? '&#129351;' : '&#129352;';
  const levelLabel = level === 'gold' ? 'Gold' : 'Silver';

  return emailLayout(`
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:64px;">&#127881;</span>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;text-align:center;">
      F&eacute;licitations <strong>${name}</strong>&nbsp;!
    </p>
    <p style="color:#333;font-size:18px;line-height:1.6;text-align:center;font-weight:bold;">
      Votre skill &laquo;&nbsp;${skillName}&nbsp;&raquo; vient d'obtenir la certification
      <span style="font-size:20px;">${levelLabel} ${levelEmoji}</span>
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#166534;font-size:14px;font-weight:bold;">
        Avantages de la certification ${levelLabel} :
      </p>
      <ul style="margin:0;padding-left:20px;color:#166534;font-size:14px;line-height:1.8;">
        <li>Badge ${levelLabel} sur votre fiche skill</li>
        <li>Meilleur r&eacute;f&eacute;rencement dans le catalogue</li>
        <li>Acc&egrave;s &agrave; la promotion &laquo; Skills ${levelLabel} &raquo;</li>
        <li>Confiance accrue des acheteurs</li>
      </ul>
    </div>
    ${level === 'silver' ? `
    <p style="color:#333;font-size:14px;line-height:1.5;">
      Continuez ainsi pour atteindre le niveau <strong>Gold</strong>&nbsp;!
    </p>
    ` : ''}
    <div style="text-align:center;margin:32px 0;">
      <a href="${baseUrl}/dashboard"
         style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;margin-right:8px;">
        Voir mon skill
      </a>
    </div>
  `);
}

/**
 * Email envoye quand une certification est refusee.
 */
export function buildCertificationRejectedEmail(
  name: string,
  skillName: string,
  level: string,
  feedback: string,
  baseUrl: string,
): string {
  const levelLabel = level === 'gold' ? 'Gold' : 'Silver';

  return emailLayout(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${name}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Apr&egrave;s examen, votre skill &laquo;&nbsp;<strong>${skillName}</strong>&nbsp;&raquo;
      ne r&eacute;pond pas encore &agrave; tous les crit&egrave;res ${levelLabel}.
    </p>
    ${feedback ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#991b1b;font-size:14px;font-weight:bold;">
        Retour de l'&eacute;quipe :
      </p>
      <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.6;">
        ${feedback}
      </p>
    </div>
    ` : ''}
    <p style="color:#333;font-size:14px;line-height:1.5;">
      Vous pouvez soumettre une nouvelle demande une fois les corrections effectu&eacute;es.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${baseUrl}/dashboard"
         style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
        Voir mon dashboard
      </a>
    </div>
  `);
}

/**
 * Email special pour la certification Gold.
 */
export function buildGoldApprovedEmail(
  name: string,
  skillName: string,
  baseUrl: string,
): string {
  return emailLayout(`
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:64px;">&#127942;</span>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;text-align:center;">
      F&eacute;licitations <strong>${name}</strong>&nbsp;!
    </p>
    <p style="color:#333;font-size:18px;line-height:1.6;text-align:center;font-weight:bold;">
      Votre skill &laquo;&nbsp;${skillName}&nbsp;&raquo; atteint le plus haut niveau de certification&nbsp;:
      <span style="font-size:24px;">GOLD &#129351;</span>
    </p>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#92400e;font-size:14px;">
        Cette reconnaissance exceptionnelle refl&egrave;te :
      </p>
      <ul style="margin:0;padding-left:20px;color:#92400e;font-size:14px;line-height:1.8;">
        <li>La qualit&eacute; exceptionnelle de votre skill</li>
        <li>Votre engagement envers les utilisateurs</li>
        <li>Votre contribution &agrave; l'&eacute;cosyst&egrave;me ClawForge</li>
      </ul>
    </div>
    <div style="background:#fefce8;border:1px solid #fef08a;border-radius:8px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 8px;color:#854d0e;font-size:14px;font-weight:bold;">
        Avantages Gold :
      </p>
      <ul style="margin:0;padding-left:20px;color:#854d0e;font-size:14px;line-height:1.8;">
        <li>&#127941; Badge Gold exclusif</li>
        <li>&#127941; Featured sur la homepage</li>
        <li>&#127941; Commission r&eacute;duite sur les ventes</li>
        <li>&#127941; Acc&egrave;s prioritaire au support</li>
      </ul>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;text-align:center;font-weight:bold;">
      Vous faites partie de l'&eacute;lite des cr&eacute;ateurs ClawForge&nbsp;!
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${baseUrl}/dashboard"
         style="display:inline-block;background:#ca8a04;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
        Voir mon dashboard
      </a>
    </div>
  `);
}
