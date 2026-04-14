"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { getBossCooldown, getBossLeaderboard, submitBossAttempt, type BossAttempt } from "@/app/actions/boss-quiz";
import type { CourseModuleRow } from "@/lib/db";

/**
 * Wraps a boss-quiz module. Shows a dramatic intro, countdown timer, and a
 * weekly leaderboard. The inner children (existing QuizRunner) handle the
 * actual question flow; this component reports the result via
 * `onResult(score, durationSec, passed)` when it fires the `boss-quiz-result`
 * custom window event.
 */
export function BossQuizFrame({ module: m, children }: { module: CourseModuleRow; children: React.ReactNode }) {
  const [cooldown, setCooldown] = useState<{ ready: boolean; secondsLeft: number; lastScore: number | null } | null>(null);
  const [board, setBoard] = useState<BossAttempt[] | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    getBossCooldown(m.id).then((r) => { if (r.ok) setCooldown(r.data!); });
    getBossLeaderboard(m.id).then((r) => { if (r.ok) setBoard(r.data!); });
  }, [m.id]);

  // Timer tick
  useEffect(() => {
    if (!startedAt || !m.time_limit_sec || m.time_limit_sec <= 0) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = (m.time_limit_sec || 0) - elapsed;
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        window.dispatchEvent(new CustomEvent("boss-quiz-timeout"));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt, m.time_limit_sec]);

  // Listen for result event from the wrapped quiz
  useEffect(() => {
    const handler = async (e: Event) => {
      const d = (e as CustomEvent).detail as { score: number; passed: boolean } | undefined;
      if (!d || !startedAt) return;
      const duration = Math.floor((Date.now() - startedAt) / 1000);
      const r = await submitBossAttempt(m.id, d.score, duration, d.passed);
      if (r.ok && r.data!.xp > 0) {
        window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: r.data!.xp, label: "Boss quiz!" } }));
      }
      // Refresh leaderboard
      getBossLeaderboard(m.id).then((lb) => { if (lb.ok) setBoard(lb.data!); });
    };
    window.addEventListener("quiz-submitted", handler);
    return () => window.removeEventListener("quiz-submitted", handler);
  }, [m.id, startedAt]);

  const start = () => setStartedAt(Date.now());

  if (!cooldown) return null;

  // Cooldown active — show wait screen + leaderboard.
  if (!cooldown.ready) {
    const mins = Math.ceil(cooldown.secondsLeft / 60);
    return (
      <div>
        <BossBanner module={m} />
        <div style={{ background: "rgba(239,83,80,0.08)", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>⏳</div>
          <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700 }}>Cooldown · retry in ~{mins} minute{mins === 1 ? "" : "s"}</div>
          {cooldown.lastScore != null && (
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>Your last attempt: {cooldown.lastScore}%</div>
          )}
        </div>
        <Leaderboard rows={board} />
      </div>
    );
  }

  // Not started yet — show start screen
  if (!startedAt) {
    return (
      <div>
        <BossBanner module={m} />
        <div style={{ background: "#111827", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 14, padding: 20, marginBottom: 14, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚔️</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#FFC107", marginBottom: 6 }}>Boss quiz — you ready?</div>
          <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>
            {m.time_limit_sec && m.time_limit_sec > 0 ? `${Math.floor(m.time_limit_sec / 60)} min time limit · ` : ""}
            Pass threshold {m.pass_score}%{m.bonus_xp > 0 ? ` · +${m.bonus_xp} bonus XP` : ""}
          </div>
          <button onClick={start} style={{ padding: "12px 28px", background: "linear-gradient(135deg,#FFC107,#FF7043)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Start the fight →
          </button>
        </div>
        <Leaderboard rows={board} />
      </div>
    );
  }

  // In-progress — show timer + children
  return (
    <div>
      <BossBanner module={m} />
      {timeLeft != null && (
        <div style={{ position: "sticky", top: 10, zIndex: 5, background: timeLeft < 30 ? "rgba(239,83,80,0.9)" : "rgba(30,136,229,0.9)", color: "#fff", padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>
          ⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")} remaining
        </div>
      )}
      {children}
    </div>
  );
}

function BossBanner({ module: m }: { module: CourseModuleRow }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#7B1FA2 0%,#EF5350 100%)", borderRadius: 12, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 28 }}>👹</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>BOSS QUIZ</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{m.title}</div>
      </div>
    </div>
  );
}

function Leaderboard({ rows }: { rows: BossAttempt[] | null }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18, textAlign: "center", fontSize: 12, color: "#8892A4" }}>
        🏆 Be the first to top the leaderboard.
      </div>
    );
  }
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#FFC107", marginBottom: 10 }}>🏆 Weekly top scorers</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.slice(0, 5).map((r) => (
          <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", background: r.rank === 1 ? "rgba(255,193,7,0.08)" : "#0A0E1A", borderRadius: 8 }}>
            <div style={{ width: 20, textAlign: "center", fontSize: 12, fontWeight: 800, color: r.rank <= 3 ? "#FFC107" : "#8892A4" }}>
              {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
            </div>
            {r.avatar_url ? (
              <img src={r.avatar_url} alt="" width={22} height={22} style={{ borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 9, fontWeight: 800 }}>
                {(r.name || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#E8EDF5", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name || "Anon"}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#FFC107" }}>{r.score}%</div>
            <div style={{ fontSize: 10, color: "#8892A4" }}>{Math.floor(r.duration_sec / 60)}:{String(r.duration_sec % 60).padStart(2, "0")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
