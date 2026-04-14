"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createLiveSession, type LiveSessionRow } from "@/app/actions/live-sessions";
import { parseLiveEmbed } from "@/lib/live-embed";

const PROVIDER_BADGE: Record<string, { label: string; color: string }> = {
  "youtube-live":      { label: "YouTube Live",      color: "#FF0000" },
  "twitch":            { label: "Twitch",            color: "#9146FF" },
  "tiktok-live":       { label: "TikTok Live",       color: "#25F4EE" },
  "google-meet":       { label: "Google Meet",       color: "#00897B" },
  "google-classroom":  { label: "Google Classroom",  color: "#1E88E5" },
  "zoom":              { label: "Zoom",              color: "#2D8CFF" },
  "generic":           { label: "Stream",            color: "#8892A4" },
};

export function LiveListClient({ initialSessions, canHost }: { initialSessions: LiveSessionRow[]; canHost: boolean }) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      {canHost && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
          <button onClick={() => setShowCreate((v) => !v)} style={btnPrimary}>
            {showCreate ? "Cancel" : "+ Schedule live session"}
          </button>
        </div>
      )}
      {showCreate && <CreateForm onCreated={(row) => { setSessions((prev) => [row, ...prev]); setShowCreate(false); }} />}

      {sessions.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
          <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700 }}>No live sessions scheduled</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>Instructors can schedule sessions from here.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {sessions.map((s) => {
            const when = new Date(s.scheduled_at);
            const isLive = s.status === "live";
            const mins = Math.round((when.getTime() - Date.now()) / 60000);
            const inFuture = mins > 0;
            const badge = PROVIDER_BADGE[s.provider] || PROVIDER_BADGE.generic;
            return (
              <Link key={s.id} href={`/live/${s.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#111827", border: isLive ? "1px solid #EF5350" : "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                  {isLive && (
                    <div style={{ position: "absolute", top: 12, right: 12, padding: "3px 8px", background: "#EF5350", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: 1, animation: "pulse 1.5s infinite" }}>
                      ● LIVE
                    </div>
                  )}
                  <div style={{ fontSize: 9, fontWeight: 800, color: badge.color, textTransform: "uppercase", letterSpacing: 1 }}>
                    {badge.label}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", lineHeight: 1.2 }}>{s.title}</div>
                  {s.course_title && (
                    <div style={{ fontSize: 11, color: "#8892A4" }}>📚 {s.course_title}</div>
                  )}
                  <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>
                    {isLive ? "Happening now" : inFuture ? `In ${mins < 60 ? `${mins} min` : `${Math.round(mins / 60)}h`}` : when.toLocaleString()}
                    {" · "}{s.duration_min}m
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    {s.host_avatar ? (
                      <img src={s.host_avatar} alt="" width={20} height={20} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    ) : null}
                    <span style={{ fontSize: 11, color: "#B0BEC5" }}>{s.host_name || "Host"}</span>
                    <span style={{ fontSize: 10, color: "#5A6478", marginLeft: "auto" }}>
                      {s.attending_count} attending
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: (row: LiveSessionRow) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 3600_000); d.setSeconds(0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(60);
  const [visibility, setVisibility] = useState<"course" | "public">("public");
  const [pending, start] = useTransition();
  const parsed = url ? parseLiveEmbed(url) : null;

  const save = () => start(async () => {
    const r = await createLiveSession({
      courseId: null, title, description, embedUrl: url,
      scheduledAt: new Date(scheduledAt).toISOString(),
      durationMin: duration, visibility,
    });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Session scheduled 📡");
    // Optimistic row; refresh via reload for accurate attending counts.
    if (typeof window !== "undefined") window.location.reload();
    void onCreated;
  });

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px" }}>Schedule live session</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title" style={input} maxLength={120} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" rows={2} style={{ ...input, resize: "vertical" }} />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste stream URL — YouTube Live, Twitch, TikTok Live, Google Meet, Classroom, or Zoom" style={input} />
        {parsed ? (
          <div style={{ fontSize: 11, color: "#66BB6A" }}>✓ Detected: {parsed.label}{parsed.directOnly ? " · launch-only (embed not supported by provider)" : " · embeds in-page"}</div>
        ) : url ? (
          <div style={{ fontSize: 11, color: "#EF5350" }}>⚠ Not a recognised stream URL</div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>Scheduled at</div>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={input} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>Duration (minutes)</div>
            <input type="number" min={5} max={480} value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 60)} style={input} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {(["public", "course"] as const).map((v) => (
            <button key={v} onClick={() => setVisibility(v)} style={{ flex: 1, padding: "9px 12px", background: visibility === v ? "rgba(30,136,229,0.15)" : "transparent", color: visibility === v ? "#1E88E5" : "#8892A4", border: `1px solid ${visibility === v ? "#1E88E5" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {v === "public" ? "🌍 Anyone logged-in" : "📚 Enrolled students only"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={save} disabled={pending || !parsed || !title.trim()} style={btnPrimary}>
            {pending ? "Saving…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "9px 16px", background: "linear-gradient(135deg,#EF5350,#C62828)",
  color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
};
const input: React.CSSProperties = {
  width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none",
};
