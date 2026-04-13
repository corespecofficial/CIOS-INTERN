import { supabaseAdmin } from "@/lib/db";
import { captureError } from "@/lib/observability";

export interface EmailConfig {
  provider: "resend" | "sendgrid" | "smtp";
  apiKey: string;
  fromAddress: string;    // "CIOS <hello@yourdomain.com>"
  smtpHost?: string;
  smtpUser?: string;
}

async function getSetting(key: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("system_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const provider = (await getSetting("email.provider")) as EmailConfig["provider"] | null;
  if (!provider) return null;
  const apiKey = await getSetting(`email.${provider}.key`);
  const fromAddress = await getSetting("email.from");
  if (!apiKey || !fromAddress) return null;
  return { provider, apiKey, fromAddress };
}

export async function setEmailConfig(cfg: EmailConfig, actorId: string) {
  const sb = supabaseAdmin();
  const updates = [
    { key: "email.provider", value: cfg.provider },
    { key: `email.${cfg.provider}.key`, value: cfg.apiKey },
    { key: "email.from", value: cfg.fromAddress },
  ];
  for (const u of updates) {
    await sb.from("system_settings").upsert({ ...u, updated_by: actorId, updated_at: new Date().toISOString() });
  }
}

export async function clearEmailConfig() {
  const sb = supabaseAdmin();
  await sb.from("system_settings").delete().in("key", [
    "email.provider",
    "email.resend.key", "email.sendgrid.key", "email.smtp.key",
    "email.from",
  ]);
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  try {
    const cfg = await getEmailConfig();
    if (!cfg) return { ok: false, error: "Email not configured" };

    const recipients = Array.isArray(input.to) ? input.to : [input.to];

    if (cfg.provider === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "authorization": `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: cfg.fromAddress,
          to: recipients,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      if (!res.ok) { const t = await res.text(); return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 300)}` }; }
      const d = await res.json();
      return { ok: true, id: d.id };
    }

    if (cfg.provider === "sendgrid") {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { "authorization": `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: recipients.map((e) => ({ email: e })) }],
          from: { email: cfg.fromAddress },
          subject: input.subject,
          content: [
            ...(input.text ? [{ type: "text/plain", value: input.text }] : []),
            { type: "text/html", value: input.html },
          ],
        }),
      });
      if (!res.ok) { const t = await res.text(); return { ok: false, error: `SendGrid ${res.status}: ${t.slice(0, 300)}` }; }
      return { ok: true };
    }

    return { ok: false, error: `Provider ${cfg.provider} not implemented yet` };
  } catch (e) {
    captureError(e, { tags: { subsystem: "email" }, extra: { subject: input.subject } });
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// Email-safe logo — Cloudinary transformation forces a circular 96×96 PNG that renders reliably in Gmail, Outlook, Apple Mail.
const EMAIL_LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/w_96,h_96,c_fill,g_auto,r_max,f_png,q_auto/v1775646964/Adobe_Express_-_file_lydnbc.png";

/** Branded email shell */
export function wrapEmail(content: string, options: { preheader?: string } = {}): string {
  const preheader = options.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent">${options.preheader}</div>`
    : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0A0E1A;font-family:Arial,sans-serif;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0A0E1A;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="background:#111827;border:1px solid rgba(255,255,255,0.07);border-radius:16px;overflow:hidden;">
      <tr><td style="padding:22px 28px 18px 28px;border-bottom:1px solid rgba(255,255,255,0.07);background:#0A0E1A;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:middle;width:48px;padding-right:14px;">
              <img src="${EMAIL_LOGO}" width="48" height="48" alt="CIOS logo" style="display:block;border:0;outline:none;text-decoration:none;border-radius:24px;-ms-interpolation-mode:bicubic;" />
            </td>
            <td style="vertical-align:middle;">
              <div style="color:#1E88E5;font-weight:700;font-size:13px;letter-spacing:2px;line-height:1.2;">CIOS</div>
              <div style="color:#8892A4;font-size:11px;letter-spacing:1px;line-height:1.2;margin-top:2px;">COSPRONOS MEDIA × CORESPEC</div>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:26px 28px 22px 28px;color:#E8EDF5;font-size:15px;line-height:1.7;">
        ${content}
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.07);color:#5A6478;font-size:11px;line-height:1.5;background:#0A0E1A;text-align:center;">
        Sent by CIOS · COSPRONOS Media × Corespec Engineering<br>
        Manage email preferences in your account settings.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
