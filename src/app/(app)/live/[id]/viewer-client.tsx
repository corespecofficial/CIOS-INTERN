"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useTransition } from "react";
import toast from "react-hot-toast";
import { recordAttendance, updateSessionStatus, deleteLiveSession, type LiveSessionRow } from "@/app/actions/live-sessions";
import type { LiveEmbed } from "@/lib/live-embed";

export function LiveViewerClient({ session, embed, isHost }: { session: LiveSessionRow; embed: LiveEmbed | null; isHost: boolean }) {
  const [pending, start] = useTransition();

  useEffect(() => {
    // Record attendance once on mount.
    recordAttendance(session.id).then((r) => {
      if (r.ok && !session.i_attended) {
        window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: r.data!.xp, label: "Attended live" } }));
      }
    });
  }, [session.id, session.i_attended]);

  const setStatus = (status: "live" | "ended" | "cancelled") => start(async () => {
    const r = await updateSessionStatus(session.id, status);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Status: ${status}`);
    if (typeof window !== "undefined") window.location.reload();
  });

  const onDelete = () => start(async () => {
    if (!confirm("Delete this live session?")) return;
    const r = await deleteLiveSession(session.id);
    if (!r.ok) { toast.error(r.error); return; }
    window.location.href = "/live";
  });

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, color: statusColor(session.status), textTransform: "uppercase", letterSpacing: 1 }}>
            {session.status === "live" && <span style={{ animation: "pulse 1.5s infinite" }}>● LIVE</span>}
            {session.status !== "live" && session.status.toUpperCase()}
            <span style={{ color: "#5A6478" }}>·</span>
            <span style={{ color: "#8892A4" }}>{embed?.label || session.provider}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "4px 0" }}>{session.title}</h1>
          <div style={{ fontSize: 12, color: "#8892A4" }}>
            Hosted by {session.host_name || "Host"} · {new Date(session.scheduled_at).toLocaleString()} · {session.duration_min}m
            {session.course_title && <> · 📚 {session.course_title}</>}
          </div>
        </div>
        {isHost && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {session.status === "scheduled" && <button onClick={() => setStatus("live")} disabled={pending} style={btnRed}>Go live</button>}
            {session.status === "live" && <button onClick={() => setStatus("ended")} disabled={pending} style={btnGhost}>End session</button>}
            {session.status === "scheduled" && <button onClick={() => setStatus("cancelled")} disabled={pending} style={btnGhost}>Cancel</button>}
            <button onClick={onDelete} disabled={pending} style={btnGhost}>Delete</button>
          </div>
        )}
      </div>

      {session.description && (
        <p style={{ fontSize: 14, color: "#B0BEC5", margin: "0 0 14px", lineHeight: 1.6 }}>{session.description}</p>
      )}

      {/* Embed / launch area */}
      {embed && embed.embedUrl && !embed.directOnly ? (
        <div style={{ aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", background: "#000", marginBottom: 14 }}>
          <iframe
            src={embed.embedUrl}
            title={session.title}
            allow="autoplay; picture-in-picture; fullscreen; encrypted-media"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 40, textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🎥</div>
          <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700, marginBottom: 8 }}>
            {embed?.label || "External stream"}
          </div>
          <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 18 }}>
            {embed?.directOnly ? "This provider doesn't allow embedding. Click below to join in a new tab." : "Open the stream in a new tab."}
          </div>
          <a href={embed?.directUrl || session.embed_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg,#EF5350,#C62828)", color: "#fff", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
            Join {embed?.label || "stream"} →
          </a>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#8892A4", textAlign: "center" }}>
        {session.attending_count} intern{session.attending_count === 1 ? "" : "s"} attended
      </div>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
    </>
  );
}

function statusColor(s: string) {
  if (s === "live") return "#EF5350";
  if (s === "scheduled") return "#1E88E5";
  if (s === "ended") return "#5A6478";
  return "#8892A4";
}
const btnRed: React.CSSProperties = { padding: "8px 14px", background: "linear-gradient(135deg,#EF5350,#C62828)", color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
