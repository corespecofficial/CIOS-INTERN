"use client";

import { useState, useTransition } from "react";
import { gradeSubmission } from "@/app/actions/org-portal";

interface Submission {
  id: string;
  body: string | null;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  student: { id: string; name: string; email: string } | null;
}

export function GradeRow({ orgId, submission }: { orgId: string; submission: Submission }) {
  const [open, setOpen] = useState(false);
  const [grade, setGrade] = useState<number>(submission.grade ?? 0);
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      const r = await gradeSubmission(orgId, submission.id, grade, feedback);
      if (!r.ok) setErr(r.error);
      else setOpen(false);
    });
  }

  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{submission.student?.name ?? "Unknown"}</div>
          <div style={{ fontSize: 11, color: "#5A6478" }}>{submission.student?.email}</div>
          <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>Submitted {new Date(submission.submitted_at).toLocaleString()}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: submission.grade != null ? "#26A69A" : "#5A6478" }}>
            {submission.grade != null ? `${submission.grade}/100` : "—"}
          </div>
          <button onClick={() => setOpen(!open)} style={{ marginTop: 4, padding: "4px 10px", background: "transparent", color: "#8892A4", border: "1px solid #1F2937", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>
            {open ? "Close" : submission.grade != null ? "Edit" : "Grade"}
          </button>
        </div>
      </div>

      {submission.body && (
        <div style={{ marginTop: 12, padding: 12, background: "#0A0E1A", borderRadius: 6, fontSize: 13, color: "#C7CFD8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {submission.body}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 12, padding: 12, background: "#0A0E1A", borderRadius: 6 }}>
          <label style={{ fontSize: 11, color: "#5A6478", display: "block", marginBottom: 4 }}>Grade (0–100)</label>
          <input type="number" min={0} max={100} value={grade} onChange={(e) => setGrade(Number(e.target.value))} style={{ width: 100, padding: "8px 10px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }} />
          <label style={{ fontSize: 11, color: "#5A6478", display: "block", margin: "10px 0 4px 0" }}>Feedback</label>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 10px", background: "#111827", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13, resize: "vertical", fontFamily: "inherit" }} />
          {err && <div style={{ marginTop: 8, padding: "6px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
          <button onClick={save} disabled={pending} style={{ marginTop: 10, padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {pending ? "Saving…" : "Save grade"}
          </button>
        </div>
      )}
    </div>
  );
}
