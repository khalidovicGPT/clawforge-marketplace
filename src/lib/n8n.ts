/**
 * Email sending utility using nodemailer (direct SMTP).
 *
 * Env vars required:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from 'nodemailer';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP non configuré – vérifiez SMTP_HOST, SMTP_USER et SMTP_PASS dans .env.local',
    );
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return _transporter;
}

/**
 * Send an email via SMTP.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({ from, to, subject, html });
}

/**
 * Build the HTML email for account verification.
 */
export function buildVerificationEmail(name: string, link: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:48px;">&#129470;</span>
      <h1 style="margin:12px 0 0;color:#111;font-size:24px;">ClawForge</h1>
    </div>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Bonjour <strong>${name}</strong>,
    </p>
    <p style="color:#333;font-size:16px;line-height:1.6;">
      Merci pour votre inscription&nbsp;! Cliquez sur le bouton ci-dessous pour activer votre compte&nbsp;:
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${link}"
         style="display:inline-block;background:#111;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
        Activer mon compte
      </a>
    </div>
    <p style="color:#666;font-size:14px;line-height:1.5;">
      Ce lien est valable <strong>24&nbsp;heures</strong>. Si vous n&rsquo;avez pas cr&eacute;&eacute; de compte sur ClawForge, ignorez simplement cet email.
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="color:#999;font-size:12px;text-align:center;">
      ClawForge Marketplace &mdash; Automatisez votre business
    </p>
  </div>
</body>
</html>`;
}
