"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createAnnouncement, type Priority, type AudienceType, type Kind } from "@/app/actions/announcements";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

const PRIORITIES: { id: Priority; label: string; color: string; desc: string }[] = [
  { id: "low",      label: "Low",      color: "#8892A4", desc: "Bell notification only" },
  { id: "medium",   label: "Medium",   color: "#1E88E5", desc: "Dashboard card + sound" },
  { id: "high",     label: "High",     color: "#FFC107", desc: "Popup takeover, must acknowledge" },
  { id: "critical", label: "Critical", color: "#EF5350", desc: "Emergency fullscreen alert" },
];

const KINDS: { id: Kind; label: string }[] = [
  { id: "text", label: "📝 Text" }, { id: "image", label: "🖼 Image" },
  { id: "video", label: "🎬 Video" }, { id: "poll", label: "📊 Poll" },
  { id: "update", label: "🔔 Update" }, { id: "emergency", label: "🚨 Emergency" },
  { id: "event", label: "📅 Event" }, { id: "payment", label: "💳 Payment" },
  { id: "route_lock", label: "🔒 Route lock" }, { id: "survey", label: "📋 Survey" },
];

const ROLE_OPTIONS = ["intern", "team_lead", "admin", "super_admin", "instructor", "moderator", "finance", "support", "recruiter"];

