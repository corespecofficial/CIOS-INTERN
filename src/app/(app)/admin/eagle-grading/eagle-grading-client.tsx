"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  gradeEagleSection, finalizeEagleGrading, getEagleSubmissionById,
  aiSuggestEagleSectionScore, aiGradeAllEagleSections,
  type EagleSubmission, type SectionScore, type EagleAiSuggestion,
} from "@/app/actions/eagle";
import { formatEagleSection } from "@/lib/eagle-grading-helpers";

const STATUS_COLORS = {
  draft: "#9CA3AF", submitted: "#4CAF50",
  late: "#FF7043", graded: "#1E88E5",
};

const SECTIONS = [
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

type DetailSubmission = EagleSubmission & {
  section_scores: SectionScore[];
  submitter: { full_name: string; track: string | null; avatar_url: string | null } | null;
};

interface Props { submissions: SubmissionRow[]; }

export function EagleGradingClient({ submissions: initial }: Props) {
  const [submissions, setSubmissions] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DetailSubmission | null>(null);
  const [sectionScores, setSectionScores] = useState<Record<string, number>>({});
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, string>>({});
  const [overallFeedback, setOverallFeedback] = useState("");
  const [saving, startSave] = useTransition();
  const [finalizing, startFinalize] = useTransition();
  const [loadingDetail, startDetail] = useTransition();
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, EagleAiSuggestion>>({});
  const [aiRunning, setAiRunning] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);

  const runAutoGrade = async (sectionId: string) => {
    if (!selected) return;
    setAiRunning(sectionId);
    const res = await aiSuggestEagleSectionScore(selected.id, sectionId);
    setAiRunning(null);
    if (!res.ok) { toast.error(res.error); return; }
    setAiSuggestions((p) => ({ ...p, [sectionId]: res.data }));
    toast.success(`${res.data.source === "ai" ? "AI" : "Local"} suggestion ready for Section ${sectionId}`);
  };

  const applyAiScore = (sectionId: string) => {
    const s = aiSuggestions[sectionId];
    if (!s) return;
    setSectionScores((p) => ({ ...p, [sectionId]: s.suggested_score }));
    const combined = [
      s.strengths.length ? `Strengths:\n${s.strengths.map((x) => `• ${x}`).join("\n")}` : "",
      s.weaknesses.length ? `Weaknesses:\n${s.weaknesses.map((x) => `• ${x}`).join("\n")}` : "",
      s.feedback,
    ].filter(Boolean).join("\n\n");
    setSectionFeedback((p) => ({ ...p, [sectionId]: combined }));
    toast.success("Applied to this section");
  };

  const runAutoGradeAll = async () => {
    if (!selected) return;
    setBulkRunning(true);
    const res = await aiGradeAllEagleSections(selected.id);
    setBulkRunning(false);
    if (!res.ok) { toast.error(res.error); return; }
    const map: Record<string, EagleAiSuggestion> = {};
    for (const s of res.data.suggestions) map[s.section_id] = s;
    setAiSuggestions(map);
    // Pull fresh scores/feedback since the bulk action upserted drafts
    const reload = await getEagleSubmissionById(selected.id);
    if (reload.ok) {
      setSelected(reload.data);
      const sc: Record<string, number> = {};
      const fb: Record<string, string> = {};
      for (const s of reload.data.section_scores) { sc[s.section] = s.score; fb[s.section] = s.feedback ?? ""; }
      setSectionScores(sc);
      setSectionFeedback(fb);
    }
    toast.success(`Auto-graded ${res.data.saved}/8 sections — review & finalize`);
  };

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

  const openDetail = (sub: SubmissionRow) => {
    startDetail(async () => {
      const res = await getEagleSubmissionById(sub.id);
      if (!res.ok) { toast.error(res.error); return; }
      setSelected(res.data);
      // Pre-fill existing scores
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
  };

  const saveSection = (section: string) => {
    startSave(async () => {
      if (!selected) return;
      const res = await gradeEagleSection(
        selected.id, section, sectionScores[section] ?? 0, sectionFeedback[section] ?? ""
      );
      if (res.ok) toast.success(`Section ${section} saved`);
      else toast.error(res.error);
    });
  };

  const finalize = () => {
    startFinalize(async () => {
      if (!selected) return;
      const res = await finalizeEagleGrading(selected.id, overallFeedback);
      if (res.ok) {
        toast.success(`Graded! Total: ${res.data.total_score}/100`);
        // Update local list
        setSubmissions((prev) => prev.map((s) =>
          s.id === selected.id ? { ...s, status: "graded" as const, total_score: res.data.total_score } : s
        ));
        setSelected(null);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#E8EDF5" }}>
        🦅 Eagle Project Grading
      </h1>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total", value: stats.total, color: "#9CA3AF" },
          { label: "Pending", value: stats.pending, color: "#FFC107" },
          { label: "Submitted", value: stats.submitted, color: "#4CAF50" },
          { label: "Late", value: stats.late, color: "#FF7043" },
          { label: "Graded", value: stats.graded, color: "#1E88E5" },
        ].map((st) => (
          <div key={st.label} style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ color: "#5A6478", fontSize: 11, marginBottom: 4 }}>{st.label.toUpperCase()}</div>
            <div style={{ color: st.color, fontSize: 24, fontWeight: 800 }}>{st.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          style={{ flex: 1, minWidth: 160, background: "#131929", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "9px 14px" }}
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
      {!selected ? (
        <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          {visible.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#5A6478" }}>No submissions match the filter.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {["Intern", "Track", "Status", "Submitted", "Score", "Sections Graded", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#5A6478", fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {s.submitter.avatar_url
                          ? <img src={s.submitter.avatar_url} alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
                          : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800 }}>{s.submitter.full_name.charAt(0)}</div>
                        }
                        <span style={{ color: "#E8EDF5", fontSize: 14 }}>{s.submitter.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 13 }}>{s.submitter.track ?? "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${STATUS_COLORS[s.status]}20`, color: STATUS_COLORS[s.status] }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 12 }}>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: s.total_score !== null ? "#4CAF50" : "#5A6478", fontSize: 14, fontWeight: 700 }}>
                      {s.total_score !== null ? `${s.total_score}/100` : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#9CA3AF", fontSize: 13 }}>{s.scores_count}/8</td>
                    <td style={{ padding: "12px 16px" }}>
                      {["submitted", "late"].includes(s.status) && (
                        <button
                          onClick={() => openDetail(s)}
                          disabled={loadingDetail}
                          style={{ padding: "6px 14px", background: "rgba(30,136,229,0.15)", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 7, color: "#1E88E5", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                        >
                          Grade
                        </button>
                      )}
                      {s.status === "graded" && (
                        <button
                          onClick={() => openDetail(s)}
                          style={{ padding: "6px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "#9CA3AF", cursor: "pointer", fontSize: 13 }}
                        >
                          Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Grading panel */
        <div>
          <button
            onClick={() => setSelected(null)}
            style={{ marginBottom: 16, padding: "8px 16px", background: "#1E2640", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#9CA3AF", cursor: "pointer" }}
          >
            ← Back to list
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            {selected.submitter?.avatar_url
              ? <img src={selected.submitter.avatar_url} alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
              : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 18 }}>{selected.submitter?.full_name?.charAt(0)}</div>
            }
            <div>
              <div style={{ color: "#E8EDF5", fontWeight: 700, fontSize: 18 }}>{selected.submitter?.full_name}</div>
              <div style={{ color: "#5A6478", fontSize: 13 }}>{selected.submitter?.track}</div>
            </div>
          </div>

          {SECTIONS.map((sec) => {
            const secData = selected[`section_${sec.id.toLowerCase()}` as keyof EagleSubmission] as Record<string, unknown>;
            const hasContent = secData && Object.keys(secData).length > 0;
            return (
              <div key={sec.id} style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "18px 22px", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, color: "#E8EDF5", fontSize: 15, fontWeight: 700 }}>
                    Section {sec.id} — {sec.label} <span style={{ color: "#5A6478", fontWeight: 400 }}>({sec.max} pts)</span>
                  </h3>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => runAutoGrade(sec.id)}
                      disabled={aiRunning === sec.id || bulkRunning}
                      style={{ padding: "5px 12px", background: "rgba(171,71,188,0.15)", border: "1px solid rgba(171,71,188,0.35)", borderRadius: 7, color: "#AB47BC", cursor: aiRunning === sec.id ? "wait" : "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      {aiRunning === sec.id ? "⚡ Analysing…" : "⚡ Auto-grade"}
                    </button>
                    <button
                      onClick={() => saveSection(sec.id)}
                      disabled={saving}
                      style={{ padding: "5px 14px", background: "rgba(30,136,229,0.15)", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 7, color: "#1E88E5", cursor: saving ? "wait" : "pointer", fontSize: 13 }}
                    >
                      {saving ? "..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Intern's answer — formatted as readable text */}
                {hasContent && (
                  <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "14px 16px", marginBottom: 12, maxHeight: 340, overflowY: "auto" }}>
                    <FormattedAnswer text={formatEagleSection(sec.id, secData)} />
                  </div>
                )}

                {/* AI / Local heuristic suggestion panel */}
                {aiSuggestions[sec.id] && (
                  <div style={{
                    background: "linear-gradient(135deg,rgba(171,71,188,0.08),rgba(30,136,229,0.05))",
                    border: "1px solid rgba(171,71,188,0.25)",
                    borderRadius: 8, padding: "14px 16px", marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 700 }}>
                        Suggested: {aiSuggestions[sec.id].suggested_score}/{aiSuggestions[sec.id].max_score}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: aiSuggestions[sec.id].source === "ai" ? "rgba(76,175,80,0.2)" : "rgba(255,193,7,0.2)", color: aiSuggestions[sec.id].source === "ai" ? "#4CAF50" : "#FFC107" }}>
                        {aiSuggestions[sec.id].source === "ai" ? "External AI" : "Local heuristic"}
                      </span>
                      <button
                        onClick={() => applyAiScore(sec.id)}
                        style={{ marginLeft: "auto", padding: "4px 12px", background: "rgba(76,175,80,0.18)", border: "1px solid rgba(76,175,80,0.4)", borderRadius: 6, color: "#4CAF50", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                      >
                        ✓ Apply
                      </button>
                    </div>
                    {aiSuggestions[sec.id].strengths.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ color: "#4CAF50", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>STRENGTHS</div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: "#E8EDF5", fontSize: 12, lineHeight: 1.6 }}>
                          {aiSuggestions[sec.id].strengths.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiSuggestions[sec.id].weaknesses.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ color: "#FF7043", fontSize: 11, fontWeight: 700, marginBottom: 2 }}>NEEDS IMPROVEMENT</div>
                        <ul style={{ margin: 0, paddingLeft: 18, color: "#E8EDF5", fontSize: 12, lineHeight: 1.6 }}>
                          {aiSuggestions[sec.id].weaknesses.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                    <div style={{ color: "#9CA3AF", fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>
                      {aiSuggestions[sec.id].feedback}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14, alignItems: "start" }}>
                  <div>
                    <label style={{ color: "#9CA3AF", fontSize: 12, display: "block", marginBottom: 8 }}>Score (0–{sec.max})</label>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Array.from({ length: sec.max + 1 }, (_, i) => i).filter((n) => n === 0 || n % Math.max(1, Math.floor(sec.max / 10)) === 0 || n === sec.max).map((n) => (
                        <button
                          key={n}
                          onClick={() => setSectionScores((prev) => ({ ...prev, [sec.id]: n }))}
                          style={{
                            width: 32, height: 32, borderRadius: 6, border: "none", cursor: "pointer",
                            background: sectionScores[sec.id] === n ? "linear-gradient(135deg,#1E88E5,#FFC107)" : "rgba(255,255,255,0.06)",
                            color: sectionScores[sec.id] === n ? "#0A0E1A" : "#9CA3AF",
                            fontWeight: sectionScores[sec.id] === n ? 800 : 400, fontSize: 13,
                          }}
                        >{n}</button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="number"
                        min={0}
                        max={sec.max}
                        value={sectionScores[sec.id] ?? ""}
                        onChange={(e) => setSectionScores((prev) => ({ ...prev, [sec.id]: Math.min(sec.max, Math.max(0, Number(e.target.value))) }))}
                        placeholder="Type score"
                        style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#E8EDF5", fontSize: 14, padding: "7px 10px", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#9CA3AF", fontSize: 12, display: "block", marginBottom: 8 }}>Feedback</label>
                    <textarea
                      rows={3}
                      value={sectionFeedback[sec.id] ?? ""}
                      onChange={(e) => setSectionFeedback((prev) => ({ ...prev, [sec.id]: e.target.value }))}
                      placeholder="What did they do well? What could improve?"
                      style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 13, padding: "10px 12px", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Overall feedback + finalize */}
          <div style={{ background: "#131929", border: "1px solid rgba(255,193,7,0.15)", borderRadius: 12, padding: "20px 22px" }}>
            <h3 style={{ margin: "0 0 12px", color: "#FFC107", fontSize: 15 }}>Overall Feedback (shown to intern)</h3>
            <textarea
              rows={5}
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Write your overall coaching feedback for this intern..."
              style={{ width: "100%", background: "#0D1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 14, padding: "10px 14px", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, gap: 10, flexWrap: "wrap" }}>
              <div style={{ color: "#5A6478", fontSize: 13 }}>
                Running total: {Object.values(sectionScores).reduce((a, b) => a + b, 0)}/100
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={runAutoGradeAll}
                  disabled={bulkRunning || !!aiRunning}
                  style={{
                    padding: "11px 22px",
                    background: bulkRunning ? "#1E2640" : "rgba(171,71,188,0.15)",
                    border: "1px solid rgba(171,71,188,0.4)",
                    borderRadius: 8,
                    color: bulkRunning ? "#9CA3AF" : "#AB47BC",
                    cursor: bulkRunning ? "wait" : "pointer", fontWeight: 700, fontSize: 14,
                  }}
                >
                    {bulkRunning ? "⚡ Running…" : "⚡ Auto-grade All 8"}
                </button>
                <button
                  onClick={finalize}
                  disabled={finalizing}
                  style={{
                    padding: "12px 28px",
                    background: finalizing ? "#1E2640" : "linear-gradient(135deg,#1E88E5,#FFC107)",
                    border: "none", borderRadius: 8,
                    color: finalizing ? "#9CA3AF" : "#0A0E1A",
                    cursor: finalizing ? "wait" : "pointer", fontWeight: 800, fontSize: 15,
                  }}
                >
                  {finalizing ? "Finalizing..." : "✅ Finalize & Notify Intern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small inline renderer that turns the formatter's markdown-ish string
//    into lightly-styled blocks. Avoids pulling in a full md library.
function FormattedAnswer({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div style={{ color: "#E8EDF5", fontSize: 13, lineHeight: 1.65 }}>
      {lines.map((raw, i) => {
        if (!raw.trim()) return <div key={i} style={{ height: 6 }} />;
        // Emphasis: **label** renders bold; *italic* renders muted
        const parts = raw.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean);
        const rendered = parts.map((p, j) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return <strong key={j} style={{ color: "#FFC107" }}>{p.slice(2, -2)}</strong>;
          }
          if (p.startsWith("_") && p.endsWith("_")) {
            return <em key={j} style={{ color: "#5A6478" }}>{p.slice(1, -1)}</em>;
          }
          return <span key={j}>{p}</span>;
        });
        const indent = raw.startsWith("  ") ? 16 : 0;
        return <div key={i} style={{ paddingLeft: indent, marginBottom: 2 }}>{rendered}</div>;
      })}
    </div>
  );
}
