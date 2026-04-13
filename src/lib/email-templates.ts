/**
 * Reusable email templates.
 * All return an HTML body intended to be passed through wrapEmail() from src/lib/email.ts.
 */

const BTN = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#1E88E5,#1565C0);color:#fff;border-radius:10px;font-weight:700;text-decoration:none;">${label}</a>`;

export const EmailTemplates = {
  welcome: ({ firstName, dashboardUrl }: { firstName: string; dashboardUrl: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">Welcome to CIOS, ${firstName} 👋</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;">You're officially in the COSPRONOS internship program. Here's how to start strong:</p>
    <ul style="color:#B0BEC5;padding-left:20px;margin:0 0 18px;line-height:1.7;">
      <li>Complete your profile in the next 24 hours</li>
      <li>Join the kick-off classroom session</li>
      <li>Pick your skill track (Design / Dev / Marketing / AI…)</li>
    </ul>
    ${BTN(dashboardUrl, "Open dashboard →")}
  `,

  passwordChanged: ({ firstName, when, ip }: { firstName: string; when: string; ip?: string | null }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">🔐 Password changed</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;">Hi ${firstName}, your CIOS password was changed on <strong>${when}</strong>${ip ? ` from IP <code>${ip}</code>` : ""}.</p>
    <p style="color:#B0BEC5;margin:0 0 14px;">If this wasn't you, reset immediately and revoke active sessions in Settings → Security.</p>
  `,

  newDevice: ({ firstName, device, location, when }: { firstName: string; device: string; location: string; when: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">📱 New sign-in detected</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;">Hi ${firstName}, a new device just signed in to your CIOS account:</p>
    <table role="presentation" cellpadding="6" style="margin:0 0 16px;">
      <tr><td style="color:#8892A4;">Device</td><td style="color:#E8EDF5;">${device}</td></tr>
      <tr><td style="color:#8892A4;">Location</td><td style="color:#E8EDF5;">${location}</td></tr>
      <tr><td style="color:#8892A4;">When</td><td style="color:#E8EDF5;">${when}</td></tr>
    </table>
    <p style="color:#B0BEC5;">If this wasn't you, revoke the session in Settings → Security.</p>
  `,

  achievement: ({ firstName, badge, xp, shareUrl }: { firstName: string; badge: string; xp: number; shareUrl: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">🏆 Achievement unlocked!</h2>
    <p style="color:#B0BEC5;margin:0 0 6px;">Nice work ${firstName} — you just earned:</p>
    <div style="background:rgba(255,193,7,0.1);border:1px solid rgba(255,193,7,0.25);border-radius:12px;padding:18px;margin:14px 0;">
      <div style="font-size:24px;color:#FFC107;font-weight:800;">${badge}</div>
      <div style="color:#8892A4;font-size:12px;margin-top:4px;">+${xp} XP</div>
    </div>
    ${BTN(shareUrl, "🔗 Share your win")}
  `,

  taskReminder: ({ firstName, taskTitle, dueIn, taskUrl }: { firstName: string; taskTitle: string; dueIn: string; taskUrl: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">⏰ Task due ${dueIn}</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;">Hi ${firstName}, just a heads-up:</p>
    <div style="background:rgba(30,136,229,0.08);border-left:3px solid #1E88E5;padding:12px 16px;border-radius:8px;margin:0 0 16px;">
      <div style="color:#E8EDF5;font-weight:700;">${taskTitle}</div>
      <div style="color:#8892A4;font-size:12px;margin-top:4px;">Due ${dueIn}</div>
    </div>
    ${BTN(taskUrl, "Open task")}
  `,

  classReminder: ({ firstName, classTitle, when, joinUrl }: { firstName: string; classTitle: string; when: string; joinUrl: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">📚 Class starting soon</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;">Hi ${firstName}, your class is about to begin:</p>
    <div style="background:rgba(171,71,188,0.08);border-left:3px solid #AB47BC;padding:12px 16px;border-radius:8px;margin:0 0 16px;">
      <div style="color:#E8EDF5;font-weight:700;">${classTitle}</div>
      <div style="color:#8892A4;font-size:12px;margin-top:4px;">${when}</div>
    </div>
    ${BTN(joinUrl, "Join class →")}
  `,

  fineNotice: ({ firstName, reason, amount, payUrl }: { firstName: string; reason: string; amount: string; payUrl: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">💸 Fine applied</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;">Hi ${firstName}, a fine of <strong style="color:#EF5350;">${amount}</strong> was added to your wallet for: <em>${reason}</em>.</p>
    <p style="color:#B0BEC5;margin:0 0 14px;">Settle it from Wallet to keep full access.</p>
    ${BTN(payUrl, "Open wallet")}
  `,

  hireConfirmed: ({ candidateName, role, company, startDate }: { candidateName: string; role: string; company: string; startDate: string }) => `
    <h2 style="color:#E8EDF5;font-size:22px;margin:0 0 14px;">🎉 Hire confirmed</h2>
    <p style="color:#B0BEC5;margin:0 0 14px;"><strong>${candidateName}</strong> has accepted the <strong>${role}</strong> role at <strong>${company}</strong>, starting <strong>${startDate}</strong>.</p>
    <p style="color:#B0BEC5;margin:0;">CIOS will continue to surface their performance metrics for your records.</p>
  `,
};
