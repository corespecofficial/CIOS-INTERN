import Link from "next/link";
import { getRecruiterKPIs } from "@/app/actions/recruiter";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const res = await getRecruiterKPIs();
  const k = res.ok ? res.data! : null;
  if (!k) return <div style={{ padding: 30, color: "#8892A4" }}>Unable to load metrics.</div>;

  const maxApp = Math.max(1, ...k.applicationsByDay.map((d) => d.count));
  const maxFunnel = Math.max(1, ...k.funnel.map((f) => f.count));
  const maxSkill = Math.max(1, ...k.skillTrends.map((s) => s.count));

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📊 Dashboard</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Live KPIs across all your listings</p>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Kpi label="Active listings"    value={k.activeListings}      color="#1E88E5" />
        <Kpi label="Total applicants"   value={k.totalApplicants}     color="#AB47BC" />
        <Kpi label="Shortlisted"        value={k.shortlisted}          color="#FFC107" />
        <Kpi label="Interviews"         value={k.interviewsScheduled} color="#26C6DA" />
        <Kpi label="Hires"              value={k.hires}                color="#66BB6A" />
        <Kpi label="Response rate"      value={`${k.responseRatePct}%`} color="#FF7043" />
        <Kpi label="Avg time to hire"   value={k.avgTimeToHireDays !== null ? `${k.avgTimeToHireDays}d` : "—"} color="#8892A4" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <section style={panel}>
          <h3 style={sectionH}>📈 Applications · last 30 days</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 160, padding: "0 4px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {k.applicationsByDay.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.count}`} style={{
                flex: 1, height: `${(d.count / maxApp) * 100}%`, minHeight: 2,
                background: d.count > 0 ? "linear-gradient(180deg, #1E88E5, rgba(30,136,229,0.2))" : "rgba(255,255,255,0.04)",
                borderRadius: "3px 3px 0 0",
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#5A6478", marginTop: 6 }}>
            <span>{k.applicationsByDay[0]?.day}</span>
            <span>today</span>
          </div>
        </section>

        <section style={panel}>
          <h3 style={sectionH}>🎯 Hiring funnel</h3>
          {k.funnel.map((f, i) => {
            const colors = ["#1E88E5", "#26C6DA", "#FFC107", "#AB47BC", "#66BB6A"];
            return (
              <div key={f.stage} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E8EDF5", marginBottom: 3 }}>
                  <span>{f.stage}</span><span style={{ color: "#8892A4" }}>{f.count}</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${(f.count / maxFunnel) * 100}%`, height: "100%", background: colors[i] }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <section style={panel}>
          <h3 style={sectionH}>🏆 Top listings</h3>
          {k.topListings.length === 0 && <Empty>No listings yet.</Empty>}
          {k.topListings.map((l, i) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 13, color: "#E8EDF5" }}>
                <span style={{ fontSize: 10, color: i === 0 ? "#FFC107" : "#8892A4", marginRight: 6 }}>#{i + 1}</span>
                {l.title}
              </div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>{l.applications} apps · {l.views} views</div>
            </div>
          ))}
        </section>

        <section style={panel}>
          <h3 style={sectionH}>🔥 In-demand skills</h3>
          {k.skillTrends.length === 0 && <Empty>No skills tracked yet.</Empty>}
          {k.skillTrends.map((s) => (
            <div key={s.skill} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E8EDF5", marginBottom: 2 }}>
                <span>{s.skill}</span><span style={{ color: "#8892A4" }}>{s.count}</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${(s.count / maxSkill) * 100}%`, height: "100%", background: "#FF7043" }} />
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Quick actions */}
      <section style={panel}>
        <h3 style={sectionH}>⚡ Quick actions</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/recruiter/opportunities" style={btnAction}>+ Post opportunity</Link>
          <Link href="/recruiter/talent-pool" style={btnAction}>🌟 Search talent</Link>
          <Link href="/recruiter/interviews" style={btnAction}>🎯 Schedule interview</Link>
          <Link href="/recruiter/reports" style={btnAction}>📄 Export reports</Link>
          <Link href="/recruiter/messages" style={btnAction}>💬 Messages</Link>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "14px 6px", fontSize: 12, color: "#5A6478" }}>{children}</div>;
}
const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const sectionH: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
const btnAction: React.CSSProperties = { padding: "8px 14px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" };
