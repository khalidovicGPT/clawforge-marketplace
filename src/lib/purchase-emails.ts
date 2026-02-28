/**
 * Email templates pour les achats et remboursements.
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

function formatPrice(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export async function sendPurchaseConfirmationEmail(
  to: string,
  customerName: string,
  skillTitle: string,
  pricePaid: number,
  currency: string,
  dashboardUrl: string,
): Promise<void> {
  const isFree = !pricePaid || pricePaid === 0;
  const priceDisplay = isFree ? 'Gratuit' : formatPrice(pricePaid, currency);

  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${customerName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre achat a bien ete enregistre. Voici le recapitulatif :
    </p>
    <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#166534;font-size:14px;padding:4px 0;"><strong>Skill :</strong></td>
          <td style="color:#166534;font-size:14px;padding:4px 0;text-align:right;">${skillTitle}</td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:14px;padding:4px 0;"><strong>Montant :</strong></td>
          <td style="color:#166534;font-size:14px;padding:4px 0;text-align:right;">${priceDisplay}</td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:14px;padding:4px 0;"><strong>Date :</strong></td>
          <td style="color:#166534;font-size:14px;padding:4px 0;text-align:right;">${new Date().toLocaleDateString('fr-FR')}</td>
        </tr>
      </table>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Vous pouvez acceder a votre skill depuis votre dashboard :
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Acceder a mon dashboard
      </a>
    </div>
    ${!isFree ? `<p style="color:#666;font-size:13px;line-height:1.5;">
      Vous disposez d'un delai de 15 jours pour demander un remboursement si le skill ne repond pas a vos attentes.
    </p>` : ''}
  `);

  await sendEmail(to, `Confirmation d'achat : ${skillTitle}`, html);
}

export async function sendRefundApprovedEmail(
  to: string,
  customerName: string,
  skillTitle: string,
  amount: number,
  currency: string,
  adminNotes: string | null,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${customerName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre demande de remboursement a ete <strong style="color:#16a34a;">approuvee</strong>.
    </p>
    <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#166534;font-size:14px;padding:4px 0;"><strong>Skill :</strong></td>
          <td style="color:#166534;font-size:14px;padding:4px 0;text-align:right;">${skillTitle}</td>
        </tr>
        <tr>
          <td style="color:#166534;font-size:14px;padding:4px 0;"><strong>Montant rembourse :</strong></td>
          <td style="color:#166534;font-size:14px;padding:4px 0;text-align:right;">${formatPrice(amount, currency)}</td>
        </tr>
      </table>
    </div>
    ${adminNotes ? `<div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#1e40af;font-size:14px;margin:0;"><strong>Note de l'equipe :</strong></p>
      <p style="color:#1e40af;font-size:14px;margin:8px 0 0;">${adminNotes}</p>
    </div>` : ''}
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Le remboursement sera credite sur votre moyen de paiement d'origine sous 5 a 10 jours ouvrables.
    </p>
  `);

  await sendEmail(to, `Remboursement approuve : ${skillTitle}`, html);
}

export async function sendRefundRejectedEmail(
  to: string,
  customerName: string,
  skillTitle: string,
  amount: number,
  currency: string,
  adminNotes: string,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${customerName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre demande de remboursement pour <strong>&laquo;&nbsp;${skillTitle}&nbsp;&raquo;</strong>
      (${formatPrice(amount, currency)}) a ete <strong style="color:#dc2626;">refusee</strong>.
    </p>
    <div style="background:#fef2f2;border:1px solid #ef4444;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#991b1b;font-size:14px;margin:0;"><strong>Motif :</strong></p>
      <p style="color:#991b1b;font-size:14px;margin:8px 0 0;">${adminNotes}</p>
    </div>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Si vous pensez qu'il s'agit d'une erreur, vous pouvez contacter notre support.
    </p>
  `);

  await sendEmail(to, `Demande de remboursement refusee : ${skillTitle}`, html);
}
