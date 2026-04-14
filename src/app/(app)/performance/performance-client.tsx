"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area,
} from "recharts";
import type { PersonalMetrics, TeamMember, Weights } from "@/lib/performance-shared";
import { grade, DEFAULT_WEIGHTS } from "@/lib/performance-shared";
import { saveWeights } from "@/app/actions/performance";
import { BehaviorInsightsCard } from "@/components/behavior-insights-card";

type Tab = "me" | "team" | "org" | "leaderboard";

interface TeamData {
  avgScore: number; totalMembers: number; active: number;
  topPerformers: TeamMember[]; lowActivity: TeamMember[];
  membersByScore: TeamMember[];
  attendanceAverage: number; taskCompletion: number;
}
interface OrgData {
  totalUsers: number; activeWeek: number; activeMonth: number;
  retentionPct: number; churnPct: number;
  courseCompletions: number; totalRevenue: number;
  finesCollected: number; rewardsIssued: number;
  usersByRole: { role: string; count: number }[];
  growthTrend: { date: string; total: number }[];
}

const COLORS = ["#1E88E5", "#AB47BC", "#FF7043", "#66BB6A", "#FFC107", "#26C6DA", "#EF5350", "#8892A4"];

export function PerformanceClient({
  me, personal, team, org, weights: initialWeights, canSetWeights,
}: {
  me: { id: string; name: string; role: string };
  personal: PersonalMetrics;
  team: TeamData | null;
  org: OrgData | null;
  weights: Weights;
  canSetWeights: boolean;
}) {
  const [tab, setTab] = useState<Tab>("me");

  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: "me", label: "👤 My performance", show: true },
    { key: "team", label: "👥 Team", show: !!team },
    { key: "org", label: "🏢 Organization", show: !!org },
    { key: "leaderboard", label: "🏆 Leaderboard", show: !!team },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
            PERFORMANCE ANALYTICS
          </span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Performance Intelligence</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Real numbers from real activity — charts update on every visit.</p>
        </div>
        <Link href="/api/my-analytics/pdf" download style={btnPrimary}>📄 Download report</Link>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16, overflowX: "auto" }}>
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.key ? "rgba(30,136,229,0.15)" : "transparent",
            color: tab === t.key ? "#1E88E5" : "#8892A4",
            border: "none", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "me" && <MyPerformance personal={personal} weights={initialWeights} canSetWeights={canSetWeights} />}
      {tab === "team" && team && <TeamPerformance team={team} />}
      {tab === "org" && org && <OrgPerformance org={org} />}
      {tab === "leaderboard" && team && <Leaderboard members={team.membersByScore} />}
    </div>
  );
}

/* ─────────────── Me ─────────────── */

