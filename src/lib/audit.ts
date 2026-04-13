import { supabaseAdmin } from "@/lib/db";
import { headers } from "next/headers";

export type Severity = "info" | "notice" | "warning" | "critical";
export type Category =
  | "auth" | "account" | "admin" | "community" | "messaging"
  | "learning" | "finance" | "security" | "infrastructure" | "general";

/** Action codes — stable snake_case strings. Extend freely. */
export type ActionCode =
  // auth
  | "auth.login_success" | "auth.login_failed" | "auth.logout"
  | "auth.register" | "auth.password_reset" | "auth.2fa_enabled" | "auth.session_revoked"
  // account
  | "account.profile_updated" | "account.avatar_changed" | "account.privacy_changed"
  | "account.notifications_changed" | "account.deactivated" | "account.deletion_requested"
  // admin
  | "admin.user_suspended" | "admin.user_restored" | "admin.user_banned"
  | "admin.role_changed" | "admin.reward_granted" | "admin.fine_issued"
  | "admin.announcement_broadcast" | "admin.settings_changed" | "admin.xp_adjusted"
  | "admin.course_approved" | "admin.mission_created" | "admin.challenge_created"
  // community/messaging
  | "community.post_removed" | "community.comment_moderated" | "community.user_blocked"
  | "messaging.group_created" | "messaging.group_deleted" | "messaging.message_deleted"
  // learning
  | "learning.course_created" | "learning.course_updated" | "learning.quiz_submitted"
  | "learning.attendance_marked" | "learning.certificate_generated" | "learning.assignment_graded"
  // finance
  | "finance.payment_started" | "finance.payment_completed" | "finance.payment_failed"
  | "finance.fine_paid" | "finance.reward_credited" | "finance.withdrawal_requested"
  // security
  | "security.unauthorized_access" | "security.rate_limit" | "security.suspicious_ip"
  | "security.token_misuse" | "security.spam_blocked" | "security.dangerous_upload"
  // infrastructure
  | "infra.deployment" | "infra.backup" | "infra.cache_cleared"
  | "infra.sw_updated" | "infra.cron_failed" | "infra.migration_run";

export interface LogAuditInput {
  actionCode: string;
  category: Category;
  summary: string;
  severity?: Severity;
  success?: boolean;
  actorUserId?: string | null;
  actorName?: string;
  actorRole?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  riskScore?: number;
  /** Skip request header sniffing (e.g. for system cron events). */
  skipHeaders?: boolean;
}

/** Derive severity from category + success if not explicitly given. */
function defaultSeverity(input: LogAuditInput): Severity {
  if (input.severity) return input.severity;
  if (input.category === "security") return input.success === false ? "critical" : "warning";
  if (input.category === "admin") return "notice";
  if (input.success === false) return "warning";
  return "info";
}

function parseUA(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: "unknown", os: "unknown", device: "unknown" };
  const lc = ua.toLowerCase();
  const browser =
    lc.includes("edg/") ? "Edge" :
    lc.includes("chrome/") ? "Chrome" :
    lc.includes("firefox/") ? "Firefox" :
    lc.includes("safari/") ? "Safari" : "Other";
  const os =
    lc.includes("windows") ? "Windows" :
    lc.includes("mac os") ? "macOS" :
    lc.includes("android") ? "Android" :
    lc.includes("iphone") || lc.includes("ipad") ? "iOS" :
    lc.includes("linux") ? "Linux" : "Other";
  const device =
    lc.includes("mobile") || lc.includes("android") || lc.includes("iphone") ? "mobile" :
    lc.includes("ipad") || lc.includes("tablet") ? "tablet" : "desktop";
  return { browser, os, device };
}

/** Central audit writer. Never throws — audit failures must not break user actions. */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    let requestId: string | null = null;
    if (!input.skipHeaders) {
      try {
        const h = await headers();
        ipAddress = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
        userAgent = h.get("user-agent") || null;
        requestId = h.get("x-request-id") || null;
      } catch { /* outside request scope */ }
    }
    const ua = parseUA(userAgent);
    const severity = defaultSeverity(input);
    const success = input.success ?? true;

    await supabaseAdmin().from("audit_logs").insert({
      user_id: input.actorUserId ?? null,
      action: input.actionCode,
      action_code: input.actionCode,
      category: input.category,
      entity_type: input.entityType ?? "none",
      entity_id: input.entityId ?? "none",
      summary: input.summary,
      severity,
      success,
      actor_name: input.actorName ?? null,
      actor_role: input.actorRole ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      browser: ua.browser,
      os: ua.os,
      device_type: ua.device,
      request_id: requestId,
      risk_score: input.riskScore ?? 0,
      metadata: sanitizeMetadata(input.metadata ?? {}),
    });

    // Anomaly detection — fire-and-forget incidents for known patterns
    correlate(input, ipAddress).catch(() => {});
  } catch (e) {
    // Swallow — this must never surface to the user
    console.warn("[audit] write failed:", e);
  }
}