export function ComposerClient({ permission, role }: { permission: { allowed_audiences: string[]; max_priority: string }; role: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  void role;
  const [f, setF] = useState({
    title: "", body: "", kind: "text" as Kind, priority: "low" as Priority,
    imageUrl: "", videoUrl: "", youtubeId: "", ctaLabel: "", ctaUrl: "",
    pollOptions: [] as string[],
    audienceType: (permission.allowed_audiences[0] as AudienceType) || "role",
    audienceRoles: [] as string[],
    audienceUserIds: [] as string[],
    requireConfirmation: false,
    delayCloseSeconds: 0,
    displayDurationSeconds: null as number | null,
    expiresAt: "",
    routeLockPath: "",
  });
  const [uploading, setUploading] = useState(false);
  const [newPollOpt, setNewPollOpt] = useState("");

  const maxRank = PRIORITIES.findIndex((p) => p.id === permission.max_priority);
  const availablePriorities = PRIORITIES.slice(0, maxRank + 1);

  const upload = async (file: File, field: "imageUrl" | "videoUrl") => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return toast.error("Cloudinary not configured");
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");
      setF((p) => ({ ...p, [field]: data.secure_url }));
      toast.success("Uploaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const submit = () => start(async () => {
    if (!f.title.trim()) return toast.error("Title required");
    const res = await createAnnouncement({
      title: f.title, body: f.body, kind: f.kind, priority: f.priority,
      imageUrl: f.imageUrl || undefined, videoUrl: f.videoUrl || undefined, youtubeId: f.youtubeId || undefined,
      ctaLabel: f.ctaLabel || undefined, ctaUrl: f.ctaUrl || undefined,
      pollOptions: f.kind === "poll" ? f.pollOptions : undefined,
      audienceType: f.audienceType,
      audienceRoles: f.audienceRoles.length ? f.audienceRoles : undefined,
      audienceUserIds: f.audienceUserIds.length ? f.audienceUserIds : undefined,
      requireConfirmation: f.requireConfirmation,
      delayCloseSeconds: f.delayCloseSeconds,
      displayDurationSeconds: f.displayDurationSeconds,
      expiresAt: f.expiresAt ? new Date(f.expiresAt).toISOString() : null,
      routeLockPath: f.routeLockPath || null,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success("Broadcast sent");
    router.push(`/announcements/${res.data!.id}`);
  });

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📢 Compose announcement</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Your role: <strong style={{ color: "#E8EDF5" }}>{role}</strong> · Max priority: <strong style={{ color: "#1E88E5" }}>{permission.max_priority}</strong> · Allowed audiences: <strong style={{ color: "#E8EDF5" }}>{permission.allowed_audiences.join(", ")}</strong></p>
      </div>

      <div style={panel}>
        <label style={lbl}>Title *</label>
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Clear, scannable headline" style={input} />
        <label style={lbl}>Body</label>
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={5} style={{ ...input, fontFamily: "inherit", resize: "vertical" }} />

        <label style={lbl}>Kind</label>
        <div style={chipRow}>
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => setF({ ...f, kind: k.id })} style={{
              padding: "6px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: f.kind === k.id ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.04)",
              color: f.kind === k.id ? "#1E88E5" : "#8892A4", border: "1px solid transparent",
            }}>{k.label}</button>
          ))}
        </div>

        <label style={lbl}>Priority</label>
        <div style={chipRow}>
          {availablePriorities.map((p) => (
            <button key={p.id} onClick={() => setF({ ...f, priority: p.id })} style={{
              padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: f.priority === p.id ? `${p.color}22` : "rgba(255,255,255,0.03)",
              color: f.priority === p.id ? p.color : "#8892A4",
              border: `1px solid ${f.priority === p.id ? p.color : "rgba(255,255,255,0.08)"}`,
              textAlign: "left", minWidth: 160,
            }}>
              <div>{p.label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>{p.desc}</div>
            </button>
          ))}
        </div>

        {/* Media */}
        {f.kind === "image" && (
          <>
            <label style={lbl}>Image</label>
            <label style={btnGhost}>{uploading ? "Uploading…" : f.imageUrl ? "✓ Replace" : "⬆ Upload image"}
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const fl = e.target.files?.[0]; if (fl) upload(fl, "imageUrl"); e.currentTarget.value = ""; }} />
            </label>
            {f.imageUrl && <img src={f.imageUrl} alt="" style={{ maxWidth: 240, borderRadius: 8, marginTop: 8, display: "block" }} />}
          </>
        )}
        {f.kind === "video" && (
          <>
            <label style={lbl}>YouTube video ID <span style={{ color: "#5A6478", fontWeight: 400 }}>(or paste a YouTube URL)</span></label>
            <input value={f.youtubeId} onChange={(e) => setF({ ...f, youtubeId: extractYoutubeId(e.target.value) })} placeholder="dQw4w9WgXcQ" style={input} />
            <label style={lbl}>…or upload video</label>
            <label style={btnGhost}>{uploading ? "Uploading…" : f.videoUrl ? "✓ Replace" : "⬆ Upload video"}
              <input type="file" accept="video/*" style={{ display: "none" }} onChange={(e) => { const fl = e.target.files?.[0]; if (fl) upload(fl, "videoUrl"); e.currentTarget.value = ""; }} />
            </label>
          </>
        )}
        {f.kind === "poll" && (
          <>
            <label style={lbl}>Poll options</label>
            {f.pollOptions.map((o, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={o} readOnly style={{ ...input, flex: 1, background: "rgba(30,136,229,0.08)" }} />
                <button onClick={() => setF({ ...f, pollOptions: f.pollOptions.filter((_, k) => k !== i) })} style={btnDanger}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              <input value={newPollOpt} onChange={(e) => setNewPollOpt(e.target.value)} placeholder="Add option…" style={{ ...input, flex: 1 }} onKeyDown={(e) => { if (e.key === "Enter" && newPollOpt.trim()) { setF({ ...f, pollOptions: [...f.pollOptions, newPollOpt.trim()] }); setNewPollOpt(""); } }} />
              <button onClick={() => { if (newPollOpt.trim()) { setF({ ...f, pollOptions: [...f.pollOptions, newPollOpt.trim()] }); setNewPollOpt(""); } }} style={btnPrimary}>Add</button>
            </div>
          </>
        )}

        {/* CTA */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginTop: 4 }}>
          <div><label style={lbl}>CTA label</label><input value={f.ctaLabel} onChange={(e) => setF({ ...f, ctaLabel: e.target.value })} placeholder="Read more" style={{ ...input, width: "100%" }} /></div>
          <div><label style={lbl}>CTA URL</label><input value={f.ctaUrl} onChange={(e) => setF({ ...f, ctaUrl: e.target.value })} placeholder="https://…" style={{ ...input, width: "100%" }} /></div>
        </div>

        {/* Audience */}
        <label style={lbl}>Audience</label>
        <select value={f.audienceType} onChange={(e) => setF({ ...f, audienceType: e.target.value as AudienceType })} style={input}>
          {permission.allowed_audiences.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {(f.audienceType === "role" || f.audienceType === "portal") && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>Select roles:</div>
            <div style={chipRow}>
              {ROLE_OPTIONS.map((r) => (
                <button key={r} onClick={() => {
                  const has = f.audienceRoles.includes(r);
                  setF({ ...f, audienceRoles: has ? f.audienceRoles.filter((x) => x !== r) : [...f.audienceRoles, r] });
                }} style={{
                  padding: "5px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: "pointer",
                  background: f.audienceRoles.includes(r) ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.04)",
                  color: f.audienceRoles.includes(r) ? "#1E88E5" : "#8892A4", border: "1px solid transparent",
                }}>{r}</button>
              ))}
            </div>
          </div>
        )}

        {/* Advanced */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
          <div><label style={lbl}>Delay close (s)</label><input type="number" value={f.delayCloseSeconds} onChange={(e) => setF({ ...f, delayCloseSeconds: parseInt(e.target.value) || 0 })} style={{ ...input, width: "100%" }} /></div>
          <div><label style={lbl}>Auto-close (s)</label><input type="number" value={f.displayDurationSeconds || ""} onChange={(e) => setF({ ...f, displayDurationSeconds: parseInt(e.target.value) || null })} style={{ ...input, width: "100%" }} /></div>
          <div><label style={lbl}>Expires</label><input type="datetime-local" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} style={{ ...input, width: "100%" }} /></div>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 12, color: "#E8EDF5" }}>
          <input type="checkbox" checked={f.requireConfirmation} onChange={(e) => setF({ ...f, requireConfirmation: e.target.checked })} /> Require explicit confirmation from users
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          <button onClick={() => router.push("/announcements")} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={pending || !f.title.trim()} style={btnPrimary}>{pending ? "Broadcasting…" : "📢 Broadcast"}</button>
        </div>
      </div>
    </div>
  );
}

function extractYoutubeId(input: string): string {
  const m = input.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : input.trim();
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22 };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", marginBottom: 6 };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 10, fontWeight: 700 };
const chipRow: React.CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-block" };
const btnDanger: React.CSSProperties = { padding: "6px 10px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 6, fontSize: 11, cursor: "pointer" };
