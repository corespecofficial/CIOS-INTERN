"use client";
/* eslint-disable @next/next/no-img-element */

interface Props {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  roleCounts: Record<string, number>;
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  intern: { label: "Interns", color: "#1E88E5" },
  team_lead: { label: "Team Leads", color: "#66BB6A" },
  admin: { label: "Admins", color: "#AB47BC" },
  super_admin: { label: "Super Admins", color: "#EF5350" },
  instructor: { label: "Instructors", color: "#FFC107" },
  moderator: { label: "Moderators", color: "#FF7043" },
  finance: { label: "Finance", color: "#43A047" },
  support: { label: "Support", color: "#26C6DA" },
};

export function AnalyticsClient({ totalUsers, dau, wau, mau, roleCounts }: Props) {
  const retention = wau > 0 ? Math.round((dau / wau) * 100) : 0;
  const churn = mau > 0 ? Math.max(0, Math.round(100 - (wau / mau) * 100)) : 0;

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(30,136,229,0.12), rgba(255,193,7,0.08))",
        border: "1px solid rgba(30,136,229,0.2)",
        borderRadius: 16, padding: "20px 24px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <img src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png" alt="" style={{ width: 56, height: 56, borderRadius: "50%" }} />
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
            ANALYTICS
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "2px 0 2px 0" }}>Platform Analytics</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Real-time user engagement and growth metrics</p>
        </div>
      </div>

      {/* Top KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Kpi label="Total Users" value={totalUsers.toLocaleString()} color="#1E88E5" icon="👥" />
        <Kpi label="Daily Active (24h)" value={dau.toLocaleString()} color="#66BB6A" icon="🟢" />
        <Kpi label="Weekly Active" value={wau.toLocaleString()} color="#FFC107" icon="📅" />
        <Kpi label="Monthly Active" value={mau.toLocaleString()} color="#AB47BC" icon="📊" />
      </div>

      {/* Engagement row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <Kpi label="Retention (DAU/WAU)" value={`${retention}%`} color="#66BB6A" icon="🔁" />
        <Kpi label="Churn Risk (30d)" value={`${churn}%`} color={churn > 50 ? "#EF5350" : "#FFC107"} icon="⚠️" />
      </div>

      {/* Role distribution */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>User Distribution by Role</h3>
        {Object.keys(roleCounts).length === 0 ? (
          <p style={{ fontSize: 13, color: "#8892A4" }}>No users yet. Invite some to see analytics here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(roleCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([role, count]) => {
                const meta = ROLE_META[role] || { label: role, color: "#8892A4" };
                const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                return (
                  <div key={role}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#E8EDF5", fontWeight: 600 }}>{meta.label}</span>
                      <span style={{ color: meta.color, fontWeight: 700 }}>{count} · {pct}%</span>
                    </div>
                    <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 4, transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Revenue + Feature usage (placeholder — needs wiring to transactions table) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 12 }}>Revenue Overview</h3>
          <p style={{ fontSize: 13, color: "#8892A4", marginBottom: 8 }}>Total Revenue</p>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#FFC107", marginBottom: 4 }}>₦0</div>
          <p style={{ fontSize: 11, color: "#5A6478" }}>Configure Flutterwave to see verified revenue</p>
        </div>

        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 12 }}>Feature Usage</h3>
          <p style={{ fontSize: 13, color: "#8892A4" }}>Feature telemetry not yet instrumented. Add event logging to track.</p>
        </div>
      </div>

      <p style={{ fontSize: 11, color: "#5A6478", textAlign: "center", marginTop: 20 }}>
        Data refreshes on each page load · Live from Supabase
      </p>
    </div>
  );
}

function Kpi({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div style={{
      background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, padding: "18px 20px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}
