"use client";

/* eslint-disable @next/next/no-img-element */
import type { EagleSubmission } from "@/app/actions/eagle";

const SECTION_META = [
  { id: "A", label: "Reflection Essay", max: 20 },
  { id: "B", label: "Three Pillars Audit", max: 15 },
  { id: "C", label: "Discipline Case Study", max: 15 },
  { id: "D", label: "4-Day Planner", max: 15 },
  { id: "E", label: "Goal-Setting Grid", max: 10 },
  { id: "F", label: "Design Challenge", max: 15 },
  { id: "G", label: "Career Ladder Map", max: 5 },
  { id: "H", label: "Eagle Covenant", max: 5 },
];

type SubmissionRow = EagleSubmission & {
  submitter: { full_name: string; track: string | null; avatar_url: string | null };
  scores_count: number;
};

interface Analytics {
  total: number;
  submitted: number;
  graded: number;
  late: number;
  avg_score: number | null;
  section_avg: Record<string, number>;
}

interface Props {
  analytics: Analytics | null;
  submissions: SubmissionRow[];
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "right" }}>
        {value !== null && value !== undefined ? value : "—"}
      </span>
    </div>
  );
}

export function EagleAnalyticsClient({ analytics, submissions }: Props) {
  if (!analytics) {
    return <div style={{ color: "#5A6478", padding: 40, textAlign: "center" }}>No data yet.</div>;
  }

  const submissionRate = analytics.total > 0
    ? Math.round(((analytics.submitted + analytics.late + analytics.graded) / analytics.total) * 100)
    : 0;

  const topTen = [...submissions]
    .filter((s) => s.total_score !== null)
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 10);

  // Find weakest section by avg score vs max
  const weakest = SECTION_META.reduce((worst, sec) => {
    const avg = analytics.section_avg[sec.id];
    if (!avg) return worst;
    const pct = (avg / sec.max) * 100;
    if (!worst || pct < worst.pct) return { id: sec.id, label: sec.label, avg, max: sec.max, pct };
    return worst;
  }, null as { id: string; label: string; avg: number; max: number; pct: number } | null);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#E8EDF5" }}>
        📊 Eagle Project Analytics
      </h1>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Interns", value: analytics.total, color: "#9CA3AF" },
          { label: "Submitted", value: analytics.submitted + analytics.late, color: "#4CAF50" },
          { label: "Late", value: analytics.late, color: "#FF7043" },
          { label: "Graded", value: analytics.graded, color: "#1E88E5" },
          { label: "Avg Score", value: analytics.avg_score !== null ? `${analytics.avg_score}/100` : "—", color: "#FFC107" },
          { label: "Submission Rate", value: `${submissionRate}%`, color: analytics.graded > 0 ? "#4CAF50" : "#FFC107" },
        ].map((st) => (
          <div key={st.label} style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: "#5A6478", fontSize: 11, marginBottom: 4 }}>{st.label.toUpperCase()}</div>
            <div style={{ color: st.color, fontSize: 22, fontWeight: 800 }}>{st.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Section averages */}
        <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>Section Averages</h2>
          {SECTION_META.map((sec) => {
            const avg = analytics.section_avg[sec.id] ?? 0;
            const pct = (avg / sec.max) * 100;
            const color = pct >= 70 ? "#4CAF50" : pct >= 50 ? "#FFC107" : "#EF5350";
            return (
              <div key={sec.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: "#E8EDF5", fontSize: 13 }}>Sec {sec.id} · {sec.label}</span>
                  <span style={{ color: "#5A6478", fontSize: 12 }}>{avg}/{sec.max}</span>
                </div>
                <Bar value={avg} max={sec.max} color={color} />
              </div>
            );
          })}
        </div>

        {/* Insights */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {weakest && (
            <div style={{ background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.15)", borderRadius: 12, padding: "18px 20px" }}>
              <h3 style={{ margin: "0 0 8px", color: "#EF5350", fontSize: 14, fontWeight: 700 }}>⚠️ Weakest Section</h3>
              <p style={{ margin: 0, color: "#E8EDF5", fontSize: 16, fontWeight: 700 }}>Section {weakest.id} — {weakest.label}</p>
              <p style={{ margin: "4px 0 0", color: "#9CA3AF", fontSize: 13 }}>
                Average: {weakest.avg}/{weakest.max} ({Math.round(weakest.pct)}%)
              </p>
              <p style={{ margin: "8px 0 0", color: "#9CA3AF", fontSize: 12, lineHeight: 1.6 }}>
                Interns are struggling most here. Consider dedicating class time to this section&rsquo;s concepts.
              </p>
            </div>
          )}
          <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 20px" }}>
            <h3 style={{ margin: "0 0 10px", color: "#E8EDF5", fontSize: 14, fontWeight: 700 }}>Submission Status Breakdown</h3>
            {[
              { label: "On-time submitted", value: analytics.submitted, total: analytics.total, color: "#4CAF50" },
              { label: "Late submitted", value: analytics.late, total: analytics.total, color: "#FF7043" },
              { label: "Graded", value: analytics.graded, total: analytics.total, color: "#1E88E5" },
              { label: "Not submitted", value: Math.max(0, analytics.total - analytics.submitted - analytics.late - analytics.graded), total: analytics.total, color: "#5A6478" },
            ].map((row) => (
              <div key={row.label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: "#9CA3AF", fontSize: 12 }}>{row.label}</span>
                  <span style={{ color: row.color, fontSize: 12, fontWeight: 700 }}>{row.value}</span>
                </div>
                <Bar value={row.value} max={row.total || 1} color={row.color} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top performers */}
      {topTen.length > 0 && (
        <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "20px 22px" }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>🏆 Top Performers</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {topTen.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
                <span style={{ color: i < 3 ? "#FFC107" : "#5A6478", fontWeight: 800, fontSize: 16, minWidth: 24 }}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                {s.submitter.avatar_url
                  ? <img src={s.submitter.avatar_url} alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
                  : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800 }}>{s.submitter.full_name.charAt(0)}</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#E8EDF5", fontWeight: 600, fontSize: 14 }}>{s.submitter.full_name}</div>
                  <div style={{ color: "#5A6478", fontSize: 12 }}>{s.submitter.track ?? "—"}</div>
                </div>
                <div style={{
                  color: (s.total_score ?? 0) >= 90 ? "#4CAF50" : (s.total_score ?? 0) >= 70 ? "#FFC107" : "#9CA3AF",
                  fontWeight: 800, fontSize: 18,
                }}>
                  {s.total_score}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
