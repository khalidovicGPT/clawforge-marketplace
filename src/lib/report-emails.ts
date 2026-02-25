/**
 * Email templates pour le systeme de signalement des skills.
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

const REPORT_TYPE_LABELS: Record<string, string> = {
  false_positive: 'Faux positif',
  system_bug: 'Bug du systeme de validation',
  unclear_error: 'Message d\'erreur incomprehensible',
  other: 'Autre',
};

const RESOLUTION_LABELS: Record<string, string> = {
  skill_approved: 'Skill approuve',
  skill_rejected: 'Skill maintenu rejete',
  bug_fixed: 'Bug systeme corrige',
  no_action: 'Pas d\'action necessaire',
};

/**
 * Email de confirmation envoye au createur apres creation d'un signalement.
 */
export async function sendReportConfirmationEmail(
  to: string,
  creatorName: string,
  skillName: string,
  reportType: string,
  reportId: string,
): Promise<void> {
  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Nous avons bien recu votre signalement concernant le skill <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong>.
    </p>
    <div style="background:#f0f9ff;border:1px solid #3b82f6;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#1e40af;font-size:14px;margin:0;"><strong>Type :</strong> ${REPORT_TYPE_LABELS[reportType] || reportType}</p>
      <p style="color:#1e40af;font-size:14px;margin:4px 0 0;"><strong>Reference :</strong> ${reportId.slice(0, 8)}</p>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Notre equipe d'administration va examiner votre cas sous 24 heures. Vous serez notifie des que nous aurons une reponse.
    </p>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Pour toute question urgente : <a href="mailto:contact@clawforge.io" style="color:#3b82f6;">contact@clawforge.io</a>
    </p>
  `);

  await sendEmail(to, `Votre signalement a bien ete recu — #${reportId.slice(0, 8)}`, html);
}

/**
 * Email envoye au createur quand un admin repond au signalement.
 */
export async function sendReportResolutionEmail(
  to: string,
  creatorName: string,
  skillName: string,
  adminNotes: string,
  resolutionAction: string | null,
): Promise<void> {
  const actionLabel = resolutionAction ? (RESOLUTION_LABELS[resolutionAction] || resolutionAction) : '';

  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${creatorName}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre signalement concernant <strong>&laquo;&nbsp;${skillName}&nbsp;&raquo;</strong> a ete traite.
    </p>
    <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#166534;font-size:14px;margin:0;"><strong>Reponse de l'administrateur :</strong></p>
      <p style="color:#166534;font-size:14px;margin:8px 0 0;">${adminNotes}</p>
    </div>
    ${actionLabel ? `
    <p style="color:#333;font-size:16px;line-height:1.6;">
      <strong>Action prise :</strong> ${actionLabel}
    </p>
    ` : ''}
    ${resolutionAction === 'skill_approved' ? `
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Votre skill est maintenant certifie et visible sur le marketplace.
    </p>
    ` : ''}
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Pour toute question complementaire : <a href="mailto:contact@clawforge.io" style="color:#3b82f6;">contact@clawforge.io</a>
    </p>
  `);

  await sendEmail(to, `Mise a jour de votre signalement — Resolu`, html);
}

/**
 * Notification email envoyee aux admins (contact@clawforge.io) lors d'un nouveau signalement.
 */
export async function sendReportAdminNotificationEmail(
  skillName: string,
  skillVersion: string,
  creatorEmail: string,
  reportType: string,
  priority: string,
  description: string,
  reportId: string,
): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'contact@clawforge.io';

  const html = wrapHtml(`
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Un nouveau signalement a ete cree.
    </p>
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="color:#92400e;font-size:14px;margin:0;"><strong>Skill :</strong> ${skillName} v${skillVersion}</p>
      <p style="color:#92400e;font-size:14px;margin:4px 0 0;"><strong>Createur :</strong> ${creatorEmail}</p>
      <p style="color:#92400e;font-size:14px;margin:4px 0 0;"><strong>Type :</strong> ${REPORT_TYPE_LABELS[reportType] || reportType}</p>
      <p style="color:#92400e;font-size:14px;margin:4px 0 0;"><strong>Priorite :</strong> ${priority.toUpperCase()}</p>
    </div>
    <p style="color:#333;font-size:14px;line-height:1.6;"><strong>Description :</strong></p>
    <p style="color:#555;font-size:14px;line-height:1.6;background:#f9fafb;border-radius:8px;padding:12px;">
      ${description.slice(0, 500)}${description.length > 500 ? '...' : ''}
    </p>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Reference : ${reportId.slice(0, 8)}
    </p>
  `);

  await sendEmail(
    adminEmail,
    `[ClawForge Report] Nouveau signalement — ${skillName}`,
    html,
  );
}
