import { getCurrentDbUser } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuditLog, listAuditLogs } from "@/lib/audit";

export const dynamic = "force-dynamic";

const SEVERITY_COLOR: Record<string, string> = { info: "#8892A4", notice: "#1E88E5", warning: "#FFC107", critical: "#EF5350" };

export default async function AuditLogDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const { id } = await params;
  const log = await getAuditLog(id);
  if (!log) notFound();

  // Related: same actor, or same action_code recent
  const related = await listAuditLogs({
    actorId: log.user_id || undefined,
    actionCode: log.action_code || undefined,
    limit: 15,
  });

  const suggested = suggestNextAction(log);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <Link href="/admin/audit-logs" style={{ color: "#8892A4", fontSize: 12, textDecoration: "none" }}>← Back to logs</Link>

      <div style={{ background: "#111827", border: `1px solid ${SEVERITY_COLOR[log.severity] || "rgba(255,255,255,0.07)"}33`, borderRadius: 16, padding: 20, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${SEVERITY_COLOR[log.severity] || "#8892A4"}22`, color: SEVERITY_COLOR[log.severity] || "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{log.severity}</span>
              {!log.success && <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "rgba(239,83,80,0.15)", color: "#EF5350" }}>FAILED</span>}
              <span style={{ fontSize: 10, color: "#8892A4", fontFamily: "monospace" }}>{log.action_code || log.action}</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{log.summary}</h1>
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>{new Date(log.created_at).toLocaleString()}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Risk score</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: log.risk_score >= 60 ? "#EF5350" : log.risk_score >= 30 ? "#FFC107" : "#8892A4", fontFamily: "'Space Grotesk', sans-serif" }}>{log.risk_score || 0}</div>
          </div>
        </div>

        {suggested && (
          <div style={{ marginTop: 14, padding: 12, background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 10, fontSize: 12, color: "#FFC107" }}>
            💡 <strong>Suggested next action:</strong> {suggested}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <section style={panel}>
          <h2 style={sectionHeader}>👤 Actor</h2>
          <KV label="Name"       v={log.actor_name || "System"} />
          <KV label="Role"       v={log.actor_role || "-"} />
          <KV label="User ID"    v={log.user_id || "-"} mono />
          {log.user_id && <Link href={`/community/profile/${log.user_id}`} style={{ fontSize: 11, color: "#1E88E5" }}>View profile →</Link>}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>🖥️ Device & network</h2>
          <KV label="IP"         v={log.ip_address || "-"} mono />
          <KV label="Browser"    v={log.browser || "-"} />
          <KV label="OS"         v={log.os || "-"} />
          <KV label="Device"     v={log.device_type || "-"} />
          <KV label="Request ID" v={log.request_id || "-"} mono />
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>🎯 Target</h2>
          <KV label="Type"       v={log.entity_type || "-"} />
          <KV label="ID"         v={log.entity_id || "-"} mono />
          <KV label="Category"   v={log.category} />
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>🔍 Metadata</h2>
          <pre style={{ fontSize: 11, color: "#E8EDF5", background: "#0A0E1A", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 220, margin: 0, border: "1px solid rgba(255,255,255,0.05)" }}>
{JSON.stringify(log.metadata || {}, null, 2)}
          </pre>
        </section>
      </div>

      <section style={{ ...panel, marginTop: 14 }}>
        <h2 style={sectionHeader}>📜 Related events</h2>
        {related.rows.length <= 1 && <div style={{ fontSize: 12, color: "#8892A4" }}>No other events from this actor with this action.</div>}
        {related.rows.filter((r) => r.id !== log.id).map((r) => (
          <Link key={r.id} href={`/admin/audit-logs/${r.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5", fontSize: 12 }}>
            <span style={{ color: "#8892A4" }}>{new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span style={{ flex: 1, margin: "0 12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.summary}</span>
            <span style={{ fontSize: 10, color: SEVERITY_COLOR[r.severity] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{r.severity}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function KV({ label, v, mono }: { label: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
      <span style={{ color: "#8892A4" }}>{label}</span>
      <span style={{ color: "#E8EDF5", fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? 11 : 12 }}>{v}</span>
    </div>
  );
}

function suggestNextAction(log: { action_code: string | null; severity: string; success: boolean }): string | null {
  const code = log.action_code || "";
  if (code === "auth.login_failed") return "Check for brute force from this IP — security center will auto-open an incident at 5+ failures in 5 min.";
  if (code === "admin.role_changed") return "Confirm the role change was authorized. Critical escalations to super_admin are tracked as incidents.";
  if (code === "admin.user_banned") return "Verify the ban reason and notify affected teams.";
  if (code === "finance.payment_failed") return "Contact the user; check gateway status.";
  if (log.severity === "critical") return "Escalate to security owner; preserve evidence.";
  if (!log.success) return "Investigate the failure cause — check related events below.";
  return null;
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
