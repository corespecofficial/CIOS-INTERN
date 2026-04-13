"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { upsertReminder, completeReminder, snoozeReminder, deleteReminder } from "@/app/actions/productivity-plus";

interface Reminder {
  id: string; title: string; notes: string | null; due_at: string;
  priority: "low" | "normal" | "high" | "urgent";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  done_at: string | null; snoozed_until: string | null;
  source: string;
}

const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", normal: "#1E88E5", high: "#FFC107", urgent: "#EF5350" };

type View = "upcoming" | "today" | "overdue" | "done";

export function RemindersClient({ initial }: { initial: Array<Record<string, unknown>> }) {
  const [list, setList] = useState<Reminder[]>(initial as unknown as Reminder[]);
  const [editing, setEditing] = useState<Partial<Reminder> | null>(null);
  const [view, setView] = useState<View>("upcoming");
  const [pending, start] = useTransition();

  const now = Date.now();
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const filtered = list.filter((r) => {
    if (view === "done") return !!r.done_at;
    if (r.done_at) return false;
    const due = new Date(r.due_at).getTime();
    if (view === "overdue") return due < now;
    if (view === "today") return due <= endOfDay.getTime() && due >= now - 3600000;
    return due >= now;
  });

  const onSave = (d: Partial<Reminder>) => start(async () => {
    const res = await upsertReminder(d.id || null, {
      title: d.title || "",
      notes: d.notes || undefined,
      dueAt: d.due_at || new Date().toISOString(),
      priority: d.priority || "normal",
      recurrence: d.recurrence || "none",
    });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(d.id ? "Reminder updated" : "Reminder created");
    setEditing(null);
    const next = { ...d, id: res.data!.id } as Reminder;
    setList(d.id ? list.map((r) => r.id === d.id ? next : r) : [...list, next]);
  });

  const onComplete = (id: string) => start(async () => {
    const res = await completeReminder(id);
    if (res.ok) { setList(list.map((r) => r.id === id ? { ...r, done_at: new Date().toISOString() } : r)); toast.success("Done ✓"); }
    else toast.error(res.error);
  });

  const onSnooze = (id: string) => start(async () => {
    const res = await snoozeReminder(id, 15);
    if (res.ok) toast.success("Snoozed 15 min"); else toast.error(res.error);
  });

  const onDelete = (id: string) => start(async () => {
    const res = await deleteReminder(id);
    if (res.ok) { setList(list.filter((r) => r.id !== id)); toast.success("Deleted"); }
    else toast.error(res.error);
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>REMINDERS</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔔 Stay on top of everything</h1>
        </div>
        <button onClick={() => setEditing({ title: "", due_at: new Date(Date.now() + 3600000).toISOString(), priority: "normal", recurrence: "none" })} style={btnPrimary}>+ New reminder</button>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {([
          { k: "upcoming", label: "Upcoming" }, { k: "today", label: "Today" }, { k: "overdue", label: "Overdue" }, { k: "done", label: "Done" },
        ] as { k: View; label: string }[]).map((v) => (
          <button key={v.k} onClick={() => setView(v.k)} style={{
            flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: view === v.k ? "rgba(255,193,7,0.15)" : "transparent",
            color: view === v.k ? "#FFC107" : "#8892A4",
            border: "none",
          }}>{v.label} ({list.filter((r) => {
            if (v.k === "done") return !!r.done_at;
            if (r.done_at) return false;
            const d = new Date(r.due_at).getTime();
            if (v.k === "overdue") return d < now;
            if (v.k === "today") return d <= endOfDay.getTime() && d >= now - 3600000;
            return d >= now;
          }).length})</button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: "center", color: "#8892A4", fontSize: 13 }}>Nothing here.</div>}
        {filtered.map((r) => {
          const due = new Date(r.due_at);
          const overdue = due.getTime() < now && !r.done_at;
          return (
            <div key={r.id} style={{ background: "#111827", border: `1px solid ${overdue ? "rgba(239,83,80,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "flex-start", opacity: r.done_at ? 0.5 : 1 }}>
              <div style={{ width: 4, alignSelf: "stretch", background: PRIORITY_COLOR[r.priority] || "#8892A4", borderRadius: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", textDecoration: r.done_at ? "line-through" : "none" }}>{r.title}</div>
                {r.notes && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{r.notes}</div>}
                <div style={{ fontSize: 11, color: overdue ? "#EF5350" : "#8892A4", marginTop: 4 }}>
                  ⏰ {due.toLocaleString()}{r.recurrence !== "none" ? ` · repeats ${r.recurrence}` : ""}{r.source !== "manual" ? ` · from ${r.source}` : ""}
                </div>
              </div>
              {!r.done_at && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onComplete(r.id)} disabled={pending} style={btnSmallSuccess}>✓</button>
                  <button onClick={() => onSnooze(r.id)} disabled={pending} style={btnSmallGhost}>💤</button>
                  <button onClick={() => setEditing(r)} disabled={pending} style={btnSmallGhost}>✎</button>
                  <button onClick={() => onDelete(r.id)} disabled={pending} style={btnSmallDanger}>✕</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && <ReminderEditor draft={editing} onCancel={() => setEditing(null)} onSave={onSave} pending={pending} />}
    </div>
  );
}

function ReminderEditor({ draft, onCancel, onSave, pending }: { draft: Partial<Reminder>; onCancel: () => void; onSave: (d: Partial<Reminder>) => void; pending: boolean }) {
  const [d, setD] = useState(draft);
  const toLocal = (iso?: string) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: 440, maxWidth: "90vw" }}>
        <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 16px 0" }}>{d.id ? "Edit reminder" : "New reminder"}</h2>
        <label style={lblStyle}>Title</label>
        <input value={d.title || ""} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="What to remember" style={inputFull} />
        <label style={lblStyle}>Due</label>
        <input type="datetime-local" value={toLocal(d.due_at)} onChange={(e) => setD({ ...d, due_at: new Date(e.target.value).toISOString() })} style={inputFull} />
        <label style={lblStyle}>Priority</label>
        <select value={d.priority || "normal"} onChange={(e) => setD({ ...d, priority: e.target.value as Reminder["priority"] })} style={inputFull}>
          <option value="low">Low</option><option value="normal">Normal</option>
          <option value="high">High</option><option value="urgent">Urgent</option>
        </select>
        <label style={lblStyle}>Repeat</label>
        <select value={d.recurrence || "none"} onChange={(e) => setD({ ...d, recurrence: e.target.value as Reminder["recurrence"] })} style={inputFull}>
          <option value="none">Never</option><option value="daily">Daily</option>
          <option value="weekly">Weekly</option><option value="monthly">Monthly</option>
        </select>
        <label style={lblStyle}>Notes</label>
        <textarea value={d.notes || ""} onChange={(e) => setD({ ...d, notes: e.target.value })} rows={3} style={{ ...inputFull, fontFamily: "inherit", resize: "vertical" }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(d)} disabled={pending || !d.title} style={btnPrimary}>{pending ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "10px 22px", background: "linear-gradient(135deg, #FFC107, #FFA000)", color: "#1A1A1A", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 18px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSmallSuccess: React.CSSProperties = { padding: "6px 10px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 6, fontSize: 13, cursor: "pointer" };
const btnSmallGhost: React.CSSProperties = { padding: "6px 10px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 12, cursor: "pointer" };
const btnSmallDanger: React.CSSProperties = { padding: "6px 10px", background: "rgba(239,83,80,0.15)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 6, fontSize: 12, cursor: "pointer" };
const inputFull: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, marginBottom: 10, boxSizing: "border-box" };
const lblStyle: React.CSSProperties = { fontSize: 11, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginTop: 8, marginBottom: 4 };
