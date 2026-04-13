"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { confirmAnnouncement, voteOnPoll, deleteAnnouncement } from "@/app/actions/announcements";

const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", medium: "#1E88E5", high: "#FFC107", critical: "#EF5350" };

export function DetailClient({ ann, isSender, analytics }: {
  ann: Record<string, unknown>;
  isSender: boolean;
  analytics: { delivered: number; opened: number; confirmed: number; pollVotes: Array<{ option: number; count: number }> } | null;
}) {
  const [pending, start] = useTransition();
  const [voted, setVoted] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const color = PRIORITY_COLOR[ann.priority as string] || "#8892A4";
  const sender = ann.sender as { id: string; name: string; avatar_url: string | null; role: string } | null;
  const pollOptions = (ann.poll_options as string[] | null) || null;
  const voteCounts = new Map((analytics?.pollVotes || []).map((v) => [v.option, v.count]));

  const onConfirm = () => start(async () => {
    const res = await confirmAnnouncement(ann.id as string, "read");
    if (res.ok) { setConfirmed(true); toast.success("Confirmed"); }
    else toast.error(res.error);
  });

  const onVote = (idx: number) => start(async () => {
    const res = await voteOnPoll(ann.id as string, idx);
    if (res.ok) { setVoted(idx); toast.success("Vote recorded"); }
    else toast.error(res.error);
  });

  const onDelete = () => start(async () => {
    if (!confirm("Archive this announcement?")) return;
    const res = await deleteAnnouncement(ann.id as string);
    if (res.ok) { toast.success("Archived"); window.location.href = "/announcements"; }
    else toast.error(res.error);
  });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <Link href="/announcements" style={{ fontSize: 12, color: "#8892A4", textDecoration: "none" }}>← All announcements</Link>

      <div style={{ background: "#111827", border: `1px solid ${color}44`, borderRadius: 16, padding: 24, marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, background: `${color}22`, color, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
            {ann.priority === "critical" ? "🚨 CRITICAL" : ann.priority === "high" ? "⚠️ HIGH" : `${ann.priority}`.toUpperCase()}
          </span>
          <span style={{ fontSize: 11, color: "#8892A4" }}>
            {sender?.name || "—"} · {new Date(ann.created_at as string).toLocaleString()}
          </span>
          {ann.require_confirmation && <span style={{ fontSize: 10, color: "#FFC107" }}>✓ confirmation required</span>}
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: "#E8EDF5", margin: "0 0 14px 0", lineHeight: 1.2 }}>{ann.title as string}</h1>

        {ann.youtube_id && (
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, marginBottom: 16, borderRadius: 12, overflow: "hidden" }}>
            <iframe src={`https://www.youtube.com/embed/${ann.youtube_id as string}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} allowFullScreen />
          </div>
        )}
        {ann.image_url && !ann.youtube_id && <img src={ann.image_url as string} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 14 }} />}
        {ann.video_url && !ann.youtube_id && !ann.image_url && <video src={ann.video_url as string} controls style={{ width: "100%", borderRadius: 12, marginBottom: 14 }} />}

        {ann.body && <p style={{ fontSize: 15, color: "#E8EDF5", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: "0 0 18px 0" }}>{ann.body as string}</p>}

        {pollOptions && pollOptions.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Poll</div>
            {pollOptions.map((opt, i) => {
              const count = voteCounts.get(i) || 0;
              const total = Array.from(voteCounts.values()).reduce((s, v) => s + v, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <button key={i} onClick={() => onVote(i)} disabled={voted !== null || pending} style={{
                  display: "block", width: "100%", padding: "11px 14px", marginBottom: 6,
                  background: voted === i ? `${color}22` : "rgba(255,255,255,0.03)",
                  border: voted === i ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                  color: voted === i ? color : "#E8EDF5",
                  borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: voted !== null ? "default" : "pointer", textAlign: "left", position: "relative", overflow: "hidden",
                }}>
                  <span style={{ position: "relative", zIndex: 1 }}>{voted === i ? "✓ " : ""}{opt}</span>
                  {isSender && <span style={{ position: "relative", zIndex: 1, float: "right", fontSize: 11, color: "#8892A4" }}>{count} · {pct}%</span>}
                </button>
              );
            })}
          </div>
        )}

        {ann.cta_url && ann.cta_label && (
          <a href={ann.cta_url as string} target="_blank" rel="noreferrer" style={{
            display: "block", textAlign: "center", padding: "12px 20px",
            background: `linear-gradient(135deg, ${color}, ${color}CC)`,
            color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 14,
          }}>{ann.cta_label as string} →</a>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          {isSender && <button onClick={onDelete} disabled={pending} style={{ padding: "9px 14px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑 Archive</button>}
          {!confirmed && (
            <button onClick={onConfirm} disabled={pending} style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${color}, ${color}DD)`, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {pending ? "..." : "✓ I have read this"}
            </button>
          )}
          {confirmed && <span style={{ padding: "10px 18px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderRadius: 10, fontSize: 13, fontWeight: 700 }}>✓ Confirmed</span>}
        </div>
      </div>

      {/* Analytics for sender */}
      {isSender && analytics && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18, marginTop: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 800, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 12px 0" }}>📊 Delivery analytics</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <Stat label="Delivered" value={analytics.delivered} color="#8892A4" />
            <Stat label="Opened" value={analytics.opened} color="#1E88E5" />
            <Stat label="Confirmed" value={analytics.confirmed} color="#66BB6A" />
            <Stat label="Open rate" value={`${analytics.delivered ? Math.round((analytics.opened / analytics.delivered) * 100) : 0}%`} color="#AB47BC" />
            <Stat label="Confirm rate" value={`${analytics.opened ? Math.round((analytics.confirmed / analytics.opened) * 100) : 0}%`} color="#FFC107" />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#0A0E1A", border: `1px solid ${color}33`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>{value}</div>
    </div>
  );
}
