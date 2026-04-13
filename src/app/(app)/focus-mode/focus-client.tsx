"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { logFocusSession } from "@/app/actions/productivity-plus";

interface Session { kind: string; planned_seconds: number; actual_seconds: number; label: string | null; completed: boolean; started_at: string }

const MODES = [
  { key: "focus" as const, label: "Focus", emoji: "🎯", secs: 25 * 60, color: "#1E88E5" },
  { key: "short_break" as const, label: "Short break", emoji: "☕", secs: 5 * 60, color: "#66BB6A" },
  { key: "long_break" as const, label: "Long break", emoji: "🌿", secs: 15 * 60, color: "#26C6DA" },
  { key: "deep_work" as const, label: "Deep work", emoji: "🧠", secs: 50 * 60, color: "#AB47BC" },
];

export function FocusClient({ recent, weekPomodoros, weekMinutes }: { recent: Array<Record<string, unknown>>; weekPomodoros: number; weekMinutes: number }) {
  const [mode, setMode] = useState<typeof MODES[number]>(MODES[0]);
  const [secs, setSecs] = useState(MODES[0].secs);
  const [initial, setInitial] = useState(MODES[0].secs);
  const [running, setRunning] = useState(false);
  const [label, setLabel] = useState("");
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => setSecs((s) => {
      if (s <= 1) { setRunning(false); setFinished(true); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(i);
  }, [running]);

  useEffect(() => {
    if (!finished) return;
    setFinished(false);
    const kind = mode.key === "short_break" || mode.key === "long_break" ? "break" : "pomodoro";
    logFocusSession({ kind, plannedSeconds: initial, actualSeconds: initial, label: label || mode.label, completed: true }).then((r) => {
      if (r.ok) toast.success(`✅ ${mode.label} done${r.data?.xp ? ` · +${r.data.xp} XP` : ""}`);
      if ("Notification" in window && Notification.permission === "granted") new Notification("✨ Focus session complete", { body: `${mode.label} finished · ${initial / 60} min` });
      // Audio beep
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.frequency.value = 660; osc.connect(gain); gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.start(); osc.stop(ctx.currentTime + 0.8);
      } catch {/* ignore */}
    });
  }, [finished]); // eslint-disable-line

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }, []);

  const pct = initial > 0 ? (secs / initial) * 100 : 0;
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const R = 110, C = 2 * Math.PI * R;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: `${mode.color}22`, color: mode.color, fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>FOCUS MODE</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🎯 Deep work timer</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ background: `linear-gradient(135deg, ${mode.color}18, #111827)`, border: `1px solid ${mode.color}33`, borderRadius: 20, padding: 30, textAlign: "center" }}>
          <div style={{ position: "relative", width: 280, height: 280, margin: "0 auto" }}>
            <svg width="280" height="280" viewBox="0 0 280 280" style={{ display: "block" }}>
              <circle cx="140" cy="140" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="12" fill="none" />
              <circle cx="140" cy="140" r={R} stroke={mode.color} strokeWidth="12" fill="none" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} transform="rotate(-90 140 140)" style={{ transition: "stroke-dashoffset 0.9s linear", filter: `drop-shadow(0 0 14px ${mode.color}55)` }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 56, fontFamily: "'Space Grotesk', monospace", color: "#E8EDF5", fontWeight: 300, letterSpacing: 3, lineHeight: 1 }}>{fmt(secs)}</div>
              <div style={{ fontSize: 12, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginTop: 8 }}>{mode.emoji} {mode.label}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
            <button onClick={() => setRunning(!running)} style={{ padding: "12px 32px", background: running ? "rgba(239,83,80,0.15)" : `linear-gradient(135deg, ${mode.color}, ${mode.color}DD)`, color: running ? "#EF5350" : "#fff", border: running ? "1px solid rgba(239,83,80,0.3)" : "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {running ? "⏸ Pause" : "▶ Start"}
            </button>
            <button onClick={() => { setRunning(false); setSecs(initial); }} style={btnGhost}>Reset</button>
          </div>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What are you focusing on?" style={{ marginTop: 20, width: "100%", maxWidth: 320, padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", color: "#E8EDF5", borderRadius: 10, fontSize: 13, textAlign: "center", boxSizing: "border-box" }} />
        </div>

        <div>
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <h3 style={sectionHeader}>This week</h3>
            <div style={{ display: "flex", gap: 16 }}>
              <div><div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Pomodoros</div><div style={{ fontSize: 28, fontWeight: 800, color: "#1E88E5", fontFamily: "'Space Grotesk', sans-serif" }}>{weekPomodoros}</div></div>
              <div><div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>Minutes</div><div style={{ fontSize: 28, fontWeight: 800, color: "#AB47BC", fontFamily: "'Space Grotesk', sans-serif" }}>{weekMinutes}</div></div>
            </div>
          </div>

          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
            <h3 style={sectionHeader}>Modes</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {MODES.map((m) => (
                <button key={m.key} onClick={() => { setMode(m); setSecs(m.secs); setInitial(m.secs); setRunning(false); }} style={{
                  padding: "10px 12px", borderRadius: 10, border: `1px solid ${mode.key === m.key ? m.color : "rgba(255,255,255,0.08)"}`,
                  background: mode.key === m.key ? `${m.color}22` : "transparent", color: "#E8EDF5", cursor: "pointer", textAlign: "left", fontSize: 13,
                }}>
                  {m.emoji} <strong>{m.label}</strong> <span style={{ color: "#8892A4", float: "right", fontSize: 11 }}>{m.secs / 60} min</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16, marginTop: 16 }}>
        <h3 style={sectionHeader}>📜 Recent sessions</h3>
        {recent.length === 0 && <div style={{ color: "#8892A4", fontSize: 12 }}>No sessions yet. Start your first!</div>}
        {(recent as unknown as Session[]).map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 12 }}>
            <div>
              <div style={{ color: "#E8EDF5", fontWeight: 600 }}>{s.label || s.kind} {s.completed ? "✓" : "⏳"}</div>
              <div style={{ color: "#8892A4", fontSize: 10 }}>{new Date(s.started_at).toLocaleString()}</div>
            </div>
            <div style={{ color: "#1E88E5", fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>{Math.round((s.actual_seconds || 0) / 60)}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = { padding: "12px 24px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
