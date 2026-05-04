"use client";

import { useState, useTransition } from "react";
import { postAnnouncement } from "@/app/actions/org-portal";

export function AnnouncementComposer({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() { setTitle(""); setBody(""); setPinned(false); setErr(null); setOpen(false); }
  function submit() {
    setErr(null);
    start(async () => {
      const r = await postAnnouncement(orgId, title, body, pinned);
      if (!r.ok) { setErr(r.error); return; }
      reset();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
        + New announcement
      </button>
    );
  }

  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" style={inputStyle} autoFocus />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to tell your students?" rows={5} style={{ ...inputStyle, marginTop: 8, resize: "vertical", fontFamily: "inherit" }} />
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "#8892A4", cursor: "pointer" }}>
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
        Pin to top
      </label>
      {err && <div style={{ marginTop: 8, padding: "8px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={submit} disabled={pending || title.trim().length < 3 || body.trim().length < 1} style={btnPrimary}>{pending ? "Posting…" : "Post"}</button>
        <button onClick={reset} disabled={pending} style={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#8892A4", border: "1px solid #1F2937", borderRadius: 6, fontSize: 12, cursor: "pointer" };
