"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import toast from "react-hot-toast";
import {
  updateProject, publishProject, archiveProject,
} from "@/app/actions/custom-projects";
import type { Project, ProjectSubmission, SectionConfig } from "@/app/actions/custom-projects-types";
import { SECTION_TYPE_LABELS, SECTION_TYPE_ICONS } from "@/app/actions/custom-projects-types";

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "24px 20px" } as React.CSSProperties,
  card: { background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 24px" } as React.CSSProperties,
  label: { color: "#9CA3AF", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 } as React.CSSProperties,
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
  btn: (color = "#9CA3AF") => ({
    padding: "8px 16px", borderRadius: 8, border: `1px solid ${color}40`,
    background: `${color}12`, color, cursor: "pointer", fontSize: 13, fontWeight: 600,
  } as React.CSSProperties),
  btnPrimary: {
    padding: "10px 22px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg,#1E88E5,#FFC107)",
    color: "#0A0E1A", cursor: "pointer", fontWeight: 800, fontSize: 14,
  } as React.CSSProperties,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "#9CA3AF", submitted: "#4CAF50", late: "#FF7043", graded: "#1E88E5",
  published: "#4CAF50", archived: "#5A6478",
};

type SubWithMeta = ProjectSubmission & {
  submitter: { full_name: string; avatar_url: string | null };
  section_scores_count: number;
};

interface Props {
  project: Project;
  submissions: SubWithMeta[];
  defaultTab: "overview" | "edit" | "submissions";
}

