"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listTestimonials, writeTestimonial, type Testimonial } from "@/app/actions/peer-recognition";
import { timeAgo } from "@/lib/time-format";

export function TestimonialsSection({ subjectId, meId, subjectName }: {
  subjectId: string; meId: string | null; subjectName: string;
}) {
  const [rows, setRows] = useState<Testimonial[] | null>(null);
  const [writing, setWriting] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { listTestimonials(subjectId).then((r) => { if (r.ok) setRows(r.data!); }); }, [subjectId]);

  async function submit() {
    setBusy(true);
    const r = await writeTestimonial(subjectId, body);
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Posted");
    setBody(""); setWriting(false);
    const reload = await listTestimonials(subjectId);
    if (reload.ok) setRows(reload.data!);
  }

  if (rows === null) return null;
  const canWrite = meId && meId !== subjectId;
  if (rows.length === 0 && !canWrite) return null;

  return (
    <section style={panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", margin: 0 }}>
          ✍️ Testimonials ({rows.length})
        </h2>
        {canWrite && !writing && (
          <button onClick={() => setWriting(true)} style={btnSmall}>
            Write one
          </button>
        )}
      </div>
      {writing && (
        <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#FFC107", fontWeight: 700, marginBottom: 6 }}>What&apos;s {subjectName} great at?</div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={800}
            placeholder={`I worked with ${subjectName} on… They brought…`}
            style={{ width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, color: "#E8EDF5", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: "#5A6478" }}>{body.length}/800</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setWriting(false); setBody(""); }} style={{ ...btnSmall, background: "transparent", color: "#8892A4" }}>Cancel</button>
              <button onClick={submit} disabled={busy || body.trim().length < 20} style={{ ...btnSmall, background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", opacity: body.trim().length < 20 ? 0.5 : 1 }}>
                {busy ? "Posting…" : "Post testimonial"}
              </button>
            </div>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "#8892A4" }}>No testimonials yet. Be the first.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((t) => (
            <div key={t.id} style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {t.author_avatar
                  ? <img src={t.author_avatar} alt="" width={26} height={26} style={{ borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11 }}>{(t.author_name || "?").charAt(0).toUpperCase()}</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{t.author_name || "Anonymous"}</div>
                {t.author_role && <span style={{ fontSize: 9, padding: "1px 6px", background: "rgba(30,136,229,0.12)", color: "#1E88E5", borderRadius: 4, fontWeight: 700, textTransform: "capitalize" }}>{t.author_role.replace(/_/g, " ")}</span>}
                <span style={{ fontSize: 10, color: "#5A6478", marginLeft: "auto" }}>{timeAgo(t.created_at)}</span>
              </div>
              <p style={{ fontSize: 13, color: "#E8EDF5", margin: 0, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>&ldquo;{t.body}&rdquo;</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const btnSmall: React.CSSProperties = { padding: "6px 12px", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", color: "#FFC107", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" };
