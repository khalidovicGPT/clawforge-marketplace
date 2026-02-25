/**
 * Email templates pour la gestion des skills (retrait, rejet, blocage, reactivation).
 */

import { sendEmail } from '@/lib/n8n';

const FOOTER = `
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">
      ClawForge Marketplace &mdash; Automatisez votre business
    </p>
  </div>
</body>
</html>`;

function wrapHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="margin:12px 0 0;color:#111;font-size:24px;">ClawForge</h1>
    </div>
${content}
${FOOTER}`;
}

export async function sendWithdrawByAdminEmail(
  to: string,
  creatorName: string,
  skillName: string,
  reason: string,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre skill <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong> a ete retire du marketplace par notre equipe d'administration.
    </p>
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#92400e;font-size:14px;margin:0;"><strong>Raison du retrait :</strong></p>
      <p style="color:#92400e;font-size:14px;margin:8px 0 0;">${reason}</p>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Les utilisateurs ayant deja achete ce skill conservent leur acces.
    </p>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Si vous pensez qu'il s'agit d'une erreur, vous pouvez contacter notre support.
    </p>
  `);

  await sendEmail(to, `Votre skill "${skillName}" a ete retire du marketplace`, html);
}

export async function sendRejectionEmail(
  to: string,
  creatorName: string,
  skillName: string,
  reason: string,
  feedback: string,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre skill <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong> n'a pas ete approuve pour le moment.
    </p>
    <div style="background:#fee2e2;border:1px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Raison :</strong></p>
      <p style="color:#991b1b;font-size:14px;margin:8px 0 0;">${reason}</p>
    </div>
    ${feedback ? `
    <div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#1e40af;font-size:14px;margin:0;"><strong>Conseils pour ameliorer :</strong></p>
      <p style="color:#1e40af;font-size:14px;margin:8px 0 0;">${feedback}</p>
    </div>
    ` : ''}
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Vous pouvez modifier votre skill et le soumettre a nouveau depuis votre dashboard.
    </p>
  `);

  await sendEmail(to, `Votre skill "${skillName}" necessite des modifications`, html);
}

export async function sendBlockEmail(
  to: string,
  creatorName: string,
  skillName: string,
  reason: string,
  permanent: boolean,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Suite a une verification approfondie, votre skill <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong> a ete bloque sur notre marketplace.
    </p>
    <div style="background:#fee2e2;border:1px solid #dc2626;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#7f1d1d;font-size:14px;margin:0;"><strong>Raison :</strong></p>
      <p style="color:#7f1d1d;font-size:14px;margin:8px 0 0;">${reason}</p>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Ce skill ne peut pas etre soumis a nouveau.${permanent ? ' Cette decision est definitive.' : ''}
    </p>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Pour toute question, contactez notre equipe.
    </p>
  `);

  await sendEmail(to, `Votre skill "${skillName}" a ete bloque`, html);
}

export async function sendCreatorWithdrawConfirmationEmail(
  to: string,
  creatorName: string,
  skillName: string,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre skill <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong> a bien ete retire du marketplace.
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Les utilisateurs ayant deja achete ce skill conservent leur acces.
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Vous pouvez le remettre en ligne a tout moment depuis votre dashboard.
    </p>
  `);

  await sendEmail(to, `Confirmation de retrait — "${skillName}"`, html);
}

export async function sendReactivationEmail(
  to: string,
  creatorName: string,
  skillName: string,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonne nouvelle ! Votre skill <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong> a ete reactive sur le marketplace.
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Il est de nouveau visible pour les acheteurs.
    </p>
  `);

  await sendEmail(to, `Votre skill "${skillName}" a ete reactive`, html);
}
