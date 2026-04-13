"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { upsertAlarm, toggleAlarm, deleteAlarm, logFocusSession } from "@/app/actions/productivity-plus";

type Tab = "alarm" | "clock" | "stopwatch" | "timer";
interface Alarm { id: string; label: string; time_of_day: string; days_of_week: number[]; sound: string; volume: number; snooze_minutes: number; vibrate: boolean; gradual_wake: boolean; active: boolean }

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function AlarmsClient({ initialAlarms }: { initialAlarms: Array<Record<string, unknown>> }) {
  const [tab, setTab] = useState<Tab>("alarm");
  const [alarms, setAlarms] = useState<Alarm[]>(initialAlarms as unknown as Alarm[]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>CLOCK & ALARMS</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>⏰ Your command clock</h1>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {([
          { k: "alarm", label: "Alarms", emoji: "⏰" },
          { k: "clock", label: "Clock", emoji: "🕐" },
          { k: "stopwatch", label: "Stopwatch", emoji: "⏱" },
          { k: "timer", label: "Timer", emoji: "⏳" },
        ] as { k: Tab; label: string; emoji: string }[]).map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(30,136,229,0.15)" : "transparent",
            color: tab === t.k ? "#1E88E5" : "#8892A4",
            border: "none",
          }}>{t.emoji} {t.label}</button>
        ))}
      </div>

      {tab === "alarm" && <AlarmTab alarms={alarms} setAlarms={setAlarms} />}
      {tab === "clock" && <ClockTab />}
      {tab === "stopwatch" && <StopwatchTab />}
      {tab === "timer" && <TimerTab />}
    </div>
  );
}

/* ─── ALARM TAB ─── */

