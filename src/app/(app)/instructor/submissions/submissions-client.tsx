"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { InstructorSubmissionRow } from "@/lib/db";
import { gradeSubmission } from "@/app/actions/courses-lms";

export function SubmissionsClient({ initial }: { initial: InstructorSubmissionRow[] }) {
  const [rows, setRows] = useState<InstructorSubmissionRow[]>(initial);
  const [tab, setTab] = useState<"pending" | "graded">("pending");

  const filtered = rows.filter((r) => tab === "pending" ? r.status !== "graded" : r.status === "graded");

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 18 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          INSTRUCTOR
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>Submissions</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Review and grade student assignment work.</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>
          ⏳ Pending ({rows.filter((r) => r.status !== "graded").length})
        </TabBtn>
        <TabBtn active={tab === "graded"} onClick={() => setTab("graded")}>
          ✓ Graded ({rows.filter((r) => r.status === "graded").length})
        </TabBtn>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0 }}>
            {tab === "pending" ? "No pending submissions right now." : "You haven't graded any submissions yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((r) => (
            <SubmissionCard
              key={r.id}
              row={r}
              onGraded={(grade, feedback) => {
                setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, grade, feedback, status: "graded" } : x));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ row, onGraded }: { row: InstructorSubmissionRow; onGraded: (g: number, f: string) => void }) {
  const [grade, setGrade] = useState<number | "">(row.grade ?? "");
  const [feedback, setFeedback] = useState(row.feedback || "");
  const [expanded, setExpanded] = useState(row.status !== "graded");
  const [busy, setBusy] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detect, setDetect] = useState<{ ai_likelihood?: number; plagiarism_likelihood?: number; verdict?: string; signals?: string[] } | null>(null);

  async function runDetection() {
    if (!row.content.trim()) { toast.error("No text to analyze"); return; }
    setDetecting(true);
    try {
      const res = await fetch("/api/ai/detect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: row.content }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); setDetecting(false); return; }
      setDetect(data.result);
    } catch (e) { toast.error((e as Error).message); }
    setDetecting(false);
  }

  async function submit() {
    if (grade === "" || grade < 0 || grade > row.maxScore) { toast.error(`Enter a grade between 0 and ${row.maxScore}`); return; }
    setBusy(true);
    const r = await gradeSubmission(row.id, Number(grade), feedback);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Graded");
    onGraded(Number(grade), feedback);
    setExpanded(false);
  }

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          {row.studentAvatar ? (
            <img src={row.studentAvatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
              {(row.studentName[0] || "?").toUpperCase()}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.studentName}
            </div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>
              {row.courseTitle} · <b>{row.moduleTitle}</b> · {new Date(row.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {row.status === "graded" && row.grade != null ? (
            <span style={{ fontSize: 13, fontWeight: 800, color: "#66BB6A", padding: "4px 10px", background: "rgba(102,187,106,0.12)", borderRadius: 8 }}>
              {row.grade}/{row.maxScore}
            </span>
          ) : (
            <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,193,7,0.15)", color: "#FFC107", borderRadius: 8, fontWeight: 700 }}>PENDING</span>
          )}
          <button onClick={() => setExpanded(!expanded)} style={btnGhost}>{expanded ? "Hide" : row.status === "graded" ? "Re-grade" : "Grade"}</button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14 }}>
          <div style={lbl}>Student submission</div>
          <div style={{ background: "#0A0E1A", borderRadius: 8, padding: 12, fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 240, overflowY: "auto" }}>
            {row.content || <span style={{ color: "#5A6478" }}>(no text response)</span>}
          </div>
          {row.fileUrl && (
            <div style={{ marginTop: 8 }}>
              <a href={row.fileUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1E88E5", textDecoration: "underline" }}>📎 View attached file</a>
            </div>
          )}

          {/* AI / plagiarism detector */}
          <div style={{ marginTop: 10 }}>
            <button onClick={runDetection} disabled={detecting} style={{ ...btnGhost, borderColor: "rgba(171,71,188,0.3)", color: "#AB47BC" }}>
              {detecting ? "Analyzing…" : "🤖 Check for AI / plagiarism"}
            </button>
            {detect && (
              <div style={{ marginTop: 8, background: "rgba(171,71,188,0.06)", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 10, padding: 10, fontSize: 12, color: "#E8EDF5" }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
                  <div><b style={{ color: "#AB47BC" }}>AI likelihood:</b> {detect.ai_likelihood ?? "?"}%</div>
                  <div><b style={{ color: "#EF5350" }}>Plagiarism:</b> {detect.plagiarism_likelihood ?? "?"}%</div>
                </div>
                {detect.verdict && <p style={{ margin: "4px 0" }}>{detect.verdict}</p>}
                {detect.signals && detect.signals.length > 0 && (
                  <ul style={{ margin: "6px 0 0 18px", padding: 0, color: "#8892A4", fontSize: 11, lineHeight: 1.6 }}>
                    {detect.signals.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
            <div>
              <div style={lbl}>Grade / {row.maxScore}</div>
              <input type="number" min={0} max={row.maxScore} value={grade} onChange={(e) => setGrade(e.target.value === "" ? "" : parseInt(e.target.value))} style={input} />
            </div>
            <div>
              <div style={lbl}>Feedback</div>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} placeholder="Optional comments for the student..." style={{ ...input, minHeight: 70, resize: "vertical" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <Link href={`/instructor/course-builder/${row.courseId}`} style={btnGhost}>Open course</Link>
            <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Save grade"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "#1E88E5" : "#111827",
      color: active ? "#fff" : "#8892A4",
      border: active ? "none" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10, padding: "8px 14px",
      fontSize: 12, fontWeight: 700, cursor: "pointer",
    }}>{children}</button>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "8px 12px", color: "#E8EDF5", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "9px 14px",
  fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
