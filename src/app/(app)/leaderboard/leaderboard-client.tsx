"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { formatXP } from "@/lib/gamification-shared";

interface Row { id: string; name: string; avatarUrl: string | null; role: string; xp: number; level: number; streak: number; reputation: number; score: number; rank: number }

const TABS: { key: string; label: string; emoji: string }[] = [
  { key: "xp",           label: "Global XP",   emoji: "🌐" },
  { key: "weekly",       label: "This week",   emoji: "📅" },
  { key: "monthly",      label: "This month",  emoji: "📆" },
  { key: "contributors", label: "Contributors", emoji: "💬" },
  { key: "attendance",   label: "Attendance",  emoji: "🔥" },
];

export function LeaderboardClient({ meId, boards }: { meId: string; boards: Record<string, Row[]> }) {
  const [tab, setTab] = useState<string>("xp");
  const rows = boards[tab] || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>LEADERBOARD</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Who's climbing the ranks</h1>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.key ? "rgba(171,71,188,0.15)" : "transparent",
            color: tab === t.key ? "#AB47BC" : "#8892A4",
            border: "none", whiteSpace: "nowrap",
          }}>{t.emoji} {t.label}</button>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        {rows.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#8892A4" }}>No data for this leaderboard yet.</div>}
        {rows.map((r) => {
          const isMe = r.id === meId;
          return (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: isMe ? "rgba(30,136,229,0.08)" : r.rank <= 3 ? "rgba(255,213,79,0.04)" : "transparent",
            }}>
              <div style={{ width: 32, textAlign: "center", fontSize: 14, fontWeight: 800 }}>
                {r.rank <= 3 ? <span style={{ fontSize: 18 }}>{["🥇", "🥈", "🥉"][r.rank - 1]}</span> : <span style={{ color: "#8892A4" }}>{r.rank}</span>}
              </div>
              {r.avatarUrl
                ? <img src={r.avatarUrl} alt={r.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: isMe ? "2px solid #1E88E5" : "2px solid transparent" }} />
                : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{r.name.slice(0, 1)}</div>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}{isMe && <span style={{ marginLeft: 8, fontSize: 10, color: "#1E88E5" }}>YOU</span>}
                </div>
                <div style={{ fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>{r.role.replace("_", " ")} · Lv {r.level}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#1E88E5", fontFamily: "'Space Grotesk', sans-serif" }}>{formatXP(r.score)}</div>
                <div style={{ fontSize: 10, color: "#8892A4" }}>{tab === "attendance" ? "day streak" : tab === "contributors" ? "reputation" : "XP"}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
