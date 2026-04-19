"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import {
  createBroadcast,
  markBroadcastViewed,
  reactToBroadcast,
  deleteBroadcast,
  type Broadcast,
} from "@/app/actions/broadcasts";
import { createLiveBroadcast } from "@/app/actions/livekit";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#EF5350",
};

const REACTIONS = ["🔥", "❤️", "👍", "🤯", "💡"];

function fmtDuration(s: number | null): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

interface Props {
  initialBroadcasts: Broadcast[];
  canBroadcast: boolean;
}

export default function BroadcastsClient({ initialBroadcasts, canBroadcast }: Props) {
  const router = useRouter();
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [viewing, setViewing] = useState<Broadcast | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [pending, startTransition] = useTransition();

  function onPlay(b: Broadcast) {
    setViewing(b);
    if (!b.viewed_by_me) {
      markBroadcastViewed(b.id).catch(() => {});
      setBroadcasts((prev) => prev.map((x) => x.id === b.id ? { ...x, viewed_by_me: true, view_count: x.view_count + 1 } : x));
    }
  }

  function onReact(id: string, reaction: string) {
    startTransition(async () => {
      await reactToBroadcast(id, reaction);
      setBroadcasts((prev) => prev.map((b) => {
        if (b.id !== id) return b;
        const has = b.my_reactions.includes(reaction);
        const newCount = (b.reaction_counts[reaction] ?? 0) + (has ? -1 : 1);
        return {
          ...b,
          reaction_counts: { ...b.reaction_counts, [reaction]: Math.max(0, newCount) },
          my_reactions: has ? b.my_reactions.filter((r) => r !== reaction) : [...b.my_reactions, reaction],
        };
      }));
    });
  }

  function onDelete(id: string) {
    if (!confirm("Delete this broadcast?")) return;
    startTransition(async () => {
      const res = await deleteBroadcast(id);
      if (res.ok) {
        setBroadcasts((prev) => prev.filter((b) => b.id !== id));
        setViewing(null);
        router.refresh();
      }
    });
  }

  function onPublished(b: Broadcast) {
    setBroadcasts((prev) => [b, ...prev]);
    setShowRecorder(false);
    router.refresh();
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`@keyframes live-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(239,83,80,0.12)", border: "1px solid rgba(239,83,80,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>
            📹 Broadcasts
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Messages from the team.</h1>
          <p style={{ margin: "4px 0 0", color: C.dim, fontSize: 13 }}>
            Short video updates from admins, mentors, and instructors. Async — watch when it fits.
          </p>
        </div>
        {canBroadcast && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                const title = prompt("Title for this live broadcast?");
                if (!title?.trim()) return;
                const res = await createLiveBroadcast({ title, start_now: true });
                if (!res.ok) { alert(res.error); return; }
                if (res.data) router.push(`/broadcasts/live/${res.data.broadcast_id}`);
              }}
              style={{ padding: "10px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              🔴 Go Live
            </button>
            <button onClick={() => setShowRecorder(true)} style={{ padding: "10px 16px", background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              📹 Record
            </button>
          </div>
        )}
      </div>

      {showRecorder && <Recorder onClose={() => setShowRecorder(false)} onPublished={onPublished} />}

      {broadcasts.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📹</div>
          No broadcasts yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {broadcasts.map((b) => (
            <div key={b.id} style={{ background: C.card, border: `1px solid ${b.is_live ? C.accent + "88" : b.pinned ? "#FFC10744" : C.border}`, borderRadius: 12, padding: 16, display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <button
                onClick={() => b.is_live ? router.push(`/broadcasts/live/${b.id}`) : onPlay(b)}
                style={{
                  flex: "0 0 180px",
                  aspectRatio: "16/9",
                  background: b.thumbnail_url ? `url(${b.thumbnail_url}) center/cover` : "linear-gradient(135deg, #1a1a2e, #0e0e18)",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  position: "relative",
                  padding: 0,
                }}
              >
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: b.is_live ? C.accent : "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: b.is_live ? "#fff" : "#000" }}>
                    {b.is_live ? "🔴" : "▶"}
                  </div>
                </div>
                {b.is_live && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: C.accent, color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 800, letterSpacing: 1, animation: "live-pulse 1.5s infinite" }}>
                    ● LIVE
                  </div>
                )}
                {!b.is_live && b.duration_sec && (
                  <div style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.8)", color: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                    {fmtDuration(b.duration_sec)}
                  </div>
                )}
                {b.pinned && !b.is_live && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(255,193,7,0.95)", color: "#000", padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 800 }}>📌 PINNED</div>
                )}
                {b.mode === "scheduled" && b.scheduled_at && !b.is_live && (
                  <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(77,168,255,0.95)", color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 9, fontWeight: 800 }}>⏰ SCHEDULED</div>
                )}
              </button>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.2, marginBottom: 3, lineHeight: 1.3 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: C.dim }}>by {b.author_name} · {timeAgo(b.created_at)} · 👁 {b.view_count}</div>
                {b.description && <p style={{ fontSize: 12, color: C.dim, margin: "8px 0 0", lineHeight: 1.5 }}>{b.description.length > 150 ? `${b.description.slice(0, 150)}…` : b.description}</p>}
                {!b.viewed_by_me && (
                  <div style={{ display: "inline-block", marginTop: 8, padding: "2px 8px", background: `${C.accent}22`, color: C.accent, fontSize: 10, fontWeight: 700, borderRadius: 999 }}>
                    NEW
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Viewer modal */}
      {viewing && (
        <div onClick={() => setViewing(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 0, maxWidth: 820, width: "100%", maxHeight: "92vh", overflow: "auto" }}>
            <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{viewing.title}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>by {viewing.author_name} · {timeAgo(viewing.created_at)}</div>
              </div>
              <button onClick={() => onDelete(viewing.id)} style={{ background: "transparent", color: C.dim, border: "none", fontSize: 16, cursor: "pointer" }}>⋯</button>
              <button onClick={() => setViewing(null)} style={{ background: "transparent", color: C.text, border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <video src={viewing.video_url} controls autoPlay style={{ width: "100%", maxHeight: "60vh", background: "#000" }} />
            <div style={{ padding: "14px 20px" }}>
              {viewing.description && <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6, margin: "0 0 14px" }}>{viewing.description}</p>}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {REACTIONS.map((r) => {
                  const has = viewing.my_reactions.includes(r);
                  const count = viewing.reaction_counts[r] ?? 0;
                  return (
                    <button
                      key={r}
                      onClick={() => onReact(viewing.id, r)}
                      disabled={pending}
                      style={{ padding: "7px 14px", background: has ? `${C.accent}22` : "transparent", color: C.text, border: `1px solid ${has ? C.accent : C.border}`, borderRadius: 999, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span>{r}</span>
                      {count > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Recorder({ onClose, onPublished }: { onClose: () => void; onPublished: (b: Broadcast) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "preview" | "uploading">("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAtRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setErr(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "video/webm" });
        setBlob(b);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(b);
          videoRef.current.muted = false;
          videoRef.current.load();
        }
        stream.getTracks().forEach((t) => t.stop());
        setState("preview");
      };
      mr.start();
      mediaRecorderRef.current = mr;
      startedAtRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
      setState("recording");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unable to access camera/mic");
    }
  }

  function stopRecording() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    mediaRecorderRef.current?.stop();
  }

  function reset() {
    setBlob(null);
    setDuration(0);
    setState("idle");
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.srcObject = null;
    }
  }

  async function publish() {
    if (!blob || !title.trim()) { setErr("Title required"); return; }
    setState("uploading");
    setErr(null);
    try {
      const file = new File([blob], `broadcast-${Date.now()}.webm`, { type: "video/webm" });
      const up = await uploadToCloudinary(file, { folder: "broadcasts", resourceType: "video" });
      startTransition(async () => {
        const res = await createBroadcast({
          title,
          description: description || undefined,
          video_url: up.secureUrl,
          thumbnail_url: up.secureUrl.replace(/\.webm$/, ".jpg"),
          duration_sec: duration,
        });
        if (!res.ok) { setErr(res.error); setState("preview"); return; }
        if (res.data) onPublished(res.data);
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
      setState("preview");
    }
  }

  const mm = String(Math.floor(duration / 60)).padStart(2, "0");
  const ss = String(duration % 60).padStart(2, "0");

  return (
    <div onClick={state === "idle" ? onClose : undefined} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, maxWidth: 620, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, flex: 1 }}>🔴 Record Broadcast</h2>
          {state === "idle" && <button onClick={onClose} style={{ background: "transparent", color: C.dim, border: "none", fontSize: 20, cursor: "pointer" }}>✕</button>}
        </div>

        <video ref={videoRef} controls={state === "preview"} style={{ width: "100%", maxHeight: 360, borderRadius: 10, background: "#000", marginBottom: 14 }} />

        {state === "idle" && (
          <button onClick={startRecording} style={{ width: "100%", padding: "13px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            🔴 Start Recording
          </button>
        )}

        {state === "recording" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: C.accent, marginBottom: 12 }}>
              ● REC {mm}:{ss}
            </div>
            <button onClick={stopRecording} style={{ padding: "12px 28px", background: C.text, color: "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
              ⏹ Stop
            </button>
          </div>
        )}

        {state === "preview" && (
          <>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={inp} />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} style={{ ...inp, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={reset} style={{ padding: "10px 14px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>↺ Re-record</button>
              <button onClick={publish} disabled={pending} style={{ flex: 1, padding: "10px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                📤 Publish ({mm}:{ss})
              </button>
            </div>
          </>
        )}

        {state === "uploading" && (
          <div style={{ textAlign: "center", padding: 20, color: C.dim }}>
            <div style={{ fontSize: 26 }}>⏳</div>
            Uploading to Cloudinary — this may take a moment…
          </div>
        )}

        {err && <div style={{ color: C.accent, fontSize: 12, marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 10,
  outline: "none",
  boxSizing: "border-box",
};
