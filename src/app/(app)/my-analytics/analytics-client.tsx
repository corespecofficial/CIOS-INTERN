"use client";
/* eslint-disable @next/next/no-img-element */

import type { StudentAnalytics } from "@/lib/db";
import toast from "react-hot-toast";

export function MyAnalyticsClient({ analytics, userName }: { analytics: StudentAnalytics | null; userName: string }) {
  if (!analytics) {
    return <div style={{ padding: 20, color: "#8892A4" }}>Unable to load your analytics.</div>;
  }

  async function downloadPdf() {
    const toastId = toast.loading("Generating PDF…");
    try {
      const res = await fetch(`/api/my-analytics/pdf`);
      if (!res.ok) { toast.error("PDF failed", { id: toastId }); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `CIOS-Analytics-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      toast.success("Downloaded", { id: toastId });
    } catch (e) { toast.error((e as Error).message, { id: toastId }); }
  }

  const maxCompletion = Math.max(1, ...analytics.completionLog.map((l) => l.count));
  const activeDays = analytics.completionLog.filter((l) => l.count > 0).length;
  const consistency = analytics.completionLog.length ? Math.round((activeDays / analytics.completionLog.length) * 100) : 0;
  const bestDay = analytics.completionLog.reduce((a, b) => (b.count > a.count ? b : a), { date: "", count: 0 });
  const percentile = analytics.totalUsers > 0 ? Math.max(1, Math.round((1 - analytics.rank / analytics.totalUsers) * 100)) : 0;

  const shareSummary = async () => {
    const text = `${userName}'s CIOS progress\n\n⏱ ${analytics.hoursLearned}h learned · 🎓 ${analytics.coursesCompleted} courses done\n⭐ ${analytics.xp.toLocaleString()} XP · 🔥 ${analytics.streak}d streak\n🏆 Ranked #${analytics.rank} of ${analytics.totalUsers} (top ${100 - percentile}%)\n📊 ${consistency}% daily consistency\n\nBuilt with CIOS — the AI-powered internship operating system.`;
    try { await navigator.clipboard.writeText(text); toast.success("Summary copied — paste anywhere"); }
    catch { toast.error("Clipboard blocked"); }
  };

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(102,187,106,0.08))",
        border: "1px solid rgba(30,136,229,0.2)",
        borderRadius: 18, padding: "20px 24px", marginBottom: 18,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 36 }}>📊</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.18)", color: "#1E88E5", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>
            MY LEARNING ANALYTICS
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{userName}&apos;s progress</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Track your growth. Export a PDF report for your portfolio.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={shareSummary} style={btnGhost}>🔗 Share summary</button>
          <button onClick={downloadPdf} style={btnPrimary}>📄 Download PDF report</button>
        </div>
      </div>

      {/* Insight strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 18 }}>
        <Insight emoji="🎯" label="Consistency" value={`${consistency}%`} sub={`${activeDays}/${analytics.completionLog.length || 14} active days`} color="#66BB6A" />
        <Insight emoji="📈" label="Best day" value={bestDay.count > 0 ? `${bestDay.count}` : "—"} sub={bestDay.date ? new Date(bestDay.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "no activity yet"} color="#FFC107" />
        <Insight emoji="🏆" label="Percentile" value={`top ${100 - percentile}%`} sub={`rank #${analytics.rank} of ${analytics.totalUsers}`} color="#AB47BC" />
        <Insight emoji="🔥" label="Streak" value={`${analytics.streak}d`} sub={analytics.streak > 0 ? "keep it going" : "log in daily to start"} color="#FF7043" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Stat label="Hours learned" value={analytics.hoursLearned.toString()} suffix="h" color="#1E88E5" icon="⏱" />
        <Stat label="Courses completed" value={analytics.coursesCompleted.toString()} color="#66BB6A" icon="🎓" />
        <Stat label="In progress" value={analytics.coursesInProgress.toString()} color="#FFC107" icon="📖" />
        <Stat label="Attendance" value={`${analytics.attendancePct}%`} color="#AB47BC" icon="✓" />
        <Stat label="Quiz average" value={`${analytics.quizAverage}%`} color="#26C6DA" icon="📝" />
        <Stat label="XP" value={analytics.xp.toLocaleString()} color="#FFC107" icon="⭐" />
        <Stat label="Streak" value={`${analytics.streak}d`} color="#FF7043" icon="🔥" />
        <Stat label="Rank" value={`#${analytics.rank}`} suffix={` / ${analytics.totalUsers}`} color="#EF5350" icon="🏆" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Activity chart */}
        <div style={panelBox}>
          <h3 style={panelTitle}>🗓 Activity — last 14 days</h3>
          {analytics.completionLog.length === 0 ? (
            <p style={empty}>No completions tracked yet.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, padding: "10px 0" }}>
              {analytics.completionLog.map((d) => {
                const h = Math.round((d.count / maxCompletion) * 100);
                return (
                  <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
                    <div title={`${d.count} on ${d.date}`} style={{ width: "100%", height: `${h}%`, background: "linear-gradient(to top, #1E88E5, #66BB6A)", borderRadius: "4px 4px 0 0", minHeight: 4 }} />
                    <span style={{ fontSize: 9, color: "#5A6478" }}>{new Date(d.date).getDate()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quiz scores */}
        <div style={panelBox}>
          <h3 style={panelTitle}>📝 Recent quiz attempts</h3>
          {analytics.quizAttempts.length === 0 ? (
            <p style={empty}>No quizzes taken yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {analytics.quizAttempts.slice(-6).reverse().map((q, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14 }}>{q.passed ? "✅" : "❌"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{q.title}</div>
                    <div style={{ fontSize: 10, color: "#8892A4" }}>{new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </div>
                  <div style={{ width: 80, display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${q.score}%`, height: "100%", background: q.passed ? "#66BB6A" : "#EF5350" }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: q.passed ? "#66BB6A" : "#EF5350", minWidth: 30, textAlign: "right" }}>{q.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courses in progress */}
        <div style={{ ...panelBox, gridColumn: "1 / -1" }}>
          <h3 style={panelTitle}>📚 Your courses</h3>
          {analytics.enrollments.length === 0 ? (
            <p style={empty}>You haven&apos;t enrolled in any course yet.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {analytics.enrollments.map((e, i) => {
                const color = e.progress === 100 ? "#66BB6A" : e.progress >= 50 ? "#FFC107" : "#1E88E5";
                return (
                  <div key={i} style={{ background: "#0A0E1A", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#E8EDF5", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${e.progress}%`, height: "100%", background: color }} />
                      </div>
                      <span style={{ fontSize: 11, color, fontWeight: 700, minWidth: 32, textAlign: "right" }}>{e.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 10, color: "#5A6478", textAlign: "center", marginTop: 18 }}>
        All data is real — pulled from course enrollments, attendance, quiz attempts, and task completions.
      </p>
    </div>
  );
}

function Stat({ label, value, suffix, color, icon }: { label: string; value: string; suffix?: string; color: string; icon: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 14 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 800, color }}>
        {value}{suffix && <span style={{ fontSize: 12, color: "#8892A4", marginLeft: 2 }}>{suffix}</span>}
      </div>
    </div>
  );
}

const panelBox: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 };
const panelTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#E8EDF5", margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: 0.5 };
const empty: React.CSSProperties = { fontSize: 12, color: "#8892A4" };
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "10px 18px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px",
  fontSize: 13, fontWeight: 700, cursor: "pointer",
};

function Insight({ emoji, label, value, sub, color }: { emoji: string; label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{emoji}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color, lineHeight: 1.15 }}>{value}</div>
        <div style={{ fontSize: 10, color: "#5A6478", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div>
      </div>
    </div>
  );
}
