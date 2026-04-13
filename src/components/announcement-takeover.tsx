"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listActiveTakeovers, confirmAnnouncement, voteOnPoll } from "@/app/actions/announcements";
import toast from "react-hot-toast";

interface Announcement {
  id: string; title: string; body: string; kind: string; priority: "low" | "medium" | "high" | "critical";
  image_url: string | null; video_url: string | null; youtube_id: string | null;
  cta_label: string | null; cta_url: string | null;
  poll_options: string[] | null;
  require_confirmation: boolean;
  delay_close_seconds: number;
  display_duration_seconds: number | null;
  expires_at: string | null;
  sender: { name: string; avatar_url: string | null } | null;
}

const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", medium: "#1E88E5", high: "#FFC107", critical: "#EF5350" };

export function AnnouncementTakeover() {
  const router = useRouter();
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [voted, setVoted] = useState<number | null>(null);
  const startRef = useRef<number>(0);

  const load = useCallback(async () => {
    const res = await listActiveTakeovers();
    if (res.ok && res.data) setQueue(res.data as unknown as Announcement[]);
  }, []);

  // Initial load + 60s poll + focus reload (cheap realtime)
  useEffect(() => {
    load();
    const i = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(i); window.removeEventListener("focus", onFocus); };
  }, [load]);

  // Play sound when a new critical/high appears
  useEffect(() => {
    if (!current && queue.length > 0) {
      const next = queue[0];
      setCurrent(next); setElapsed(0); setVoted(null);
      startRef.current = Date.now();
      playSound(next.priority);
    }
  }, [queue, current]);

  // Elapsed timer + auto-close duration
  useEffect(() => {
    if (!current) return;
    const i = setInterval(() => {
      const secs = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(secs);
      if (current.display_duration_seconds && secs >= current.display_duration_seconds && !current.require_confirmation) {
        onClose();
      }
    }, 500);
    return () => clearInterval(i);
  }, [current]); // eslint-disable-line

  const onClose = async () => {
    if (!current) return;
    const cur = current;
    setCurrent(null);
    setQueue((q) => q.filter((a) => a.id !== cur.id));
  };

  const onConfirm = async (action: "read" | "comply" | "dismiss") => {
    if (!current) return;
    const cur = current;
    const res = await confirmAnnouncement(cur.id, action);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Confirmed");
    onClose();
  };

  const onVote = async (idx: number) => {
    if (!current) return;
    const res = await voteOnPoll(current.id, idx);
    if (!res.ok) { toast.error(res.error); return; }
    setVoted(idx);
  };

  if (!current) return null;

  const color = PRIORITY_COLOR[current.priority] || "#1E88E5";
  const canClose = elapsed >= (current.delay_close_seconds || 0);
  const countdownLeft = Math.max(0, (current.delay_close_seconds || 0) - elapsed);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, background: current.priority === "critical" ? "rgba(239,83,80,0.25)" : "rgba(0,0,0,0.82)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20,
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{
        background: "#0A0E1A", border: `2px solid ${color}`, borderRadius: 20, padding: 28,
        maxWidth: 640, width: "100%", maxHeight: "90vh", overflowY: "auto",
        boxShadow: `0 0 60px ${color}55`,
        animation: "takeover-in 0.35s cubic-bezier(.2,.8,.2,1)",
        position: "relative",
      }}>
        {/* Priority banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: `${color}22`, color, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, animation: "cios-pulse 1s ease-in-out infinite" }} />
            {current.priority === "critical" ? "🚨 EMERGENCY" : current.priority === "high" ? "⚠️ HIGH PRIORITY" : "📢 ANNOUNCEMENT"}
          </span>
          {current.sender?.name && <span style={{ fontSize: 11, color: "#8892A4" }}>from {current.sender.name}</span>}
          <div style={{ flex: 1 }} />
          {canClose ? (
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, cursor: "pointer" }}>✕</button>
          ) : (
            <span style={{ fontSize: 11, color: "#8892A4", padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>⏱ {countdownLeft}s</span>
          )}
        </div>

        {/* Media */}
        {current.youtube_id && (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 14, borderRadius: 10, overflow: "hidden" }}>
            <iframe src={`https://www.youtube.com/embed/${current.youtube_id}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
          </div>
        )}
        {current.image_url && !current.youtube_id && (
          <img src={current.image_url} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 14, display: "block" }} />
        )}
        {current.video_url && !current.youtube_id && !current.image_url && (
          <video src={current.video_url} controls style={{ width: "100%", borderRadius: 10, marginBottom: 14 }} />
        )}

        {/* Title + body */}
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px 0", lineHeight: 1.2, fontFamily: "'Space Grotesk', sans-serif" }}>{current.title}</h2>
        {current.body && <p style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.65, whiteSpace: "pre-wrap", margin: "0 0 16px 0" }}>{current.body}</p>}

        {/* Poll */}
        {current.poll_options?.length && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Cast your vote</div>
            {current.poll_options.map((opt, i) => (
              <button key={i} onClick={() => onVote(i)} disabled={voted !== null} style={{
                display: "block", width: "100%", padding: "11px 14px", marginBottom: 6,
                background: voted === i ? `${color}22` : "rgba(255,255,255,0.03)",
                border: voted === i ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                color: voted === i ? color : "#E8EDF5",
                borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: voted !== null ? "default" : "pointer", textAlign: "left",
              }}>{voted === i ? "✓ " : ""}{opt}</button>
            ))}
          </div>
        )}

        {/* CTA */}
        {current.cta_url && current.cta_label && (
          <a href={current.cta_url} target="_blank" rel="noreferrer" style={{
            display: "block", textAlign: "center", padding: "12px 20px",
            background: `linear-gradient(135deg, ${color}, ${color}CC)`,
            color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 12,
          }}>{current.cta_label} →</a>
        )}

        {/* Confirm actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          {current.require_confirmation && (
            <>
              {current.priority === "critical" && <button onClick={() => onConfirm("comply")} disabled={!canClose} style={btnConfirm(color, canClose)}>I will comply</button>}
              <button onClick={() => onConfirm("read")} disabled={!canClose} style={btnConfirm(color, canClose)}>✓ I have read this</button>
            </>
          )}
          {!current.require_confirmation && canClose && (
            <button onClick={() => onConfirm("dismiss")} style={{ ...btnConfirm(color, true), background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.12)" }}>Dismiss</button>
          )}
          <button onClick={() => { onClose(); router.push(`/announcements/${current.id}`); }} style={{ padding: "10px 16px", background: "transparent", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Open full →</button>
        </div>
      </div>

      <style>{`
        @keyframes takeover-in {
          from { transform: translateY(20px) scale(0.96); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function btnConfirm(color: string, enabled: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    background: enabled ? `linear-gradient(135deg, ${color}, ${color}DD)` : "#5A6478",
    color: "#fff", border: "none", borderRadius: 10,
    fontSize: 12, fontWeight: 700, cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.55,
  };
}

function playSound(priority: string) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const beeps = priority === "critical" ? 4 : priority === "high" ? 2 : 1;
    const freq = priority === "critical" ? 880 : 660;
    for (let i = 0; i < beeps; i++) {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = priority === "critical" ? "square" : "triangle";
      osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.2;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t); osc.stop(t + 0.18);
    }
  } catch {/* no audio available */}
}