function MyPerformance({ personal: p, weights, canSetWeights }: { personal: PersonalMetrics; weights: Weights; canSetWeights: boolean }) {
  const g = grade(p.total);
  const [showWeights, setShowWeights] = useState(false);

  const kpiData = [
    { label: "Performance Score", value: p.total, color: g.color, icon: "🎯", suffix: "%" },
    { label: "Total XP", value: p.xp, color: "#1E88E5", icon: "⭐" },
    { label: "Reputation", value: p.reputation, color: "#FFC107", icon: "🏆" },
    { label: "Level", value: p.level, color: "#AB47BC", icon: "🎖" },
    { label: "Streak", value: p.streak, color: "#FF7043", icon: "🔥", suffix: "d" },
  ];

  const activityData = p.weeklyActivity.map((d) => ({ name: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }), count: d.count }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Score hero */}
      <div style={{ background: "linear-gradient(135deg, #111827, rgba(30,136,229,0.1))", border: `1px solid ${g.color}40`, borderRadius: 18, padding: 24, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 120, height: 120 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={g.color} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(p.total / 100) * 326.7} 326.7`} transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 0.8s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 800, color: g.color }}>{p.total}</div>
            <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 700 }}>/ 100</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "inline-block", padding: "4px 12px", background: `${g.color}22`, color: g.color, fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5 }}>
            Grade {g.letter} · {g.tier}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "8px 0 4px 0" }}>Your performance score</h2>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Weighted blend of attendance, tasks, courses, community value, consistency, discipline, and revenue impact.</p>
          {canSetWeights && (
            <button onClick={() => setShowWeights(!showWeights)} style={{ ...btnGhost, marginTop: 8, padding: "6px 12px", fontSize: 11 }}>
              ⚙️ {showWeights ? "Hide" : "Configure"} weights
            </button>
          )}
        </div>
      </div>

      {showWeights && <WeightsEditor initial={weights} />}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {kpiData.map((k) => (
          <div key={k.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${k.color}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#8892A4", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{k.label}</span>
              <span style={{ fontSize: 14 }}>{k.icon}</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 800, color: k.color }}>
              <Counter to={k.value} />{k.suffix && <span style={{ fontSize: 14, color: "#8892A4", marginLeft: 2 }}>{k.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <style>{`@media (max-width: 820px) { .perf-grid-2 { grid-template-columns: 1fr !important; } }`}</style>
        {/* Radar */}
        <div className="perf-grid-2" style={panelBox}>
          <div style={panelTitle}>Skill balance</div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={p.skillBreakdown} outerRadius={88}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#8892A4", fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fill: "#5A6478", fontSize: 10 }} angle={90} domain={[0, 100]} />
              <Radar name="Score" dataKey="score" stroke="#1E88E5" fill="#1E88E5" fillOpacity={0.4} animationDuration={900} />
              <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily activity */}
        <div className="perf-grid-2" style={panelBox}>
          <div style={panelTitle}>Daily activity · last 14 days</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E88E5" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#1E88E5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "#8892A4", fontSize: 10 }} />
              <YAxis tick={{ fill: "#8892A4", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
              <Area type="monotone" dataKey="count" stroke="#1E88E5" fill="url(#actGrad)" strokeWidth={2} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live behavior pattern — auto-refreshing */}
      <div style={{ marginTop: 14 }}>
        <BehaviorInsightsCard />
      </div>

      {/* Attendance trend */}
      <div style={panelBox}>
        <div style={panelTitle}>Attendance · last 4 weeks</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={p.attendanceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="week" tick={{ fill: "#8892A4", fontSize: 11 }} />
            <YAxis tick={{ fill: "#8892A4", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
            <Bar dataKey="rate" fill="#66BB6A" radius={[6, 6, 0, 0]} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric breakdown */}
      <div style={panelBox}>
        <div style={panelTitle}>How your score breaks down</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Attendance", value: p.attendance, weight: weights.attendance, color: "#1E88E5" },
            { label: "Tasks", value: p.tasks, weight: weights.tasks, color: "#66BB6A" },
            { label: "Courses", value: p.courses, weight: weights.courses, color: "#AB47BC" },
            { label: "Community value", value: p.community, weight: weights.community, color: "#FFC107" },
            { label: "Consistency", value: p.consistency, weight: weights.consistency, color: "#FF7043" },
            { label: "Revenue impact", value: p.revenue, weight: weights.revenue, color: "#26C6DA" },
            { label: "Discipline", value: p.discipline, weight: weights.discipline, color: "#EF5350" },
          ].map((m) => (
            <div key={m.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#8892A4", marginBottom: 4 }}>
                <span style={{ color: "#E8EDF5", fontWeight: 600 }}>{m.label}</span>
                <span>{m.value}% · weight {m.weight}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${m.value}%`, height: "100%", background: m.color, transition: "width 0.8s ease" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeightsEditor({ initial }: { initial: Weights }) {
  const [w, setW] = useState<Weights>(initial);
  const [busy, setBusy] = useState(false);
  const total = Object.values(w).reduce((s, n) => s + n, 0);

  async function save() {
    setBusy(true);
    const r = await saveWeights(w);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Weights saved — refresh to recompute scores");
  }
  function reset() { setW(DEFAULT_WEIGHTS); }

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(171,71,188,0.25)", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#AB47BC", letterSpacing: 0.5, textTransform: "uppercase" }}>⚙️ Score weights (super admin)</div>
        <div style={{ fontSize: 11, color: total === 100 ? "#66BB6A" : "#FFC107" }}>Total: {total}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {(Object.keys(DEFAULT_WEIGHTS) as Array<keyof Weights>).map((k) => (
          <div key={k}>
            <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k}</div>
            <input type="number" min={0} max={100} value={w[k]} onChange={(e) => setW({ ...w, [k]: parseInt(e.target.value) || 0 })}
              style={{ width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#E8EDF5", fontSize: 13, outline: "none" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={save} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Save weights"}</button>
        <button onClick={reset} style={btnGhost}>Reset to default</button>
      </div>
    </div>
  );
}

/* ─────────────── Team ─────────────── */

function TeamPerformance({ team }: { team: TeamData }) {
  const topData = team.topPerformers.map((m) => ({ name: m.name.split(" ")[0], score: m.score }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        <Stat label="Team average" value={`${team.avgScore}%`} color="#1E88E5" icon="📈" />
        <Stat label="Members" value={team.totalMembers.toString()} color="#AB47BC" icon="👥" />
        <Stat label="Active (7d)" value={team.active.toString()} color="#66BB6A" icon="⚡" />
        <Stat label="Attendance" value={`${team.attendanceAverage}%`} color="#FFC107" icon="✓" />
        <Stat label="Tasks done" value={`${team.taskCompletion}%`} color="#FF7043" icon="📋" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="perf-grid-2">
        <div style={panelBox}>
          <div style={panelTitle}>Top performers</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: "#8892A4", fontSize: 11 }} domain={[0, 100]} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#E8EDF5", fontSize: 12 }} width={80} />
              <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
              <Bar dataKey="score" radius={[0, 6, 6, 0]} animationDuration={800}>
                {topData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={panelBox}>
          <div style={panelTitle}>Score distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={[
                  { name: "80-100", value: team.membersByScore.filter((m) => m.score >= 80).length },
                  { name: "60-79", value: team.membersByScore.filter((m) => m.score >= 60 && m.score < 80).length },
                  { name: "40-59", value: team.membersByScore.filter((m) => m.score >= 40 && m.score < 60).length },
                  { name: "Under 40", value: team.membersByScore.filter((m) => m.score < 40).length },
                ]}
                dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                animationDuration={800} label
              >
                {[0, 1, 2, 3].map((i) => <Cell key={i} fill={["#66BB6A", "#1E88E5", "#FFC107", "#EF5350"][i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {team.lowActivity.length > 0 && (
        <div style={panelBox}>
          <div style={panelTitle}>⚠️ Members who need attention</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {team.lowActivity.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#0A0E1A", borderRadius: 10 }}>
                <MemberAvatar m={m} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>Score {m.score}% · XP {m.xp} · streak {m.streak}d</div>
                </div>
                <Link href={`/profile/${m.id}`} style={btnGhost}>View</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Org ─────────────── */

function OrgPerformance({ org }: { org: OrgData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        <Stat label="Total users" value={org.totalUsers.toString()} color="#1E88E5" icon="👥" />
        <Stat label="Active (7d)" value={org.activeWeek.toString()} color="#66BB6A" icon="⚡" />
        <Stat label="Active (30d)" value={org.activeMonth.toString()} color="#AB47BC" icon="📅" />
        <Stat label="Retention" value={`${org.retentionPct}%`} color="#FFC107" icon="📈" />
        <Stat label="Churn" value={`${org.churnPct}%`} color="#EF5350" icon="📉" />
        <Stat label="Completions" value={org.courseCompletions.toString()} color="#26C6DA" icon="🎓" />
        <Stat label="Revenue" value={`₦${org.totalRevenue.toLocaleString()}`} color="#FFC107" icon="💰" />
        <Stat label="Rewards" value={`₦${org.rewardsIssued.toLocaleString()}`} color="#66BB6A" icon="🎁" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }} className="perf-grid-2">
        <div style={panelBox}>
          <div style={panelTitle}>Growth · last 30 days</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={org.growthTrend}>
              <defs>
                <linearGradient id="growGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1E88E5" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#1E88E5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: "#8892A4", fontSize: 9 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fill: "#8892A4", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
              <Line type="monotone" dataKey="total" stroke="#1E88E5" strokeWidth={3} dot={false} animationDuration={1000} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={panelBox}>
          <div style={panelTitle}>Users by role</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={org.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={90} animationDuration={800} label={({ role, count }) => `${role}: ${count}`}>
                {org.usersByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Leaderboard ─────────────── */

function Leaderboard({ members }: { members: TeamMember[] }) {
  const [sort, setSort] = useState<"score" | "xp" | "reputation" | "streak">("score");
  const sorted = useMemo(() => [...members].sort((a, b) => b[sort] - a[sort]), [members, sort]);

  return (
    <div style={panelBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={panelTitle}>Leaderboard · {sorted.length} users</div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["score", "xp", "reputation", "streak"] as const).map((s) => (
            <button key={s} onClick={() => setSort(s)} style={{
              padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: sort === s ? "#1E88E5" : "transparent", color: sort === s ? "#fff" : "#8892A4",
              border: sort === s ? "none" : "1px solid rgba(255,255,255,0.1)", textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sorted.map((m, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "";
          const g = grade(m.score);
          return (
            <Link key={m.id} href={`/profile/${m.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: i < 3 ? "rgba(255,193,7,0.05)" : "transparent", border: i < 3 ? "1px solid rgba(255,193,7,0.2)" : "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "inherit" }}>
              <span style={{ width: 26, fontSize: 13, fontWeight: 800, color: i < 3 ? "#FFC107" : "#5A6478", textAlign: "center" }}>{medal || i + 1}</span>
              <MemberAvatar m={m} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{m.name}</div>
                <div style={{ fontSize: 10, color: "#8892A4" }}>{m.role.replace("_", " ")} · ⭐ {m.xp} XP · 🏆 {m.reputation}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: g.color }}>{m.score}%</div>
                  <div style={{ fontSize: 9, color: "#5A6478", letterSpacing: 0.5 }}>{g.letter}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MemberAvatar({ m }: { m: TeamMember }) {
  if (m.avatarUrl) return <img src={m.avatarUrl} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />;
  const ini = (m.name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
  return <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{ini}</div>;
}

function Stat({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#8892A4", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 14 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Counter({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const start = Date.now(), duration = 900;
    const step = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [to]);
  return <>{n.toLocaleString()}</>;
}

const panelBox: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 };
const panelTitle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12 };
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
