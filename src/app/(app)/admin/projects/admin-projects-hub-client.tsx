"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import toast from "react-hot-toast";
import {
  archiveProject, publishProject,
  gradeProjectSection, finalizeProjectGrading, getProjectSubmissionById,
} from "@/app/actions/custom-projects";
import {
  gradeEagleSection, finalizeEagleGrading, getEagleSubmissionById,
  type EagleSubmission, type SectionScore,
} from "@/app/actions/eagle";
import type { Project, ProjectSubmission, SectionConfig, ProjectSectionScore } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_LABELS, SECTION_TYPE_ICONS } from "@/app/actions/custom-projects-types";
import { SectionRenderer } from "@/components/projects/section-renderer";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectWithCount = Project & { submission_count: number };

type EagleSubRow = EagleSubmission & {
  submitter: { full_name: string; track: string | null; avatar_url: string | null };
  scores_count: number;
};

type EagleDetailSub = EagleSubmission & {
  section_scores: SectionScore[];
  submitter: { full_name: string; track: string | null; avatar_url: string | null } | null;
};

interface EagleAnalytics {
  total: number; submitted: number; graded: number; late: number;
  avg_score: number | null; section_avg: Record<string, number>;
}

type FullProjectSub = ProjectSubmission & {
  section_scores: ProjectSectionScore[];
  submitter: { full_name: string; avatar_url: string | null } | null;
  project: { title: string; sections: SectionConfig[] };
};

interface Props {
  projects: ProjectWithCount[];
  eagleSubmissions: EagleSubRow[];
  eagleAnalytics: EagleAnalytics | null;
  defaultTab: "projects" | "grading" | "analytics" | "eagle-grading" | "eagle-analytics";
}

// ── Style helpers ─────────────────────────────────────────────────────────────

