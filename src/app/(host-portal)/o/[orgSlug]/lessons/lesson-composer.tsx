"use client";

import { useState, useTransition } from "react";
import { createLesson } from "@/app/actions/org-portal";

export function LessonComposer({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [video, setVideo] = useState("");
  const [pos, setPos] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setTitle(""); setBody(""); setVideo(""); setPos(0); setErr(null); setOpen(false);
  }

  function submit() {
    setErr(null);
    start(async () => {
      const r = await createLesson(orgId, { title, body: body || undefined, video_url: video || undefined, position: pos });
      if (!r.ok) { setErr(r.error); return; }
      reset();
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        + New lesson
      </button>
    );
  }

  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lesson title"
        style={inputStyle}
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Lesson body / notes (optional)"
        rows={4}
        style={{ ...inputStyle, marginTop: 8, resize: "vertical", fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Video URL (optional)" style={{ ...inputStyle, flex: 1 }} />
        <input type="number" value={pos} onChange={(e) => setPos(Number(e.target.value))} placeholder="Order" style={{ ...inputStyle, width: 80 }} />
      </div>
      {err && <div style={{ marginTop: 8, padding: "8px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={submit} disabled={pending || title.trim().length < 3} style={btnPrimary}>
          {pending ? "Saving…" : "Save lesson"}
        </button>
        <button onClick={reset} disabled={pending} style={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0A0E1A",
  border: "1px solid #1F2937",
  borderRadius: 6,
  color: "#E8EDF5",
  fontSize: 13,
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 16px",
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  color: "#8892A4",
  border: "1px solid #1F2937",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
};
