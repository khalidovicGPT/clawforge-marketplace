/**
 * n8n integration for sending transactional emails.
 *
 * On first call, the helper checks whether a "ClawForge - Send Email" workflow
 * exists in n8n.  If not it creates & activates one automatically via the n8n
 * REST API.  Emails are then sent by POSTing to the webhook exposed by that
 * workflow.
 */

const WORKFLOW_NAME = 'ClawForge - Send Email';
const WEBHOOK_PATH = 'clawforge-send-email';

let _webhookUrl: string | null = null;

async function getOrCreateEmailWebhook(): Promise<string> {
  if (_webhookUrl) return _webhookUrl;

  const n8nUrl = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;
  const smtpCredId = process.env.N8N_SMTP_CREDENTIAL_ID;

  if (!n8nUrl || !apiKey || !smtpCredId) {
    throw new Error(
      'n8n non configuré – vérifiez N8N_URL, N8N_API_KEY et N8N_SMTP_CREDENTIAL_ID',
    );
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': apiKey,
  };

  const webhookUrl = `${n8nUrl}/webhook/${WEBHOOK_PATH}`;

  // ---- Check if the workflow already exists ----
  try {
    const listRes = await fetch(`${n8nUrl}/api/v1/workflows`, { headers });

    if (listRes.ok) {
      const { data: workflows } = await listRes.json();
      const existing = workflows?.find(
        (w: { name: string }) => w.name === WORKFLOW_NAME,
      );

      if (existing) {
        // Activate if inactive
        if (!existing.active) {
          await fetch(`${n8nUrl}/api/v1/workflows/${existing.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ active: true }),
          });
        }
        _webhookUrl = webhookUrl;
        return webhookUrl;
      }
    }
  } catch {
    // If listing fails, try to create anyway
  }

  // ---- Create the workflow ----
  const workflow = {
    name: WORKFLOW_NAME,
    nodes: [
      {
        parameters: {
          path: WEBHOOK_PATH,
          httpMethod: 'POST',
          responseMode: 'responseNode',
          options: {},
        },
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [250, 300],
      },
      {
        parameters: {
          sendTo: '={{ $json.to }}',
          subject: '={{ $json.subject }}',
          emailType: 'html',
          html: '={{ $json.html }}',
          options: { appendAttribution: false },
        },
        name: 'Send Email',
        type: 'n8n-nodes-base.emailSend',
        typeVersion: 2.1,
        position: [500, 300],
        credentials: {
          smtp: { id: smtpCredId, name: 'SMTP' },
        },
      },
      {
        parameters: {
          respondWith: 'json',
          responseBody: '={{ JSON.stringify({ success: true }) }}',
        },
        name: 'Respond',
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [750, 300],
      },
    ],
    connections: {
      Webhook: {
        main: [[{ node: 'Send Email', type: 'main', index: 0 }]],
      },
      'Send Email': {
        main: [[{ node: 'Respond', type: 'main', index: 0 }]],
      },
    },
    settings: { executionOrder: 'v1' },
  };

  const createRes = await fetch(`${n8nUrl}/api/v1/workflows`, {
    method: 'POST',
    headers,
    body: JSON.stringify(workflow),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Impossible de créer le workflow n8n : ${body}`);
  }

  const created = await createRes.json();

  // Activate
  await fetch(`${n8nUrl}/api/v1/workflows/${created.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active: true }),
  });

  _webhookUrl = webhookUrl;
  return webhookUrl;
}

/**
 * Send an email through the n8n "Send Email" webhook workflow.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const webhookUrl = await getOrCreateEmailWebhook();

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erreur envoi email via n8n : ${res.status} – ${text}`);
  }
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