const S = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "24px 20px" } as React.CSSProperties,
  card: { background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 } as React.CSSProperties,
  cardPad: { background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 24px" } as React.CSSProperties,
  h1: { margin: 0, fontSize: 22, fontWeight: 800, color: "#E8EDF5" } as React.CSSProperties,
  h2: { margin: "0 0 14px", fontSize: 17, fontWeight: 700, color: "#E8EDF5" } as React.CSSProperties,
  label: { color: "#5A6478", fontSize: 12, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.06em" },
  input: {
    width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "9px 14px",
    boxSizing: "border-box" as const, outline: "none",
  },
  textarea: {
    width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, color: "#E8EDF5", fontSize: 13, padding: "10px 14px",
    resize: "vertical" as const, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none",
  },
  btn: (color = "#1E88E5") => ({
    padding: "8px 18px", borderRadius: 8, border: `1px solid ${color}40`,
    background: `${color}18`, color, cursor: "pointer", fontSize: 13, fontWeight: 600,
  } as React.CSSProperties),
  btnPrimary: {
    padding: "10px 22px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg,#1E88E5,#FFC107)",
    color: "#0A0E1A", cursor: "pointer", fontWeight: 800, fontSize: 14,
  } as React.CSSProperties,
  statCard: { background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" } as React.CSSProperties,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#9CA3AF", submitted: "#4CAF50", late: "#FF7043", graded: "#1E88E5",
  published: "#4CAF50", archived: "#5A6478",
};

// ── Eagle Grading Tab ─────────────────────────────────────────────────────────

const EAGLE_SECTIONS = [
  { id: "A", label: "Reflection Essay", max: 20 },
  { id: "B", label: "Three Pillars Audit", max: 15 },
  { id: "C", label: "Discipline Case Study", max: 15 },
  { id: "D", label: "4-Day Planner", max: 15 },
  { id: "E", label: "Goal-Setting Grid", max: 10 },
  { id: "F", label: "Design Challenge", max: 15 },
  { id: "G", label: "Career Ladder Map", max: 5 },
  { id: "H", label: "Eagle Covenant", max: 5 },
];

function EagleGradingTab({ submissions: initial }: { submissions: EagleSubRow[] }) {
  const isMobile = useIsMobile();
  const [submissions, setSubmissions] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EagleDetailSub | null>(null);
  const [sectionScores, setSectionScores] = useState<Record<string, number>>({});
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [saving, startSave] = useTransition();
  const [finalizing, startFinalize] = useTransition();
  const [loadingDetail, startDetail] = useTransition();

  const visible = submissions.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.submitter.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: submissions.length,
    submitted: submissions.filter((s) => s.status === "submitted").length,
    late: submissions.filter((s) => s.status === "late").length,
    graded: submissions.filter((s) => s.status === "graded").length,
    pending: submissions.filter((s) => ["submitted", "late"].includes(s.status)).length,
  };

  function openDetail(sub: EagleSubRow) {
    startDetail(async () => {
      const res = await getEagleSubmissionById(sub.id);
      if (!res.ok) { toast.error(res.error); return; }
      setSelected(res.data);
      const scores: Record<string, number> = {};
      const feedback: Record<string, string> = {};
      for (const sc of res.data.section_scores) {
        scores[sc.section] = sc.score;
        feedback[sc.section] = sc.feedback ?? "";
      }
      setSectionScores(scores);
      setSectionFeedback(feedback);
      setOverallFeedback(res.data.overall_feedback ?? "");
    });
  }

  function saveSection(section: string) {
    startSave(async () => {
      if (!selected) return;
      const res = await gradeEagleSection(selected.id, section, sectionScores[section] ?? 0, sectionFeedback[section] ?? "");
      if (res.ok) toast.success(`Section ${section} saved`);
      else toast.error(res.error);
    });
  }

  function finalize() {
    startFinalize(async () => {
      if (!selected) return;
      const res = await finalizeEagleGrading(selected.id, overallFeedback);
      if (res.ok) {
        toast.success(`Graded! Total: ${res.data.total_score}/100`);
        setSubmissions((prev) => prev.map((s) => s.id === selected.id ? { ...s, status: "graded" as const, total_score: res.data.total_score } : s));
        setSelected(null);
      } else toast.error(res.error);
    });
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", value: stats.total, color: "#E8EDF5" },
          { label: "Submitted", value: stats.submitted, color: "#4CAF50" },
          { label: "Late", value: stats.late, color: "#FF7043" },
          { label: "Graded", value: stats.graded, color: "#1E88E5" },
          { label: "Pending", value: stats.pending, color: "#FFC107" },
        ].map((s) => (
          <div key={s.label} style={S.statCard}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {!selected ? (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search intern..."
              style={{ ...S.input, flex: isMobile ? "1 1 100%" : undefined, width: isMobile ? undefined : 200 }}
            />
            {["all", "submitted", "late", "graded"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: filter === f ? "rgba(30,136,229,0.2)" : "rgba(255,255,255,0.04)",
                color: filter === f ? "#1E88E5" : "#9CA3AF",
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ ...S.card, overflowX: isMobile ? "auto" : undefined }}>
            {visible.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#5A6478" }}>No submissions match the filter.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 560 : undefined }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Intern", "Track", "Status", "Submitted", "Score", "Graded", ""].map((h) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#5A6478", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {s.submitter.avatar_url
                            ? <img src={s.submitter.avatar_url} alt="" width={30} height={30} style={{ borderRadius: "50%" }} />
                            : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 12 }}>{s.submitter.full_name.charAt(0)}</div>
                          }
                          <span style={{ color: "#E8EDF5", fontSize: 13 }}>{s.submitter.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>{s.submitter.track ?? "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[s.status]}22`, color: STATUS_COLORS[s.status] }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: s.total_score !== null ? "#4CAF50" : "#5A6478", fontSize: 14, fontWeight: 700 }}>
                        {s.total_score !== null ? `${s.total_score}/100` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>{s.scores_count}/8</td>
                      <td style={{ padding: "12px 16px" }}>
                        {["submitted", "late", "graded"].includes(s.status) && (
                          <button onClick={() => openDetail(s)} disabled={loadingDetail} style={S.btn(s.status === "graded" ? "#5A6478" : "#1E88E5")}>
                            {s.status === "graded" ? "Review" : "Grade"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        /* Grading panel */
        <div>
          <button onClick={() => setSelected(null)} style={{ marginBottom: 16, ...S.btn("#9CA3AF") }}>
            ← Back to list
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            {selected.submitter?.avatar_url
              ? <img src={selected.submitter.avatar_url} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
              : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 17 }}>{selected.submitter?.full_name?.charAt(0)}</div>
            }
            <div>
              <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 17 }}>{selected.submitter?.full_name}</div>
              <div style={{ color: "#5A6478", fontSize: 12 }}>{selected.submitter?.track}</div>
            </div>
          </div>

          {EAGLE_SECTIONS.map((sec) => {
            const secData = selected[`section_${sec.id.toLowerCase()}` as keyof EagleSubmission] as Record<string, unknown>;
            const hasContent = secData && Object.keys(secData).length > 0;
            return (
              <div key={sec.id} style={{ ...S.cardPad, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, color: "#E8EDF5", fontSize: 14, fontWeight: 700 }}>
                    Section {sec.id} — {sec.label} <span style={{ color: "#5A6478", fontWeight: 400 }}>({sec.max} pts)</span>
                  </h3>
                  <button onClick={() => saveSection(sec.id)} disabled={saving} style={S.btn("#1E88E5")}>
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
                {hasContent && (
                  <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, maxHeight: 160, overflowY: "auto" }}>
                    <pre style={{ margin: 0, color: "#9CA3AF", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                      {JSON.stringify(secData, null, 2)}
                    </pre>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "180px 1fr", gap: 14 }}>
                  <div>
                    <div style={{ ...S.label, marginBottom: 8 }}>Score (0–{sec.max})</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                      {[0, 25, 50, 75, 100].map((pct) => {
                        const val = Math.round((pct / 100) * sec.max);
                        return (
                          <button key={pct}
                            onClick={() => setSectionScores((p) => ({ ...p, [sec.id]: val }))}
                            style={{
                              padding: "4px 8px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11,
                              background: sectionScores[sec.id] === val ? "linear-gradient(135deg,#1E88E5,#FFC107)" : "rgba(255,255,255,0.06)",
                              color: sectionScores[sec.id] === val ? "#0A0E1A" : "#9CA3AF", fontWeight: 600,
                            }}>
                            {pct}%
                          </button>
                        );
                      })}
                    </div>
                    <input type="number" min={0} max={sec.max}
                      value={sectionScores[sec.id] ?? ""}
                      onChange={(e) => setSectionScores((p) => ({ ...p, [sec.id]: Math.min(sec.max, Math.max(0, Number(e.target.value))) }))}
                      placeholder={`0–${sec.max}`}
                      style={S.input}
                    />
                  </div>
                  <div>
                    <div style={{ ...S.label, marginBottom: 8 }}>Feedback</div>
                    <textarea rows={3} value={sectionFeedback[sec.id] ?? ""}
                      onChange={(e) => setSectionFeedback((p) => ({ ...p, [sec.id]: e.target.value }))}
                      placeholder="What did they do well? What could improve?"
                      style={S.textarea}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div style={{ ...S.cardPad, border: "1px solid rgba(255,193,7,0.2)" }}>
            <h3 style={{ margin: "0 0 12px", color: "#FFC107", fontSize: 14 }}>Overall Feedback</h3>
            <textarea rows={4} value={overallFeedback} onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Overall coaching feedback for this intern..."
              style={S.textarea}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <div style={{ color: "#5A6478", fontSize: 13 }}>
                Total: <strong style={{ color: "#E8EDF5" }}>{Object.values(sectionScores).reduce((a, b) => a + b, 0)}/100</strong>
              </div>
              <button onClick={finalize} disabled={finalizing} style={S.btnPrimary}>
                {finalizing ? "Finalizing..." : "✅ Finalize & Notify Intern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Eagle Analytics Tab ───────────────────────────────────────────────────────

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 700, minWidth: 36, textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}

function EagleAnalyticsTab({ analytics, submissions }: { analytics: EagleAnalytics | null; submissions: EagleSubRow[] }) {
  const isMobile = useIsMobile();
  if (!analytics) return <div style={{ color: "#5A6478", padding: 40, textAlign: "center" }}>No eagle project data yet.</div>;

  const submissionRate = analytics.total > 0
    ? Math.round(((analytics.submitted + analytics.late + analytics.graded) / analytics.total) * 100) : 0;

  const topTen = [...submissions]
    .filter((s) => s.total_score !== null)
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 10);

  const weakest = EAGLE_SECTIONS.reduce((worst, sec) => {
    const avg = analytics.section_avg[sec.id];
    if (!avg) return worst;
    const pct = (avg / sec.max) * 100;
    if (!worst || pct < worst.pct) return { id: sec.id, label: sec.label, avg, max: sec.max, pct };
    return worst;
  }, null as { id: string; label: string; avg: number; max: number; pct: number } | null);

  const COLORS = ["#1E88E5", "#4CAF50", "#FFC107", "#FF7043", "#AB47BC", "#00BCD4", "#E91E63", "#8BC34A"];

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Total interns", value: analytics.total, color: "#E8EDF5" },
          { label: "Submitted", value: analytics.submitted + analytics.late + analytics.graded, color: "#4CAF50" },
          { label: "Graded", value: analytics.graded, color: "#1E88E5" },
          { label: "Late", value: analytics.late, color: "#FF7043" },
          { label: "Submission rate", value: `${submissionRate}%`, color: "#FFC107" },
          { label: "Avg score", value: analytics.avg_score !== null ? `${analytics.avg_score}/100` : "—", color: "#AB47BC" },
        ].map((s) => (
          <div key={s.label} style={S.statCard}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16 }}>
        {/* Section averages */}
        <div style={S.cardPad}>
          <h2 style={S.h2}>Section Average Scores</h2>
          {EAGLE_SECTIONS.map((sec, i) => {
            const avg = analytics.section_avg[sec.id] ?? 0;
            return (
              <div key={sec.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#E8EDF5", fontSize: 13 }}>Section {sec.id} — {sec.label}</span>
                  <span style={{ color: "#5A6478", fontSize: 12 }}>{avg.toFixed(1)}/{sec.max}</span>
                </div>
                <Bar value={avg} max={sec.max} color={COLORS[i % COLORS.length]} />
              </div>
            );
          })}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Weakest section */}
          {weakest && (
            <div style={{ ...S.cardPad, border: "1px solid rgba(255,193,7,0.2)" }}>
              <div style={{ fontSize: 11, color: "#FFC107", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Coaching Gap</div>
              <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 15 }}>Section {weakest.id}</div>
              <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>{weakest.label}</div>
              <div style={{ marginTop: 10 }}>
                <Bar value={weakest.avg} max={weakest.max} color="#FF7043" />
              </div>
              <div style={{ color: "#5A6478", fontSize: 11, marginTop: 6 }}>{weakest.pct.toFixed(0)}% of max — lowest performing section</div>
            </div>
          )}

          {/* Top performers */}
          <div style={S.cardPad}>
            <h2 style={{ ...S.h2, fontSize: 14 }}>Top 10 Performers</h2>
            {topTen.length === 0
              ? <div style={{ color: "#5A6478", fontSize: 13 }}>No graded submissions yet.</div>
              : topTen.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ color: i < 3 ? "#FFC107" : "#5A6478", fontWeight: 800, minWidth: 18, fontSize: 13 }}>#{i + 1}</span>
                  {s.submitter.avatar_url
                    ? <img src={s.submitter.avatar_url} alt="" width={28} height={28} style={{ borderRadius: "50%" }} />
                    : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 11 }}>{s.submitter.full_name.charAt(0)}</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#E8EDF5", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.submitter.full_name}</div>
                    <div style={{ color: "#5A6478", fontSize: 11 }}>{s.submitter.track ?? "—"}</div>
                  </div>
                  <span style={{ color: "#4CAF50", fontWeight: 800, fontSize: 13 }}>{s.total_score}/100</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Custom Project Grading Panel ──────────────────────────────────────────────

type CustomSubRow = ProjectSubmission & {
  submitter: { full_name: string; avatar_url: string | null };
  section_scores_count: number;
};

function CustomProjectGradingPanel({
  submissionId, sections, onClose,
}: { submissionId: string; sections: SectionConfig[]; onClose: () => void }) {
  const isMobile = useIsMobile();
  const [submission, setSubmission] = useState<FullProjectSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, { score: string; feedback: string }>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id ?? null);
  const [isPending, startTransition] = useTransition();
  const [savedSections, setSavedSections] = useState<Set<string>>(new Set());

  useState(() => {
    getProjectSubmissionById(submissionId).then((res) => {
      if (res.ok) {
        setSubmission(res.data as FullProjectSub);
        const initial: Record<string, { score: string; feedback: string }> = {};
        for (const sc of res.data.section_scores) {
          initial[sc.section_id] = { score: String(sc.score), feedback: sc.feedback ?? "" };
        }
        setScores(initial);
        setOverallFeedback(res.data.overall_feedback ?? "");
      }
      setLoading(false);
    });
  });

  const answers = (submission?.answers ?? {}) as Record<string, unknown>;
  const totalScored = sections.reduce((sum, sec) => sum + (parseInt(scores[sec.id]?.score ?? "0") || 0), 0);
  const totalMax = sections.reduce((s, sec) => s + sec.points, 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ width: "min(780px, 95vw)", background: "#0A0E1A", borderLeft: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0D1117" }}>
          <div>
            <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 15 }}>Grading Panel</div>
            {submission && (
              <div style={{ color: "#5A6478", fontSize: 12, marginTop: 2 }}>
                {submission.submitter?.full_name} · {totalScored}/{totalMax} pts
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 22 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#5A6478" }}>Loading...</div>
        ) : !submission ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#5A6478" }}>Not found.</div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }}>
            {/* Section sidebar */}
            <div style={isMobile
              ? { borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "8px 10px", background: "#0D1117", display: "flex", gap: 6, overflowX: "auto" }
              : { width: 170, borderRight: "1px solid rgba(255,255,255,0.07)", padding: 10, overflowY: "auto", background: "#0D1117" }
            }>
              {sections.map((sec) => {
                const saved = savedSections.has(sec.id);
                return (
                  <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                    style={isMobile ? {
                      flexShrink: 0, padding: "6px 12px", borderRadius: 20,
                      border: activeSection === sec.id ? "1px solid rgba(30,136,229,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      background: activeSection === sec.id ? "rgba(30,136,229,0.15)" : "transparent",
                      cursor: "pointer", whiteSpace: "nowrap" as const,
                    } : {
                      width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8,
                      border: activeSection === sec.id ? "1px solid rgba(30,136,229,0.4)" : "1px solid transparent",
                      background: activeSection === sec.id ? "rgba(30,136,229,0.1)" : "transparent",
                      cursor: "pointer", marginBottom: 4,
                    }}>
                    {isMobile ? (
                      <span style={{ color: activeSection === sec.id ? "#1E88E5" : "#9CA3AF", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        {SECTION_TYPE_ICONS[sec.type]}
                        {sec.label.slice(0, 14)}
                        {saved && <span style={{ color: "#4CAF50" }}>✓</span>}
                      </span>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#E8EDF5", fontSize: 12, fontWeight: 600 }}>
                            {SECTION_TYPE_ICONS[sec.type]}
                          </span>
                          {saved && <span style={{ color: "#4CAF50", fontSize: 11 }}>✓</span>}
                        </div>
                        <div style={{ color: "#9CA3AF", fontSize: 11, marginTop: 2 }} title={sec.label}>{sec.label.slice(0, 20)}</div>
                        <div style={{ color: "#5A6478", fontSize: 10, marginTop: 1 }}>
                          {scores[sec.id]?.score !== undefined ? `${scores[sec.id].score}/${sec.points}` : `—/${sec.points}`}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Grade area */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {activeSection ? (() => {
                const sec = sections.find((s) => s.id === activeSection);
                if (!sec) return null;
                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 20 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                      <div>
                        <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 14 }}>{sec.label}</div>
                        <div style={{ color: "#5A6478", fontSize: 12 }}>{SECTION_TYPE_LABELS[sec.type]} · {sec.points} pts</div>
                      </div>
                    </div>

                    {/* Intern answer */}
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                      <div style={{ ...S.label, marginBottom: 10 }}>Intern&apos;s Answer</div>
                      <SectionRenderer section={sec} answer={answers[sec.id]} readOnly />
                    </div>

                    {/* Score input */}
                    <div style={S.cardPad}>
                      <div style={{ ...S.label, marginBottom: 10 }}>Your Grade</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                        <input type="number"
                          value={scores[activeSection]?.score ?? ""}
                          onChange={(e) => setScores((p) => ({ ...p, [activeSection]: { ...p[activeSection], score: e.target.value } }))}
                          min={0} max={sec.points}
                          placeholder="0"
                          style={{ ...S.input, width: 80, textAlign: "center", fontWeight: 700 }}
                        />
                        <span style={{ color: "#5A6478", fontSize: 13 }}>/ {sec.points}</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[0, 25, 50, 75, 100].map((pct) => (
                            <button key={pct}
                              onClick={() => setScores((p) => ({ ...p, [activeSection]: { ...p[activeSection], score: String(Math.round((pct / 100) * sec.points)) } }))}
                              style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#9CA3AF", cursor: "pointer", fontSize: 11 }}>
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea rows={3}
                        value={scores[activeSection]?.feedback ?? ""}
                        onChange={(e) => setScores((p) => ({ ...p, [activeSection]: { ...p[activeSection], feedback: e.target.value } }))}
                        placeholder="Feedback for this section..."
                        style={S.textarea}
                      />
                      <button onClick={async () => {
                        const entry = scores[activeSection];
                        if (!entry) return;
                        startTransition(async () => {
                          const res = await gradeProjectSection(submissionId, activeSection, sec.points, parseInt(entry.score) || 0, entry.feedback || "");
                          if (res.ok) { setSavedSections((p) => new Set([...p, activeSection])); toast.success("Saved!"); }
                          else toast.error(res.error);
                        });
                      }} disabled={isPending} style={{ ...S.btn("#1E88E5"), marginTop: 10 }}>
                        {isPending ? "Saving..." : savedSections.has(activeSection) ? "Update Score" : "Save Score"}
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#5A6478" }}>
                  Select a section to grade
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {submission && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "#0D1117" }}>
            <textarea rows={2} value={overallFeedback} onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Overall feedback..."
              style={{ ...S.textarea, marginBottom: 12 }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#5A6478", fontSize: 13 }}>
                Total: <strong style={{ color: "#E8EDF5" }}>{totalScored}/{totalMax}</strong>
                {totalMax > 0 && <span style={{ color: "#5A6478", marginLeft: 6, fontSize: 11 }}>({Math.round((totalScored / totalMax) * 100)}%)</span>}
              </div>
              <button onClick={() => {
                if (!confirm("Finalize grading? This will notify the intern.")) return;
                startTransition(async () => {
                  const res = await finalizeProjectGrading(submissionId, overallFeedback || "");
                  if (res.ok) { toast.success("Graded!"); onClose(); }
                  else toast.error(res.error);
                });
              }} disabled={isPending || submission.status === "graded"} style={S.btnPrimary}>
                {submission.status === "graded" ? "Already Graded" : isPending ? "Finalizing..." : "✅ Finalize Grading"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────

function ProjectsTab({ projects, onNewProject, onEditProject }: {
  projects: ProjectWithCount[];
  onNewProject: () => void;
  onEditProject: (id: string) => void;
}) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"all" | "draft" | "published" | "archived">("all");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [gradingProject, setGradingProject] = useState<{ id: string; sections: SectionConfig[] } | null>(null);
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);

  // Per-project submissions list (lazy loaded)
  type SubItem = { id: string; submitter_name: string; status: string; total_score: number | null };
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [projectSubs, setProjectSubs] = useState<Record<string, SubItem[]>>({});
  const [loadingSubs, startLoadSubs] = useTransition();

  const filtered = projects.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: projects.length,
    draft: projects.filter((p) => p.status === "draft").length,
    published: projects.filter((p) => p.status === "published").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  function handlePublish(id: string) {
    setActionId(id);
    startTransition(async () => {
      const res = await publishProject(id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Project published!");
      setActionId(null);
    });
  }

  function handleArchive(id: string) {
    if (!confirm("Archive this project?")) return;
    setActionId(id);
    startTransition(async () => {
      const res = await archiveProject(id);
      if (!res.ok) toast.error(res.error);
      setActionId(null);
    });
  }

  function toggleExpand(project: ProjectWithCount) {
    if (expandedProject === project.id) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(project.id);
    if (projectSubs[project.id]) return;
    // Load submissions lazily via getProjectSubmissions action
    startLoadSubs(async () => {
      const { getProjectSubmissions } = await import("@/app/actions/custom-projects");
      const res = await getProjectSubmissions(project.id);
      if (res.ok) {
        setProjectSubs((p) => ({
          ...p,
          [project.id]: res.data.map((s) => ({
            id: s.id,
            submitter_name: s.submitter.full_name,
            status: s.status,
            total_score: s.total_score,
          })),
        }));
      }
    });
  }

  return (
    <div>
      {gradingSubId && gradingProject && (
        <CustomProjectGradingPanel
          submissionId={gradingSubId}
          sections={gradingProject.sections}
          onClose={() => { setGradingSubId(null); setGradingProject(null); }}
        />
      )}

      {/* Top bar */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 10 : 0, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flexWrap: isMobile ? "wrap" : "nowrap" }}>
          {(["all", "draft", "published", "archived"] as const).map((s) => (
            <button key={s} onClick={() => setTab(s)} style={{
              padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0,
              background: tab === s ? "rgba(30,136,229,0.2)" : "rgba(255,255,255,0.04)",
              color: tab === s ? "#1E88E5" : "#9CA3AF",
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>
        <button onClick={onNewProject} style={{ ...S.btnPrimary, width: isMobile ? "100%" : "auto" }}>+ New Project</button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍  Search projects..."
        style={{ ...S.input, marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <div style={{ ...S.cardPad, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.3 }}>📋</div>
          <div style={{ color: "#5A6478" }}>No projects found. {tab === "all" && "Create your first project."}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((project) => (
            <div key={project.id} style={{ ...S.card, overflow: "hidden" }}>
              {/* Project row */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px" }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{project.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 14 }}>{project.title}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[project.status]}22`, color: STATUS_COLORS[project.status] }}>
                      {project.status}
                    </span>
                  </div>
                  <div style={{ color: "#9CA3AF", fontSize: 12, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.description}</div>
                  <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ color: "#5A6478", fontSize: 11 }}>📦 {project.sections.length} sections</span>
                    <span style={{ color: "#5A6478", fontSize: 11 }}>📬 {project.submission_count} submissions</span>
                    <span style={{ color: "#5A6478", fontSize: 11 }}>⚡ {project.xp_on_submit} XP</span>
                    {project.deadline && <span style={{ color: "#5A6478", fontSize: 11 }}>⏰ {new Date(project.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => onEditProject(project.id)} style={S.btn("#9CA3AF")}>Edit</button>
                  {project.status === "draft" && (
                    <button onClick={() => handlePublish(project.id)} disabled={isPending && actionId === project.id} style={S.btn("#4CAF50")}>
                      {isPending && actionId === project.id ? "..." : "Publish"}
                    </button>
                  )}
                  {project.status === "published" && (
                    <button onClick={() => handleArchive(project.id)} disabled={isPending && actionId === project.id} style={S.btn("#FF7043")}>
                      {isPending && actionId === project.id ? "..." : "Archive"}
                    </button>
                  )}
                  {project.submission_count > 0 && (
                    <button onClick={() => toggleExpand(project)} style={S.btn("#1E88E5")}>
                      {expandedProject === project.id ? "Hide Subs ▲" : `${project.submission_count} Subs ▼`}
                    </button>
                  )}
                </div>
              </div>

              {/* Submissions sub-table */}
              {expandedProject === project.id && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)", overflowX: isMobile ? "auto" : undefined }}>
                  {loadingSubs || !projectSubs[project.id] ? (
                    <div style={{ padding: 20, color: "#5A6478", fontSize: 13 }}>Loading submissions...</div>
                  ) : projectSubs[project.id].length === 0 ? (
                    <div style={{ padding: 20, color: "#5A6478", fontSize: 13 }}>No submissions yet.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          {["Intern", "Status", "Score", ""].map((h) => (
                            <th key={h} style={{ padding: "8px 20px", textAlign: "left", color: "#5A6478", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {projectSubs[project.id].map((sub) => (
                          <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <td style={{ padding: "10px 20px", color: "#E8EDF5", fontSize: 13 }}>{sub.submitter_name}</td>
                            <td style={{ padding: "10px 20px" }}>
                              <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[sub.status]}22`, color: STATUS_COLORS[sub.status] }}>
                                {sub.status}
                              </span>
                            </td>
                            <td style={{ padding: "10px 20px", color: sub.total_score !== null ? "#4CAF50" : "#5A6478", fontWeight: 700, fontSize: 13 }}>
                              {sub.total_score !== null ? `${sub.total_score}/${project.sections.reduce((s, sec) => s + sec.points, 0)}` : "—"}
                            </td>
                            <td style={{ padding: "10px 20px" }}>
                              {["submitted", "late", "graded"].includes(sub.status) && (
                                <button
                                  onClick={() => { setGradingProject({ id: project.id, sections: project.sections }); setGradingSubId(sub.id); }}
                                  style={S.btn(sub.status === "graded" ? "#5A6478" : "#1E88E5")}
                                >
                                  {sub.status === "graded" ? "Review" : "Grade"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Custom Project: Grading sub-tab ──────────────────────────────────────────

function CustomProjectGradingSubTab({ project }: { project: ProjectWithCount }) {
  const isMobile = useIsMobile();
  type SubRow = ProjectSubmission & {
    submitter: { full_name: string; avatar_url: string | null };
    section_scores_count: number;
  };

  const [subs, setSubs] = useState<SubRow[] | null>(null);
  const [loading, startLoad] = useTransition();
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    startLoad(async () => {
      const { getProjectSubmissions } = await import("@/app/actions/custom-projects");
      const res = await getProjectSubmissions(project.id);
      if (res.ok) setSubs(res.data as SubRow[]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  const totalPoints = project.sections.reduce((s, sec) => s + sec.points, 0);

  const visible = (subs ?? []).filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    if (search && !s.submitter.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = subs ? {
    total: subs.length,
    pending: subs.filter((s) => ["submitted", "late"].includes(s.status)).length,
    graded: subs.filter((s) => s.status === "graded").length,
    late: subs.filter((s) => s.status === "late").length,
  } : null;

  return (
    <div>
      {gradingSubId && (
        <CustomProjectGradingPanel
          submissionId={gradingSubId}
          sections={project.sections}
          onClose={() => { setGradingSubId(null); setSubs(null); startLoad(async () => { const { getProjectSubmissions } = await import("@/app/actions/custom-projects"); const res = await getProjectSubmissions(project.id); if (res.ok) setSubs(res.data as SubRow[]); }); }}
        />
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, marginBottom: 18 }}>
          {[
            { label: "Submissions", value: stats.total, color: "#E8EDF5" },
            { label: "Pending Grade", value: stats.pending, color: "#FFC107" },
            { label: "Graded", value: stats.graded, color: "#4CAF50" },
            { label: "Late", value: stats.late, color: "#FF7043" },
          ].map((s) => (
            <div key={s.label} style={S.statCard}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search intern..." style={{ ...S.input, flex: isMobile ? "1 1 100%" : undefined, width: isMobile ? undefined : 200 }} />
        {["all", "submitted", "late", "graded"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: filter === f ? "rgba(30,136,229,0.2)" : "rgba(255,255,255,0.04)",
            color: filter === f ? "#1E88E5" : "#9CA3AF",
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading || subs === null ? (
        <div style={{ ...S.cardPad, textAlign: "center", color: "#5A6478" }}>Loading submissions...</div>
      ) : visible.length === 0 ? (
        <div style={{ ...S.cardPad, textAlign: "center", color: "#5A6478" }}>
          {subs.length === 0 ? "No submissions yet for this project." : "No submissions match the filter."}
        </div>
      ) : (
        <div style={{ ...S.card, overflowX: isMobile ? "auto" : undefined }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 520 : undefined }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Intern", "Status", "Score", "Submitted", "Sections Graded", ""].map((h) => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", color: "#5A6478", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {s.submitter.avatar_url
                        ? <img src={s.submitter.avatar_url} alt="" width={30} height={30} style={{ borderRadius: "50%" }} />
                        : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 12 }}>{s.submitter.full_name.charAt(0)}</div>
                      }
                      <span style={{ color: "#E8EDF5", fontSize: 13 }}>{s.submitter.full_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[s.status]}22`, color: STATUS_COLORS[s.status] }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: s.total_score !== null ? "#4CAF50" : "#5A6478", fontWeight: 700, fontSize: 13 }}>
                    {s.total_score !== null ? `${s.total_score}/${totalPoints}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>
                    {s.section_scores_count}/{project.sections.length}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {["submitted", "late", "graded"].includes(s.status) && (
                      <button onClick={() => setGradingSubId(s.id)} style={S.btn(s.status === "graded" ? "#5A6478" : "#1E88E5")}>
                        {s.status === "graded" ? "Review" : "Grade"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Custom Project: Analytics sub-tab ────────────────────────────────────────

function CustomProjectAnalyticsSubTab({ project }: { project: ProjectWithCount }) {
  const isMobile = useIsMobile();
  type SubRow = ProjectSubmission & {
    submitter: { full_name: string; avatar_url: string | null };
    section_scores_count: number;
  };

  const [subs, setSubs] = useState<SubRow[] | null>(null);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    startLoad(async () => {
      const { getProjectSubmissions } = await import("@/app/actions/custom-projects");
      const res = await getProjectSubmissions(project.id);
      if (res.ok) setSubs(res.data as SubRow[]);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id]);

  if (loading || subs === null) {
    return <div style={{ ...S.cardPad, textAlign: "center", color: "#5A6478" }}>Loading analytics...</div>;
  }

  const totalPoints = project.sections.reduce((s, sec) => s + sec.points, 0);
  const gradedSubs = subs.filter((s) => s.status === "graded" && s.total_score !== null);
  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((s, sub) => s + (sub.total_score ?? 0), 0) / gradedSubs.length)
    : null;

  const submissionRate = subs.length > 0
    ? Math.round((subs.filter((s) => s.status !== "draft").length / subs.length) * 100) : 0;

  const topTen = [...gradedSubs]
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0))
    .slice(0, 10);

  const COLORS = ["#1E88E5", "#4CAF50", "#FFC107", "#FF7043", "#AB47BC", "#00BCD4", "#E91E63", "#8BC34A"];

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Submissions", value: subs.length, color: "#E8EDF5" },
          { label: "Submitted", value: subs.filter((s) => s.status !== "draft").length, color: "#4CAF50" },
          { label: "Graded", value: gradedSubs.length, color: "#1E88E5" },
          { label: "Late", value: subs.filter((s) => s.status === "late").length, color: "#FF7043" },
          { label: "Submit rate", value: `${submissionRate}%`, color: "#FFC107" },
          { label: "Avg score", value: avgScore !== null ? `${avgScore}/${totalPoints}` : "—", color: "#AB47BC" },
        ].map((s) => (
          <div key={s.label} style={S.statCard}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {subs.length === 0 ? (
        <div style={{ ...S.cardPad, textAlign: "center", color: "#5A6478" }}>No submissions yet.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 300px", gap: 16 }}>
          {/* Section score breakdown */}
          <div style={S.cardPad}>
            <h2 style={S.h2}>Sections ({project.sections.length} · {totalPoints} pts total)</h2>
            {project.sections.map((sec, i) => (
              <div key={sec.id} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#E8EDF5", fontSize: 13 }}>
                    {SECTION_TYPE_ICONS[sec.type]} {sec.label}
                  </span>
                  <span style={{ color: "#5A6478", fontSize: 12 }}>{sec.points} pts</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                    <div style={{ width: `${(sec.points / totalPoints) * 100}%`, height: "100%", background: COLORS[i % COLORS.length], borderRadius: 4 }} />
                  </div>
                  <span style={{ color: COLORS[i % COLORS.length], fontSize: 12, fontWeight: 700, minWidth: 40, textAlign: "right" }}>
                    {((sec.points / totalPoints) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Top performers */}
          <div style={S.cardPad}>
            <h2 style={{ ...S.h2, fontSize: 14 }}>Top Performers</h2>
            {topTen.length === 0 ? (
              <div style={{ color: "#5A6478", fontSize: 13 }}>No graded submissions yet.</div>
            ) : topTen.map((s, i) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ color: i < 3 ? "#FFC107" : "#5A6478", fontWeight: 800, minWidth: 20, fontSize: 13 }}>#{i + 1}</span>
                {s.submitter.avatar_url
                  ? <img src={s.submitter.avatar_url} alt="" width={26} height={26} style={{ borderRadius: "50%" }} />
                  : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 11 }}>{s.submitter.full_name.charAt(0)}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#E8EDF5", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.submitter.full_name}</div>
                </div>
                <span style={{ color: "#4CAF50", fontWeight: 800, fontSize: 13 }}>{s.total_score}/{totalPoints}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Hub ──────────────────────────────────────────────────────────────────

type MainTab = "projects" | "grading" | "analytics";
// GradingSubTab and AnalyticsSubTab are now plain string — "eagle" or a project UUID

function TabBar<T extends string>({
  tabs, active, onSelect, pendingBadge,
}: {
  tabs: { id: T; label: string; badge?: number }[];
  active: T;
  onSelect: (id: T) => void;
  pendingBadge?: Record<string, number>;
}) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 24, overflowX: "auto", WebkitOverflowScrolling: "touch" as never }}>
      {tabs.map((t) => {
        const badge = t.badge ?? (pendingBadge?.[t.id] ?? 0);
        return (
          <button key={t.id} onClick={() => onSelect(t.id)} style={{
            padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600,
            color: active === t.id ? "#1E88E5" : "#9CA3AF",
            borderBottom: active === t.id ? "2px solid #1E88E5" : "2px solid transparent",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {badge > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, fontSize: 10, fontWeight: 800,
                background: active === t.id ? "#1E88E5" : "rgba(255,255,255,0.1)",
                color: active === t.id ? "#fff" : "#9CA3AF",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>{badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SubTabBar<T extends string>({ tabs, active, onSelect }: { tabs: { id: T; label: string }[]; active: T; onSelect: (id: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch" as never, paddingBottom: 4 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding: "6px 16px", borderRadius: 20, border: "none", cursor: "pointer",
          fontSize: 12, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
          background: active === t.id ? "rgba(30,136,229,0.2)" : "rgba(255,255,255,0.04)",
          color: active === t.id ? "#1E88E5" : "#9CA3AF",
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function AdminProjectsHubClient({ projects, eagleSubmissions, eagleAnalytics, defaultTab }: Props) {
  const router = useRouter();

  // Derive default main tab
  const defaultMain: MainTab =
    defaultTab === "eagle-grading" || defaultTab === "grading" ? "grading"
    : defaultTab === "eagle-analytics" || defaultTab === "analytics" ? "analytics"
    : "projects";

  const [tab, setTab] = useState<MainTab>(defaultMain);
  const [gradingSub, setGradingSub] = useState<string>(
    defaultTab === "eagle-grading" || defaultTab === "grading" ? "eagle" : "eagle"
  );
  const [analyticsSub, setAnalyticsSub] = useState<string>(
    defaultTab === "eagle-analytics" || defaultTab === "analytics" ? "eagle" : "eagle"
  );

  // Only published + non-archived custom projects appear as sub-tabs
  const customProjects = projects.filter((p) => p.status === "published" || p.submission_count > 0);

  const pendingEagle = eagleSubmissions.filter((s) => ["submitted", "late"].includes(s.status)).length;
  const totalPendingGrading = pendingEagle; // custom project pending counts added dynamically per row

  const mainTabs: { id: MainTab; label: string; badge?: number }[] = [
    { id: "projects", label: "📋 Manage Projects", badge: projects.length },
    { id: "grading", label: "📝 Grading", badge: totalPendingGrading },
    { id: "analytics", label: "📊 Analytics" },
  ];

  // Sub-tabs auto-built: Eagle first, then every published/active custom project
  const gradingSubTabs = [
    { id: "eagle", label: "🦅 Eagle Project" },
    ...customProjects.map((p) => ({ id: p.id, label: `${p.emoji} ${p.title}` })),
  ];

  const analyticsSubTabs = [
    { id: "eagle", label: "🦅 Eagle Project" },
    ...customProjects.map((p) => ({ id: p.id, label: `${p.emoji} ${p.title}` })),
  ];

  // When a new project is published it might not match the current sub-tab — reset to eagle
  useEffect(() => {
    const validGrading = gradingSubTabs.map((t) => t.id);
    if (!validGrading.includes(gradingSub)) setGradingSub("eagle");
    const validAnalytics = analyticsSubTabs.map((t) => t.id);
    if (!validAnalytics.includes(analyticsSub)) setAnalyticsSub("eagle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  // Find the custom project object for the active sub-tab
  const activeGradingProject = gradingSub !== "eagle" ? customProjects.find((p) => p.id === gradingSub) : null;
  const activeAnalyticsProject = analyticsSub !== "eagle" ? customProjects.find((p) => p.id === analyticsSub) : null;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={S.h1}>📁 Projects Hub</h1>
        <p style={{ margin: "6px 0 0", color: "#5A6478", fontSize: 14 }}>
          Manage projects, grade submissions, and track analytics — all in one place.
        </p>
      </div>

      {/* Main tab bar */}
      <TabBar tabs={mainTabs} active={tab} onSelect={setTab} />

      {/* ── Manage Projects ── */}
      {tab === "projects" && (
        <ProjectsTab
          projects={projects}
          onNewProject={() => router.push("/admin/projects/new")}
          onEditProject={(id) => router.push(`/admin/projects/${id}`)}
        />
      )}

      {/* ── Grading ── */}
      {tab === "grading" && (
        <div>
          <SubTabBar tabs={gradingSubTabs} active={gradingSub} onSelect={setGradingSub} />
          {gradingSub === "eagle" && <EagleGradingTab submissions={eagleSubmissions} />}
          {activeGradingProject && (
            <CustomProjectGradingSubTab key={activeGradingProject.id} project={activeGradingProject} />
          )}
        </div>
      )}

      {/* ── Analytics ── */}
      {tab === "analytics" && (
        <div>
          <SubTabBar tabs={analyticsSubTabs} active={analyticsSub} onSelect={setAnalyticsSub} />
          {analyticsSub === "eagle" && <EagleAnalyticsTab analytics={eagleAnalytics} submissions={eagleSubmissions} />}
          {activeAnalyticsProject && (
            <CustomProjectAnalyticsSubTab key={activeAnalyticsProject.id} project={activeAnalyticsProject} />
          )}
        </div>
      )}
    </div>
  );
}
