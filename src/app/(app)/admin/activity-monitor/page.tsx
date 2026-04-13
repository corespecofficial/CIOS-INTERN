import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { getActivityStats, listAuditLogs } from "@/lib/audit";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SEVERITY_COLOR: Record<string, string> = { info: "#8892A4", notice: "#1E88E5", warning: "#FFC107", critical: "#EF5350" };

export default async function ActivityMonitorPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const admin = supabaseAdmin();
  const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [stats, latestRes, byCatRes, bySevRes] = await Promise.all([
    getActivityStats(),
    listAuditLogs({ limit: 20 }),
    admin.from("audit_logs").select("category").gte("created_at", since24),
    admin.from("audit_logs").select("severity").gte("created_at", since24),
  ]);

  const catCounts = new Map<string, number>();
  for (const row of (byCatRes.data || []) as Array<{ category: string }>) catCounts.set(row.category, (catCounts.get(row.category) || 0) + 1);
  const sevCounts = new Map<string, number>();
  for (const row of (bySevRes.data || []) as Array<{ severity: string }>) sevCounts.set(row.severity, (sevCounts.get(row.severity) || 0) + 1);

  const maxCat = Math.max(1, ...Array.from(catCounts.values()));
  const maxSev = Math.max(1, ...Array.from(sevCounts.values()));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>ACTIVITY MONITOR</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📊 Platform pulse · last 24h</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 14 }}>
        <Stat label="Events / hour" value={stats.lastHour} />
        <Stat label="Events / 24h" value={stats.last24h} />
        <Stat label="Critical" value={stats.criticals24h} color="#EF5350" />
        <Stat label="Failures" value={stats.failures24h} color="#FFC107" />
        <Stat label="Open incidents" value={stats.openIncidents} color="#FF7043" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <section style={panel}>
          <h2 style={sectionHeader}>By category</h2>
          {Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
            <div key={cat} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E8EDF5", marginBottom: 4 }}>
                <span style={{ textTransform: "capitalize" }}>{cat}</span><span style={{ color: "#8892A4" }}>{n}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${(n / maxCat) * 100}%`, height: "100%", background: "#1E88E5" }} />
              </div>
            </div>
          ))}
          {catCounts.size === 0 && <div style={{ color: "#8892A4", fontSize: 12 }}>No activity.</div>}
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>By severity</h2>
          {Array.from(sevCounts.entries()).sort((a, b) => b[1] - a[1]).map(([sev, n]) => (
            <div key={sev} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E8EDF5", marginBottom: 4 }}>
                <span style={{ textTransform: "uppercase", color: SEVERITY_COLOR[sev] }}>{sev}</span><span style={{ color: "#8892A4" }}>{n}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${(n / maxSev) * 100}%`, height: "100%", background: SEVERITY_COLOR[sev] || "#8892A4" }} />
              </div>
            </div>
          ))}
          {sevCounts.size === 0 && <div style={{ color: "#8892A4", fontSize: 12 }}>No activity.</div>}
        </section>
      </div>

      <section style={{ ...panel, marginTop: 14 }}>
        <h2 style={sectionHeader}>Latest 20 events</h2>
        {latestRes.rows.map((r) => (
          <Link key={r.id} href={`/admin/audit-logs/${r.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5", fontSize: 12 }}>
            <span style={{ color: "#8892A4", minWidth: 120 }}>{new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span style={{ flex: 1, margin: "0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.summary}</span>
            <span style={{ fontSize: 10, color: SEVERITY_COLOR[r.severity] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{r.severity}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value, color = "#1E88E5" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value.toLocaleString()}</div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
