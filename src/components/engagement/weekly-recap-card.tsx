"use client";

import { useEffect, useState } from "react";
import { getMyWeeklyRecap, type WeeklyRecap } from "@/app/actions/weekly-recap";

const DISMISS_KEY = "cios-weekly-recap-dismissed";

/**
 * Shows a one-line recap of the last 7 days on the dashboard. Appears
 * Sunday–Tuesday so the user sees a Monday-morning summary. Dismissible
 * for the week; auto-reappears next Sunday.
 */
export function WeeklyRecapCard() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only render Sun/Mon/Tue (days 0,1,2).
    const day = new Date().getDay();
    if (day > 2) return;
    // Respect a weekly dismissal
    try {
      const v = localStorage.getItem(DISMISS_KEY);
      const isoWeek = `${new Date().getFullYear()}-W${getISOWeek(new Date())}`;
      if (v === isoWeek) { setDismissed(true); return; }
    } catch { /* ignore */ }
    getMyWeeklyRecap().then((r) => { if (r.ok) setRecap(r.data); });
  }, []);

  if (dismissed || !recap) return null;
  if (recap.tasksDone === 0 && recap.lessonsCompleted === 0 && recap.xpEarned === 0 && recap.postsMade === 0) return null;

  const rankDeltaText = recap.rankDelta == null ? null :
    recap.rankDelta > 0 ? `↑${recap.rankDelta}` :
    recap.rankDelta < 0 ? `↓${Math.abs(recap.rankDelta)}` : "—";
  const rankDeltaColor = (recap.rankDelta || 0) > 0 ? "#66BB6A" : (recap.rankDelta || 0) < 0 ? "#EF5350" : "#8892A4";

  function dismiss() {
    try {
      const iso = `${new Date().getFullYear()}-W${getISOWeek(new Date())}`;
      localStorage.setItem(DISMISS_KEY, iso);
    } catch { /* ignore */ }
    setDismissed(true);
  }

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(135deg, rgba(171,71,188,0.16), rgba(30,136,229,0.08))",
      border: "1px solid rgba(171,71,188,0.3)",
      borderRadius: 14, padding: 16, marginBottom: 16,
    }}>
      <button onClick={dismiss} aria-label="Dismiss" style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", color: "#8892A4", cursor: "pointer", fontSize: 16 }}>✕</button>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 24 }}>📊</div>
        <div>
          <div style={{ fontSize: 10, color: "#AB47BC", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Your week in review</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginTop: 2 }}>
            The last 7 days — here&apos;s what you accomplished
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <Stat icon="✅" label="Tasks done" value={recap.tasksDone} />
        <Stat icon="🎓" label="Lessons" value={recap.lessonsCompleted} />
        <Stat icon="⚡" label="XP earned" value={`+${recap.xpEarned}`} color="#FFC107" />
        <Stat icon="💬" label="Comments" value={recap.commentsMade} />
        <Stat icon="📝" label="Posts" value={recap.postsMade} />
        {recap.rankNow != null && (
          <Stat icon="📈" label={`Rank ${rankDeltaText ?? ""}`} value={`#${recap.rankNow}`} color={rankDeltaColor} />
        )}
      </div>
      {recap.topTag && (
        <div style={{ fontSize: 12, color: "#B0BEC5", marginTop: 10 }}>
          You&apos;ve been exploring <b style={{ color: "#1E88E5" }}>#{recap.topTag}</b> — keep the momentum.
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color = "#E8EDF5" }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: "rgba(10,14,26,0.6)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, padding: "8px 10px" }}>
      <div style={{ fontSize: 9, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{icon} {label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function getISOWeek(d: Date): number {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  copy.setUTCDate(copy.getUTCDate() + 4 - (copy.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
