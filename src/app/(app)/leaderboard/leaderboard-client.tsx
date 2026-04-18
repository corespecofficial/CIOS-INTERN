"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { formatXP } from "@/lib/gamification-shared";
import type { FaithfulRow } from "@/app/actions/honor-faithful";

interface Row { id: string; name: string; avatarUrl: string | null; role: string; xp: number; level: number; streak: number; reputation: number; score: number; rank: number }

const TABS: { key: string; label: string; emoji: string }[] = [
  { key: "xp",           label: "Global XP",    emoji: "🌐" },
  { key: "weekly",       label: "This week",    emoji: "📅" },
  { key: "monthly",      label: "This month",   emoji: "📆" },
  { key: "contributors", label: "Contributors", emoji: "💬" },
  { key: "attendance",   label: "Attendance",   emoji: "🔥" },
  { key: "faithful",     label: "Faithful",     emoji: "🦅" },
];

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  diamond: { label: "Diamond", color: "#82B1FF", bg: "rgba(130,177,255,0.12)", icon: "💎" },
  gold:    { label: "Gold",    color: "#FFC107", bg: "rgba(255,193,7,0.12)",   icon: "🏅" },
  silver:  { label: "Silver",  color: "#B0BEC5", bg: "rgba(176,190,197,0.12)", icon: "🥈" },
  bronze:  { label: "Bronze",  color: "#FF8A65", bg: "rgba(255,138,101,0.12)", icon: "🏆" },
  none:    { label: "",        color: "#5A6478", bg: "transparent",             icon: ""   },
};

export function LeaderboardClient({
  meId,
  boards,
  faithfulRows = [],
}: {
  meId: string;
  boards: Record<string, Row[]>;
  faithfulRows?: FaithfulRow[];
}) {
  const [tab, setTab] = useState<string>("xp");
  const rows = boards[tab] || [];
  const isFaithful = tab === "faithful";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>LEADERBOARD</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Who&rsquo;s climbing the ranks</h1>
        <p style={{ margin: "4px 0 0", color: "#5A6478", fontSize: 12 }}>Top 20 performers. Keep showing up.</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16, overflowX: "auto" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.key ? "rgba(171,71,188,0.15)" : "transparent",
            color: tab === t.key ? "#AB47BC" : "#8892A4",
            border: "none", whiteSpace: "nowrap", flexShrink: 0,
          }}>{t.emoji} {t.label}</button>
        ))}
      </div>

      {/* Faithful tab */}
      {isFaithful && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,193,7,0.04)" }}>
            <div style={{ color: "#FFC107", fontSize: 13, fontWeight: 700 }}>🦅 Faithfulness Board</div>
            <div style={{ color: "#5A6478", fontSize: 11, marginTop: 2 }}>Ranked by consistency: on-time task completion over 30 days. 💎 ≥ 96% · 🏅 ≥ 88% · 🥈 ≥ 75% · 🏆 ≥ 60%</div>
          </div>
          {faithfulRows.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "#8892A4" }}>Scores update weekly. Check back Monday.</div>
          )}
          {faithfulRows.map((r) => {
            const isMe = r.id === meId;
            const tierCfg = TIER_CONFIG[r.faithfulnessTier] ?? TIER_CONFIG.none;
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
                  : <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #FFC107, #FF8A65)", color: "#0A0E1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{r.name.slice(0, 1)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {r.name}
                    {isMe && <span style={{ fontSize: 10, color: "#1E88E5" }}>YOU</span>}
                    {r.streak >= 7 && <span title={`${r.streak}-day streak`} style={{ fontSize: 14 }}>🔥</span>}
                    {tierCfg.icon && (
                      <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 10, background: tierCfg.bg, color: tierCfg.color, fontWeight: 700 }}>
                        {tierCfg.icon} {tierCfg.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8892A4", textTransform: "capitalize" }}>
                    {r.role.replace("_", " ")} · {r.streak > 0 ? `${r.streak}d streak` : "no streak"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#FFC107" }}>{r.faithfulnessScore.toFixed(0)}%</div>
                  <div style={{ fontSize: 10, color: "#8892A4" }}>faithful</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standard XP/streak tabs */}
      {!isFaithful && (
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {r.name}
                    {isMe && <span style={{ fontSize: 10, color: "#1E88E5" }}>YOU</span>}
                    {tab === "attendance" && r.streak >= 7 && <span title={`${r.streak}-day streak`}>🔥</span>}
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
      )}
    </div>
  );
}