/** Strip obvious secrets before persisting. */
function sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const blocked = ["password", "token", "secret", "api_key", "apikey", "authorization", "cookie", "session", "private_key"];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();
    if (blocked.some((b) => key.includes(b))) { out[k] = "[REDACTED]"; continue; }
    if (typeof v === "string" && v.length > 2000) { out[k] = v.slice(0, 2000) + "…[truncated]"; continue; }
    out[k] = v;
  }
  return out;
}

/** Escalate patterns to security_incidents. */
async function correlate(input: LogAuditInput, ip: string | null) {
  const admin = supabaseAdmin();

  // Pattern 1: 5+ failed logins in 5 minutes from same IP
  if (input.actionCode === "auth.login_failed" && ip) {
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await admin.from("audit_logs").select("*", { count: "exact", head: true })
      .eq("action_code", "auth.login_failed").eq("ip_address", ip).gte("created_at", since);
    if ((count || 0) >= 5) {
      await admin.from("security_incidents").insert({
        kind: "brute_force_login",
        summary: `${count} failed logins from ${ip} in the last 5 minutes`,
        severity: "critical",
        ip_address: ip,
        metadata: { count, windowMinutes: 5 },
      });
    }
  }

  // Pattern 2: role escalation to super_admin
  if (input.actionCode === "admin.role_changed" && (input.metadata as Record<string, unknown>)?.newRole === "super_admin") {
    await admin.from("security_incidents").insert({
      kind: "role_escalation",
      summary: `${input.actorName || "Someone"} elevated a user to super_admin`,
      severity: "critical",
      actor_user_id: input.actorUserId ?? null,
      actor_name: input.actorName ?? null,
      ip_address: ip,
      metadata: input.metadata || {},
    });
  }
}

/** Convenience helpers */
export const logAdminAction = (p: Omit<LogAuditInput, "category">) =>
  logAudit({ ...p, category: "admin" });

export const logSecurityEvent = (p: Omit<LogAuditInput, "category"> & { severity?: Severity }) =>
  logAudit({ ...p, category: "security", severity: p.severity || "warning" });

/** Query helpers used by admin pages */
export interface AuditListFilters {
  search?: string;
  actorId?: string;
  category?: Category | "";
  severity?: Severity | "";
  success?: "true" | "false" | "";
  actionCode?: string;
  from?: string; // ISO
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(filters: AuditListFilters = {}) {
  const admin = supabaseAdmin();
  let q = admin.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (filters.actorId) q = q.eq("user_id", filters.actorId);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.severity) q = q.eq("severity", filters.severity);
  if (filters.success) q = q.eq("success", filters.success === "true");
  if (filters.actionCode) q = q.eq("action_code", filters.actionCode);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);
  if (filters.search) q = q.ilike("summary", `%${filters.search}%`);
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  q = q.range(offset, offset + limit - 1);
  const { data, count, error } = await q;
  if (error) return { rows: [], total: 0 };
  return { rows: data || [], total: count || 0 };
}

export async function getAuditLog(id: string) {
  const { data } = await supabaseAdmin().from("audit_logs").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listOpenIncidents(limit = 50) {
  const { data } = await supabaseAdmin().from("security_incidents").select("*").eq("status", "open").order("created_at", { ascending: false }).limit(limit);
  return data || [];
}

export async function resolveIncident(id: string, resolverUserId: string) {
  await supabaseAdmin().from("security_incidents")
    .update({ status: "resolved", resolved_at: new Date().toISOString(), resolved_by: resolverUserId })
    .eq("id", id);
}

/** Rolling activity counters for the monitor. */
export async function getActivityStats() {
  const admin = supabaseAdmin();
  const now = Date.now();
  const win = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();
  const [h1, h24, crit24, fail24, inc] = await Promise.all([
    admin.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", win(60)),
    admin.from("audit_logs").select("*", { count: "exact", head: true }).gte("created_at", win(24 * 60)),
    admin.from("audit_logs").select("*", { count: "exact", head: true }).eq("severity", "critical").gte("created_at", win(24 * 60)),
    admin.from("audit_logs").select("*", { count: "exact", head: true }).eq("success", false).gte("created_at", win(24 * 60)),
    admin.from("security_incidents").select("*", { count: "exact", head: true }).eq("status", "open"),
  ]);
  return {
    lastHour: h1.count || 0,
    last24h: h24.count || 0,
    criticals24h: crit24.count || 0,
    failures24h: fail24.count || 0,
    openIncidents: inc.count || 0,
  };
}

/** CSV serializer — no dependencies. */
export function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replaceAll('"', '""')}"`;
  };
  const header = keys.join(",");
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(",")).join("\n");
  return header + "\n" + body;
}
