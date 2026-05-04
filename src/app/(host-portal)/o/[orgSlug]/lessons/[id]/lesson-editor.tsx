"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLesson, deleteLesson } from "@/app/actions/org-portal";

interface Lesson {
  id: string;
  org_id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  position: number;
}

export function LessonEditor({ orgId, lesson }: { orgId: string; lesson: Lesson }) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body || "");
  const [video, setVideo] = useState(lesson.video_url || "");
  const [pos, setPos] = useState(lesson.position);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setErr(null);
    start(async () => {
      const r = await updateLesson(orgId, lesson.id, { title, body, video_url: video, position: pos });
      if (!r.ok) setErr(r.error);
    });
  }

  function destroy() {
    if (!confirm(`Delete "${lesson.title}"? This cannot be undone.`)) return;
    setErr(null);
    start(async () => {
      const r = await deleteLesson(orgId, lesson.id);
      if (!r.ok) { setErr(r.error); return; }
      router.push(`/o/${window.location.pathname.split("/")[2]}/lessons`);
    });
  }

  return (
    <div style={{ marginTop: 16 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ ...inputStyle, fontSize: 22, fontWeight: 800, padding: "12px 14px" }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Lesson notes…"
        rows={12}
        style={{ ...inputStyle, marginTop: 12, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Video URL" style={{ ...inputStyle, flex: 1 }} />
        <input type="number" value={pos} onChange={(e) => setPos(Number(e.target.value))} style={{ ...inputStyle, width: 90 }} />
      </div>
      {err && <div style={{ marginTop: 10, padding: "8px 10px", background: "#3D1F1F", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={save} disabled={pending || title.trim().length < 3} style={btnPrimary}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button onClick={destroy} disabled={pending} style={btnDanger}>Delete</button>
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
  padding: "10px 18px",
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 18px",
  background: "transparent",
  color: "#FF8A80",
  border: "1px solid #5C2424",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
};
