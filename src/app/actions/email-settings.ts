"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { setEmailConfig, clearEmailConfig, sendEmail, wrapEmail, getEmailConfig, type EmailConfig } from "@/lib/email";
import { logAudit } from "@/lib/audit";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claimsMeta = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claimsMeta.role === "super_admin") return userId;
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  if (user.publicMetadata?.role !== "super_admin") throw new Error("Super admin only");
  return userId;
}

export async function getEmailStatus(): Promise<Result<{ configured: boolean; provider: string | null; fromAddress: string | null; keyMasked: string | null }>> {
  try {
    await requireSuperAdmin();
    const cfg = await getEmailConfig();
    if (!cfg) return { ok: true, data: { configured: false, provider: null, fromAddress: null, keyMasked: null } };
    const masked = cfg.apiKey.length > 8 ? `${cfg.apiKey.slice(0, 4)}…${cfg.apiKey.slice(-4)}` : "••••";
    return { ok: true, data: { configured: true, provider: cfg.provider, fromAddress: cfg.fromAddress, keyMasked: masked } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveEmailSettings(cfg: EmailConfig): Promise<Result> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "user missing" };
    if (!cfg.apiKey || cfg.apiKey.length < 10) return { ok: false, error: "Invalid API key" };
    if (!cfg.fromAddress.includes("@")) return { ok: false, error: "From address must include an @" };
    await setEmailConfig(cfg, me.id);
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Email provider set to ${cfg.provider}`,
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "setting", entityId: "email",
      metadata: { provider: cfg.provider, fromAddress: cfg.fromAddress },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function clearEmailSettings(): Promise<Result> {
  try {
    await requireSuperAdmin();
    await clearEmailConfig();
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: "Email provider cleared",
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "setting", entityId: "email",
      severity: "warning",
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function testEmail(toAddress: string): Promise<Result> {
  try {
    await requireSuperAdmin();
    if (!toAddress.includes("@")) return { ok: false, error: "Invalid recipient email" };
    const r = await sendEmail({
      to: toAddress,
      subject: "CIOS · Email setup successful ✅",
      html: wrapEmail(
        `<h2 style="margin:0 0 12px 0;color:#E8EDF5;font-size:20px;">You're all set!</h2>
         <p style="margin:0 0 12px 0;color:#E8EDF5;">If you're reading this, email is working on your CIOS deployment.</p>
         <p style="margin:0;color:#8892A4;font-size:13px;">Test sent at ${new Date().toLocaleString()}</p>`,
        { preheader: "Email provider connected" }
      ),
    });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
