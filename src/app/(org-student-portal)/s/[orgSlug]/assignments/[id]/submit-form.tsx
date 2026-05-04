"use client";

import { useState, useTransition } from "react";
import { submitAssignment } from "@/app/actions/org-portal";

export function SubmitForm({ orgId, assignmentId, initial, graded }: { orgId: string; assignmentId: string; initial: string; graded: boolean }) {
  const [body, setBody] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function send() {
    setErr(null); setOk(false);
    start(async () => {
      const r = await submitAssignment(orgId, assignmentId, body);
      if (!r.ok) { setErr(r.error); return; }
      setOk(true);
    });
  }

  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 10, padding: 18 }}>
      <div style={{ fontSize: 12, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
        {initial ? "Your submission" : "Submit your work"}
      </div>
      {graded && (
        <div style={{ marginBottom: 10, padding: "8px 12px", background: "#1E2937", color: "#FFA726", fontSize: 12, borderRadius: 6 }}>
          You&apos;ve been graded — re-submitting will clear your grade and require a re-grade.
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Paste your work here, or a link to it…"
        rows={10}
        style={{ width: "100%", padding: "10px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
      />
      {err && <div style={{ marginTop: 8, padding: "8px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
      {ok && <div style={{ marginTop: 8, padding: "8px 10px", background: "#0E2723", color: "#26A69A", fontSize: 12, borderRadius: 6 }}>Submitted ✓</div>}
      <button onClick={send} disabled={pending || body.trim().length === 0} style={{ marginTop: 10, padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
        {pending ? "Submitting…" : initial ? "Update submission" : "Submit"}
      </button>
    </div>
  );
}