export function AdminProjectDetailClient({ project, submissions, defaultTab }: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"overview" | "edit" | "submissions">(defaultTab);
  const [isPending, startTransition] = useTransition();

  // Edit state
  const [editTitle, setEditTitle] = useState(project.title);
  const [editDesc, setEditDesc] = useState(project.description);
  const [editInstructions, setEditInstructions] = useState(project.instructions);
  const [editDeadline, setEditDeadline] = useState(project.deadline ? project.deadline.slice(0, 16) : "");
  const [editXpOnSubmit, setEditXpOnSubmit] = useState(project.xp_on_submit);
  const [editLateFine, setEditLateFine] = useState(project.late_fine_amount);
  const [editBonusThreshold, setEditBonusThreshold] = useState(project.xp_bonus_threshold);
  const [editBonusAmount, setEditBonusAmount] = useState(project.xp_bonus_amount);
  const [saveMsg, setSaveMsg] = useState("");

  // Submissions state
  const [subSearch, setSubSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");

  const filteredSubs = submissions.filter((s) => {
    if (subFilter !== "all" && s.status !== subFilter) return false;
    if (subSearch && !s.submitter.full_name.toLowerCase().includes(subSearch.toLowerCase())) return false;
    return true;
  });

  const totalPoints = project.sections.reduce((s, sec) => s + sec.points, 0);
  const stats = {
    total: submissions.length,
    submitted: submissions.filter((s) => ["submitted", "late"].includes(s.status)).length,
    graded: submissions.filter((s) => s.status === "graded").length,
    late: submissions.filter((s) => s.status === "late").length,
  };

  function handleSaveEdit() {
    startTransition(async () => {
      const res = await updateProject(project.id, {
        title: editTitle, description: editDesc, instructions: editInstructions,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        xp_on_submit: editXpOnSubmit, late_fine_amount: editLateFine,
        xp_bonus_threshold: editBonusThreshold, xp_bonus_amount: editBonusAmount,
      });
      if (res.ok) { setSaveMsg("Saved!"); setTimeout(() => setSaveMsg(""), 3000); toast.success("Project updated!"); }
      else toast.error(res.error);
    });
  }

  function handlePublish() {
    if (!confirm("Publish this project? All interns will be notified.")) return;
    startTransition(async () => {
      const res = await publishProject(project.id);
      if (res.ok) toast.success("Published!"); else toast.error(res.error);
    });
  }

  function handleArchive() {
    if (!confirm("Archive this project?")) return;
    startTransition(async () => {
      const res = await archiveProject(project.id);
      if (res.ok) { toast.success("Archived."); router.push("/admin/projects"); }
      else toast.error(res.error);
    });
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.push("/admin/projects")}
          style={{ background: "none", border: "none", color: "#5A6478", cursor: "pointer", fontSize: 14, paddingTop: 4 }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 32 }}>{project.emoji}</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#E8EDF5" }}>{project.title}</h1>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: `${STATUS_COLORS[project.status]}22`, color: STATUS_COLORS[project.status],
            }}>
              {project.status}
            </span>
          </div>
          <p style={{ margin: "6px 0 0", color: "#9CA3AF", fontSize: 13 }}>{project.description}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {project.status === "draft" && (
            <button onClick={handlePublish} disabled={isPending} style={{ ...S.btn("#4CAF50"), opacity: isPending ? 0.5 : 1 }}>Publish</button>
          )}
          {project.status === "published" && (
            <button onClick={handleArchive} disabled={isPending} style={{ ...S.btn("#FF7043"), opacity: isPending ? 0.5 : 1 }}>Archive</button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 24 }}>
        {(["overview", "edit", "submissions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 600, textTransform: "capitalize",
            color: tab === t ? "#1E88E5" : "#9CA3AF",
            borderBottom: tab === t ? "2px solid #1E88E5" : "2px solid transparent",
          }}>
            {t}
            {t === "submissions" && submissions.length > 0 && (
              <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: tab === t ? "#1E88E5" : "rgba(255,255,255,0.08)", color: tab === t ? "#fff" : "#9CA3AF" }}>
                {submissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Submissions", value: stats.total, color: "#E8EDF5" },
              { label: "Awaiting grade", value: stats.submitted, color: "#1E88E5" },
              { label: "Graded", value: stats.graded, color: "#4CAF50" },
              { label: "Late", value: stats.late, color: "#FF7043" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            {/* Sections */}
            <div style={S.card}>
              <h3 style={{ margin: "0 0 14px", color: "#E8EDF5", fontSize: 14, fontWeight: 700 }}>
                Sections · {totalPoints} pts total
              </h3>
              {project.sections.map((sec, idx) => (
                <div key={sec.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, marginBottom: 6, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "#5A6478", fontSize: 11, minWidth: 18 }}>{idx + 1}.</span>
                  <span style={{ fontSize: 16 }}>{SECTION_TYPE_ICONS[sec.type]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>{sec.label}</div>
                    <div style={{ color: "#5A6478", fontSize: 11 }}>{SECTION_TYPE_LABELS[sec.type]}</div>
                  </div>
                  <span style={{ color: "#1E88E5", fontWeight: 700, fontSize: 13 }}>{sec.points} pts</span>
                </div>
              ))}
            </div>

            {/* Info */}
            <div style={S.card}>
              <h3 style={{ margin: "0 0 14px", color: "#E8EDF5", fontSize: 14, fontWeight: 700 }}>Project Info</h3>
              {[
                { label: "XP on Submit", value: `${project.xp_on_submit} XP` },
                { label: "Bonus XP", value: project.xp_bonus_threshold > 0 ? `+${project.xp_bonus_amount} XP if ≥${project.xp_bonus_threshold}%` : "None" },
                { label: "Late Fine", value: project.late_fine_amount > 0 ? `-${project.late_fine_amount} XP` : "None" },
                { label: "Deadline", value: project.deadline ? new Date(project.deadline).toLocaleString() : "No deadline" },
                { label: "Created", value: new Date(project.created_at).toLocaleDateString() },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ color: "#5A6478", fontSize: 13 }}>{row.label}</span>
                  <span style={{ color: "#E8EDF5", fontSize: 13, fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 14 }}>
                <div style={{ color: "#5A6478", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Instructions</div>
                <p style={{ margin: 0, color: "#9CA3AF", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>{project.instructions}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit ── */}
      {tab === "edit" && project.status !== "archived" && (
        <div style={{ ...S.card, maxWidth: 680 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={S.label}>Title</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={S.input} />
            </div>
            <div>
              <label style={S.label}>Deadline</label>
              <input type="datetime-local" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} style={S.input} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Description</label>
            <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={S.input} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Instructions</label>
            <textarea value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} rows={6} style={S.textarea} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "XP on Submit", value: editXpOnSubmit, set: setEditXpOnSubmit },
              { label: "Late Fine", value: editLateFine, set: setEditLateFine },
              { label: "Bonus Threshold%", value: editBonusThreshold, set: setEditBonusThreshold },
              { label: "Bonus XP", value: editBonusAmount, set: setEditBonusAmount },
            ].map((f) => (
              <div key={f.label}>
                <label style={S.label}>{f.label}</label>
                <input type="number" value={f.value} onChange={(e) => f.set(parseInt(e.target.value) || 0)} style={S.input} min={0} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={handleSaveEdit} disabled={isPending} style={{ ...S.btnPrimary, opacity: isPending ? 0.5 : 1 }}>
              {isPending ? "Saving..." : "Save Changes"}
            </button>
            {saveMsg && <span style={{ color: "#4CAF50", fontSize: 13 }}>{saveMsg}</span>}
          </div>
          <p style={{ margin: "14px 0 0", color: "#5A6478", fontSize: 12 }}>
            Section types/configs cannot be edited after creation. Archive and recreate to change sections.
          </p>
        </div>
      )}

      {/* ── Submissions ── */}
      {tab === "submissions" && (
        <div>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10, marginBottom: 16 }}>
            <input value={subSearch} onChange={(e) => setSubSearch(e.target.value)}
              placeholder="🔍  Search interns..." style={{ ...S.input, flex: 1 }} />
            <select value={subFilter} onChange={(e) => setSubFilter(e.target.value)}
              style={{ ...S.input, width: isMobile ? "100%" : 160 }}>
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="late">Late</option>
              <option value="graded">Graded</option>
            </select>
          </div>

          {filteredSubs.length === 0 ? (
            <div style={{ ...S.card, textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>📭</div>
              <div style={{ color: "#5A6478" }}>No submissions yet.</div>
            </div>
          ) : (
            <div style={{ background: "#131929", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: isMobile ? "auto" : "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: isMobile ? 520 : undefined }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Intern", "Status", "Score", "Submitted", ""].map((h) => (
                      <th key={h} style={{ padding: "11px 18px", textAlign: "left", color: "#5A6478", fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredSubs.map((sub) => (
                    <tr key={sub.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {sub.submitter.avatar_url
                            ? <img src={sub.submitter.avatar_url} alt="" width={30} height={30} style={{ borderRadius: "50%" }} />
                            : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#FFC107)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0A0E1A", fontWeight: 800, fontSize: 12 }}>
                                {sub.submitter.full_name.charAt(0)}
                              </div>
                          }
                          <span style={{ color: "#E8EDF5", fontSize: 13 }}>{sub.submitter.full_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{ padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${STATUS_COLORS[sub.status]}22`, color: STATUS_COLORS[sub.status] }}>
                          {sub.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", color: sub.total_score !== null ? "#4CAF50" : "#5A6478", fontWeight: 700, fontSize: 13 }}>
                        {sub.total_score !== null ? `${sub.total_score}/${totalPoints}` : "—"}
                      </td>
                      <td style={{ padding: "12px 18px", color: "#9CA3AF", fontSize: 12 }}>
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        {["submitted", "late", "graded"].includes(sub.status) && (
                          <button
                            onClick={() => router.push(`/admin/projects?tab=projects`)}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
