import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { getActivityStats, listAuditLogs, listOpenIncidents } from "@/lib/audit";
import { isSentryEnabled } from "@/lib/observability";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ObservabilityPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const [stats, recentFailures, incidents] = await Promise.all([
    getActivityStats(),
    listAuditLogs({ success: "false", limit: 15 }),
    listOpenIncidents(10),
  ]);

  const sentryOn = isSentryEnabled();
  const env = process.env.NEXT_PUBLIC_SENTRY_ENV || process.env.NODE_ENV || "development";
  const release = process.env.NEXT_PUBLIC_APP_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || "local";
  const sentryUrl = process.env.NEXT_PUBLIC_SENTRY_PROJECT_URL;

  const healthy = stats.criticals24h === 0 && stats.openIncidents === 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>OBSERVABILITY</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🩺 System health</h1>
      </div>

      {/* System banner */}
      <div style={{
        background: healthy ? "linear-gradient(135deg, rgba(102,187,106,0.12), #111827)" : "linear-gradient(135deg, rgba(239,83,80,0.12), #111827)",
        border: `1px solid ${healthy ? "rgba(102,187,106,0.3)" : "rgba(239,83,80,0.3)"}`,
        borderRadius: 14, padding: 18, marginBottom: 16,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ fontSize: 36 }}>{healthy ? "✅" : "🚨"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>
            {healthy ? "All systems operational" : "Active issues detected"}
          </div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
            Environment <code style={{ color: "#1E88E5" }}>{env}</code> · Release <code style={{ color: "#1E88E5" }}>{release}</code>
          </div>
        </div>
        {sentryUrl && <Link href={sentryUrl} target="_blank" style={btn}>Open Sentry ↗</Link>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <Stat label="Events / hour"  value={stats.lastHour} />
        <Stat label="Failures / 24h" value={stats.failures24h}  color="#FFC107" />
        <Stat label="Critical / 24h" value={stats.criticals24h} color="#EF5350" />
        <Stat label="Open incidents" value={stats.openIncidents} color="#FF7043" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <section style={panel}>
          <h2 style={sectionHeader}>🔌 Sentry status</h2>
          <KV label="SDK installed"      v="@sentry/nextjs ✓" />
          <KV label="DSN configured"     v={sentryOn ? "Yes" : "No — set NEXT_PUBLIC_SENTRY_DSN"} />
          <KV label="Environment"        v={env} />
          <KV label="Release"            v={release} mono />
          <KV label="Session replay"     v="Masked inputs/media, 5% prod sample" />
          <KV label="Traces sample rate" v={process.env.NODE_ENV === "production" ? "10%" : "100%"} />
          <KV label="Source maps"        v={process.env.SENTRY_AUTH_TOKEN ? "Upload enabled" : "Disabled (no SENTRY_AUTH_TOKEN)"} />
          <KV label="Ad-block tunnel"    v="/monitoring" mono />
        </section>

        <section style={panel}>
          <h2 style={sectionHeader}>⚠️ Recent failures (from audit log)</h2>
          {recentFailures.rows.length === 0 && <div style={{ color: "#8892A4", fontSize: 12 }}>No recorded failures recently.</div>}
          {recentFailures.rows.map((r) => (
            <Link key={r.id} href={`/admin/audit-logs/${r.id}`} style={{ display: "block", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "#E8EDF5" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{r.summary}</div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{new Date(r.created_at).toLocaleString()} · {r.action_code}</div>
            </Link>
          ))}
        </section>
      </div>

      <section style={{ ...panel, marginTop: 14 }}>
        <h2 style={sectionHeader}>🚨 Open incidents</h2>
        {incidents.length === 0 && <div style={{ color: "#8892A4", fontSize: 12 }}>No open incidents.</div>}
        {incidents.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
            <div style={{ color: "#E8EDF5" }}>{i.summary}</div>
            <div style={{ color: "#8892A4", fontSize: 10 }}>{new Date(i.created_at).toLocaleString()}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value, color = "#1E88E5" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function KV({ label, v, mono }: { label: string; v: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
      <span style={{ color: "#8892A4" }}>{label}</span>
      <span style={{ color: "#E8EDF5", fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? 11 : 12 }}>{v}</span>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
const btn: React.CSSProperties = { padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" };
