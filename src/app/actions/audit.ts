"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { listAuditLogs, resolveIncident, toCSV, type AuditListFilters } from "@/lib/audit";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireAdmin(): Promise<{ userId: string; role: string }> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claimsMeta = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claimsMeta.role === "admin" || claimsMeta.role === "super_admin") return { userId, role: String(claimsMeta.role) };
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = String(user.publicMetadata?.role || "");
  if (role !== "admin" && role !== "super_admin") throw new Error("Admin only");
  return { userId, role };
}

export async function resolveIncidentAction(id: string): Promise<R> {
  try {
    await requireAdmin();
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "user missing" };
    await resolveIncident(id, me.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function exportAuditLogsAction(filters: AuditListFilters, format: "csv" | "json"): Promise<R<{ content: string; filename: string; mime: string }>> {
  try {
    await requireAdmin();
    const me = await getCurrentDbUser();
    // Cap export to 10k rows
    const { rows } = await listAuditLogs({ ...filters, limit: 10000, offset: 0 });
    const content = format === "csv" ? toCSV(rows as Array<Record<string, unknown>>) : JSON.stringify(rows, null, 2);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `audit-logs-${stamp}.${format}`;
    const mime = format === "csv" ? "text/csv" : "application/json";
    if (me) {
      await supabaseAdmin().from("compliance_exports").insert({
        generated_by: me.id, report_type: "audit_logs", format, filters, row_count: rows.length,
      });
    }
    return { ok: true, data: { content, filename, mime } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