function AlarmTab({ alarms, setAlarms }: { alarms: Alarm[]; setAlarms: (a: Alarm[]) => void }) {
  const [editing, setEditing] = useState<Partial<Alarm> | null>(null);
  const [pending, start] = useTransition();

  const onSave = (draft: Partial<Alarm>) => start(async () => {
    const res = await upsertAlarm(draft.id || null, {
      label: draft.label || "",
      timeOfDay: draft.time_of_day || "07:00",
      daysOfWeek: draft.days_of_week || [],
      sound: draft.sound || "chime",
      volume: draft.volume ?? 80,
      snoozeMinutes: draft.snooze_minutes ?? 5,
      vibrate: draft.vibrate ?? true,
      gradualWake: draft.gradual_wake ?? false,
      active: draft.active ?? true,
    });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(draft.id ? "Alarm updated" : "Alarm created");
    setEditing(null);
    // Optimistic: refetch would be nicer, but we update locally
    const next: Alarm = { ...draft, id: res.data!.id } as Alarm;
    setAlarms(draft.id ? alarms.map((a) => a.id === draft.id ? next : a) : [...alarms, next]);
  });

  const onToggle = (a: Alarm) => start(async () => {
    const res = await toggleAlarm(a.id, !a.active);
    if (res.ok) setAlarms(alarms.map((x) => x.id === a.id ? { ...x, active: !a.active } : x));
    else toast.error(res.error);
  });

  const onDelete = (id: string) => start(async () => {
    const res = await deleteAlarm(id);
    if (res.ok) { setAlarms(alarms.filter((a) => a.id !== id)); toast.success("Deleted"); }
    else toast.error(res.error);
  });

  return (
    <div>
      <button onClick={() => setEditing({ label: "", time_of_day: "07:00", days_of_week: [], sound: "chime", volume: 80, snooze_minutes: 5, vibrate: true, gradual_wake: false, active: true })} style={btnPrimary}>+ New alarm</button>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        {alarms.length === 0 && <Empty text="No alarms yet. Tap + to create your first." />}
        {alarms.map((a) => (
          <div key={a.id} style={{ background: "#111827", border: `1px solid ${a.active ? "rgba(30,136,229,0.25)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 14, opacity: a.active ? 1 : 0.55 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 300, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>{a.time_of_day?.slice(0, 5)}</div>
              <div style={{ fontSize: 13, color: "#8892A4" }}>{a.label || "(no label)"}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {DAYS.map((d, i) => (
                  <span key={i} style={{
                    width: 20, height: 20, borderRadius: "50%", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center",
                    background: (a.days_of_week || []).includes(i) ? "#1E88E5" : "rgba(255,255,255,0.06)",
                    color: (a.days_of_week || []).includes(i) ? "#fff" : "#5A6478",
                  }}>{d}</span>
                ))}
                {(a.days_of_week || []).length === 0 && <span style={{ fontSize: 10, color: "#8892A4", marginLeft: 4 }}>Once</span>}
              </div>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
              <input type="checkbox" checked={a.active} onChange={() => onToggle(a)} disabled={pending} style={{ display: "none" }} />
              <span style={{ position: "absolute", inset: 0, background: a.active ? "#1E88E5" : "rgba(255,255,255,0.12)", borderRadius: 99, transition: "background 0.2s" }} />
              <span style={{ position: "absolute", top: 2, left: a.active ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
            </label>
            <button onClick={() => setEditing(a)} style={btnGhost}>Edit</button>
            <button onClick={() => onDelete(a.id)} style={btnDanger}>✕</button>
          </div>
        ))}
      </div>

      {editing && <AlarmEditor draft={editing} onCancel={() => setEditing(null)} onSave={onSave} pending={pending} />}
    </div>
  );
}

function AlarmEditor({ draft, onCancel, onSave, pending }: { draft: Partial<Alarm>; onCancel: () => void; onSave: (d: Partial<Alarm>) => void; pending: boolean }) {
  const [d, setD] = useState(draft);
  const toggleDay = (i: number) => {
    const arr = new Set(d.days_of_week || []);
    if (arr.has(i)) arr.delete(i); else arr.add(i);
    setD({ ...d, days_of_week: Array.from(arr).sort() });
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: 420, maxWidth: "90vw" }}>
        <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 16px 0" }}>{d.id ? "Edit alarm" : "New alarm"}</h2>
        <label style={lblStyle}>Time</label>
        <input type="time" value={d.time_of_day?.slice(0, 5) || "07:00"} onChange={(e) => setD({ ...d, time_of_day: e.target.value })} style={inputFull} />
        <label style={lblStyle}>Label</label>
        <input value={d.label || ""} onChange={(e) => setD({ ...d, label: e.target.value })} placeholder="e.g. Morning class" style={inputFull} />
        <label style={lblStyle}>Repeat</label>
        <div style={{ display: "flex", gap: 6 }}>
          {DAYS.map((day, i) => (
            <button key={i} onClick={() => toggleDay(i)} style={{
              width: 36, height: 36, borderRadius: "50%", fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: (d.days_of_week || []).includes(i) ? "#1E88E5" : "rgba(255,255,255,0.06)",
              color: (d.days_of_week || []).includes(i) ? "#fff" : "#8892A4",
              border: "none",
            }}>{day}</button>
          ))}
        </div>
        <label style={lblStyle}>Sound</label>
        <select value={d.sound || "chime"} onChange={(e) => setD({ ...d, sound: e.target.value })} style={inputFull}>
          <option value="chime">Chime</option><option value="bell">Bell</option>
          <option value="digital">Digital</option><option value="gentle">Gentle</option>
        </select>
        <label style={lblStyle}>Snooze (minutes)</label>
        <input type="number" min={1} max={30} value={d.snooze_minutes ?? 5} onChange={(e) => setD({ ...d, snooze_minutes: parseInt(e.target.value) || 5 })} style={inputFull} />
        <label style={{ ...lblStyle, display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={d.vibrate ?? true} onChange={(e) => setD({ ...d, vibrate: e.target.checked })} /> Vibrate
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8892A4", marginTop: 8 }}>
          <input type="checkbox" checked={d.gradual_wake ?? false} onChange={(e) => setD({ ...d, gradual_wake: e.target.checked })} /> Gradual wake (rising volume)
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(d)} disabled={pending} style={btnPrimary}>{pending ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CLOCK TAB ─── */

function ClockTab() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const hDeg = (h % 12 + m / 60) * 30;
  const mDeg = (m + s / 60) * 6;
  const sDeg = s * 6;
  const world = [
    { city: "Lagos",    offset: 1 },
    { city: "London",   offset: 0 },
    { city: "New York", offset: -5 },
    { city: "Tokyo",    offset: 9 },
  ];
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #0A0E1A, #111827)", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 20, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 80, fontWeight: 300, color: "#E8EDF5", fontFamily: "'Space Grotesk', monospace", letterSpacing: 4, lineHeight: 1, textShadow: "0 0 40px rgba(30,136,229,0.3)" }}>
          {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
        </div>
        <div style={{ fontSize: 14, color: "#8892A4", marginTop: 8 }}>
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>

        <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="104" stroke="rgba(255,255,255,0.08)" strokeWidth="2" fill="#0A0E1A" />
            {[...Array(12)].map((_, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              return <line key={i} x1={110 + Math.cos(a) * 92} y1={110 + Math.sin(a) * 92} x2={110 + Math.cos(a) * 100} y2={110 + Math.sin(a) * 100} stroke="#8892A4" strokeWidth="2" />;
            })}
            <line x1="110" y1="110" x2={110 + Math.cos((hDeg - 90) * Math.PI / 180) * 55} y2={110 + Math.sin((hDeg - 90) * Math.PI / 180) * 55} stroke="#E8EDF5" strokeWidth="4" strokeLinecap="round" />
            <line x1="110" y1="110" x2={110 + Math.cos((mDeg - 90) * Math.PI / 180) * 80} y2={110 + Math.sin((mDeg - 90) * Math.PI / 180) * 80} stroke="#E8EDF5" strokeWidth="3" strokeLinecap="round" />
            <line x1="110" y1="110" x2={110 + Math.cos((sDeg - 90) * Math.PI / 180) * 90} y2={110 + Math.sin((sDeg - 90) * Math.PI / 180) * 90} stroke="#1E88E5" strokeWidth="2" strokeLinecap="round" />
            <circle cx="110" cy="110" r="5" fill="#1E88E5" />
          </svg>
        </div>
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 10px 0" }}>🌍 World clock</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {world.map((w) => {
          const local = new Date(now.getTime() + (w.offset - (-now.getTimezoneOffset() / 60)) * 3600 * 1000);
          return (
            <div key={w.city} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{w.city}</div>
              <div style={{ fontSize: 22, fontWeight: 300, color: "#E8EDF5", fontFamily: "'Space Grotesk', monospace" }}>{local.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── STOPWATCH TAB ─── */

function StopwatchTab() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  useEffect(() => {
    if (!running) return;
    const start = Date.now() - ms;
    const i = setInterval(() => setMs(Date.now() - start), 40);
    return () => clearInterval(i);
  }, [running]); // eslint-disable-line

  const fmt = (n: number) => {
    const cs = Math.floor((n % 1000) / 10);
    const s = Math.floor(n / 1000) % 60;
    const m = Math.floor(n / 60000) % 60;
    const h = Math.floor(n / 3600000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "#111827", borderRadius: 20, padding: 40, border: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 54, fontFamily: "'Space Grotesk', monospace", color: "#E8EDF5", fontWeight: 300, letterSpacing: 3 }}>{fmt(ms)}</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <button onClick={() => setRunning(!running)} style={running ? btnDanger : btnPrimary}>{running ? "⏸ Pause" : "▶ Start"}</button>
          <button onClick={() => { if (running) setLaps([ms, ...laps]); else { setMs(0); setLaps([]); } }} style={btnGhost}>{running ? "Lap" : "Reset"}</button>
        </div>
      </div>
      {laps.length > 0 && (
        <div style={{ marginTop: 16, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
          {laps.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontFamily: "'Space Grotesk', monospace", fontSize: 13 }}>
              <span style={{ color: "#8892A4" }}>Lap {laps.length - i}</span>
              <span style={{ color: "#E8EDF5" }}>{fmt(l)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TIMER / POMODORO TAB ─── */

function TimerTab() {
  const PRESETS = [
    { label: "Pomodoro 25", secs: 25 * 60, kind: "pomodoro" as const },
    { label: "Short break 5", secs: 5 * 60, kind: "break" as const },
    { label: "Long break 15", secs: 15 * 60, kind: "break" as const },
    { label: "Deep work 50", secs: 50 * 60, kind: "pomodoro" as const },
  ];
  const [secs, setSecs] = useState(25 * 60);
  const [initial, setInitial] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [kind, setKind] = useState<"pomodoro" | "break" | "custom">("pomodoro");
  const [label, setLabel] = useState("Focus session");
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
    logFocusSession({ kind, plannedSeconds: initial, actualSeconds: initial, label, completed: true }).then((r) => {
      if (r.ok) toast.success(`🍅 ${kind === "pomodoro" ? "Pomodoro" : "Session"} complete${r.data?.xp ? ` · +${r.data.xp} XP` : ""}`);
      if ("Notification" in window && Notification.permission === "granted") new Notification("⏰ Timer done", { body: label });
    });
  }, [finished]); // eslint-disable-line

  const pct = initial > 0 ? (secs / initial) * 100 : 0;
  const fmt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  const R = 80, C = 2 * Math.PI * R;

  return (
    <div>
      <div style={{ background: "#111827", borderRadius: 20, padding: 30, border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
        <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto" }}>
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ display: "block" }}>
            <circle cx="110" cy="110" r={R} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
            <circle cx="110" cy="110" r={R} stroke="#1E88E5" strokeWidth="10" fill="none" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} transform="rotate(-90 110 110)" style={{ transition: "stroke-dashoffset 0.9s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 44, fontFamily: "'Space Grotesk', monospace", color: "#E8EDF5", fontWeight: 300, lineHeight: 1 }}>{fmt(secs)}</div>
            <div style={{ fontSize: 11, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", marginTop: 6 }}>{kind}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>
          <button onClick={() => setRunning(!running)} style={running ? btnDanger : btnPrimary}>{running ? "⏸ Pause" : "▶ Start"}</button>
          <button onClick={() => { setRunning(false); setSecs(initial); }} style={btnGhost}>Reset</button>
        </div>
      </div>

      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "20px 0 10px 0" }}>Presets</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => { setSecs(p.secs); setInitial(p.secs); setKind(p.kind); setLabel(p.label); setRunning(false); }} style={{
            padding: 14, borderRadius: 12, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", color: "#E8EDF5", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <div>{p.label}</div>
            <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{Math.round(p.secs / 60)} min</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 14, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
        <label style={lblStyle}>Custom label</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} style={inputFull} />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div style={{ padding: 24, textAlign: "center", color: "#8892A4", fontSize: 13 }}>{text}</div>; }

const btnPrimary: React.CSSProperties = { padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 18px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "10px 18px", background: "rgba(239,83,80,0.15)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const inputFull: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, marginBottom: 10, boxSizing: "border-box" };
const lblStyle: React.CSSProperties = { fontSize: 11, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginTop: 8, marginBottom: 4 };
