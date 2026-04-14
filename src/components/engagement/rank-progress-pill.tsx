"use client";

import Link from "next/link";
import { levelProgress, rankFromLevel, RANKS, formatXP } from "@/lib/gamification-shared";

/** Compact rank progress bar. Drop anywhere you know the user's total XP. */
export function RankProgressPill({ xp }: { xp: number }) {
  const p = levelProgress(xp);
  const currentRank = rankFromLevel(p.level);
  const nextRankIdx = RANKS.findIndex((r) => r.minLevel > p.level);
  const nextRank = nextRankIdx >= 0 ? RANKS[nextRankIdx] : null;

  return (
    <Link href="/gamification" style={{ textDecoration: "none", display: "block" }}>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>{currentRank.emoji}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: currentRank.color }}>{currentRank.title}</div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 1 }}>Level {p.level} · {formatXP(xp)} XP</div>
            </div>
          </div>
          {nextRank && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#8892A4" }}>Next</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: nextRank.color }}>{nextRank.emoji} {nextRank.title}</div>
            </div>
          )}
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${p.progressPct}%`, background: `linear-gradient(90deg, ${currentRank.color}, ${nextRank?.color || currentRank.color})`, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 10, color: "#8892A4", marginTop: 4, textAlign: "right" }}>
          {p.xpToNext} XP to level {p.nextLevel}
        </div>
      </div>
    </Link>
  );
}
