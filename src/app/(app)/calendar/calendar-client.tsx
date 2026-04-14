"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createEvent, deleteEvent } from "@/app/actions/calendar-events";

export type CalEventType = "class" | "deadline" | "meeting" | "event" | "payment";

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  type: CalEventType;
  location: string;
}

const TYPE_META: Record<CalEventType, { color: string; label: string }> = {
  class:    { color: "#1E88E5", label: "Class" },
  deadline: { color: "#FFC107", label: "Deadline" },
  meeting:  { color: "#AB47BC", label: "Meeting" },
  event:    { color: "#22C55E", label: "Event" },
  payment:  { color: "#EF5350", label: "Payment" },
};
const VIEWS = ["Day", "Week", "Month"] as const;
const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#1E88E5", "#AB47BC", "#FF7043", "#66BB6A", "#FFC107", "#26C6DA", "#EF5350"];

function dayKey(d: Date) { return d.toISOString().slice(0, 10); }

export default function CalendarClient({ events }: { events: CalEvent[] }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Month");
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(dayKey(today));
  const [creating, setCreating] = useState<{ date: string; title: string; startTime: string; endTime: string; type: string; color: string } | null>(null);
  const [localExtra, setLocalExtra] = useState<CalEvent[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const todayKey = dayKey(today);
  const allEvents = useMemo(
    () => [...events, ...localExtra].filter((e) => !deletedIds.has(e.id)),
    [events, localExtra, deletedIds],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of allEvents) {
      const k = new Date(e.date).toISOString().slice(0, 10);
      (map.get(k) || map.set(k, []).get(k)!).push(e);
    }
    return map;
  }, [allEvents]);

  const days: Date[] = useMemo(() => {
    const first = new Date(month);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    const end = new Date(last); end.setDate(last.getDate() + (6 - last.getDay()));
    const out: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(new Date(d));
    return out;
  }, [month]);

  const selectedDayEvents = (byDay.get(selected) || []).sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = useMemo(
    () => allEvents.filter((e) => new Date(e.date).getTime() >= Date.now() - 3600000)
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8),
    [allEvents],
  );

  const onCreate = () => start(async () => {
    if (!creating || !creating.title.trim()) return;
    const startISO = new Date(`${creating.date}T${creating.startTime}`).toISOString();
    const endISO = new Date(`${creating.date}T${creating.endTime}`).toISOString();
    const res = await createEvent({
      title: creating.title, startTime: startISO, endTime: endISO,
      type: creating.type as "event" | "class" | "deadline" | "meeting" | "reminder",
      color: creating.color,
    });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Event created");
    setLocalExtra((prev) => [...prev, {
      id: `ev-${res.data!.id}`, title: creating.title, date: startISO,
      type: (creating.type as CalEventType) || "event",
      location: "",
    }]);
    setCreating(null);
  });

  const onDelete = (id: string) => start(async () => {
    if (!id.startsWith("ev-")) { toast.error("This event is synced from another source — delete it there."); return; }
    const realId = id.replace(/^ev-/, "");
    const res = await deleteEvent(realId);
    if (!res.ok) { toast.error(res.error); return; }
    setDeletedIds((prev) => new Set(prev).add(id));
    toast.success("Deleted");
  });

  return (
    <div className="cios-cal-root" style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        /* Calendar mobile optimisation — prevents outside-the-frame overflow. */
        @media (max-width: 768px) {
          .cios-cal-root h1 { font-size: 20px !important; }
          .cios-cal-root .cios-cal-subhead { display: none; }
          .cios-cal-root .cios-cal-views { flex-wrap: wrap; }
          .cios-cal-root .cios-cal-views button { padding: 6px 10px !important; font-size: 11px !important; }
          .cios-cal-root .cios-cal-panel { padding: 10px !important; border-radius: 12px !important; }
          /* Force the 7-col grid to exactly viewport width, each cell ultra-compact */
          .cios-cal-root .cios-cal-grid { gap: 2px !important; }
          .cios-cal-root .cios-cal-cell { min-height: 64px !important; padding: 4px !important; border-radius: 6px !important; }
          .cios-cal-root .cios-cal-cell .cios-cal-ev { font-size: 9px !important; padding: 2px 4px !important; }
          .cios-cal-root .cios-cal-headers div { font-size: 9px !important; padding: 3px 0 !important; }
          .cios-cal-root .cios-cal-nav h2 { font-size: 15px !important; min-width: 0 !important; }
          /* Day + Week timelines become shorter rows */
          .cios-cal-root .cios-cal-timeline-row { min-height: 44px !important; }
          .cios-cal-root .cios-cal-timeline-row > div:first-child { font-size: 9px !important; padding: 3px 4px !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>CALENDAR</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🗓️ Your unified schedule</h1>
          <p className="cios-cal-subhead" style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Plans · classes · deadlines · reminders — all in one place</p>
        </div>
        <div className="cios-cal-views" style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4 }}>
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: view === v ? "rgba(30,136,229,0.18)" : "transparent",
              color: view === v ? "#1E88E5" : "#8892A4",
              border: "none",
            }}>{v}</button>
          ))}
        </div>
      </div>

      {/* Nav bar — adapts label to active view */}
      <div className="cios-cal-panel" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18 }}>
        <div className="cios-cal-nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navPrev(view, selected, month, setSelected, setMonth)} style={btnNav}>‹</button>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: 0, minWidth: 220, textAlign: "center" }}>
              {navLabel(view, selected, month)}
            </h2>
            <button onClick={() => navNext(view, selected, month, setSelected, setMonth)} style={btnNav}>›</button>
            <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelected(dayKey(d)); }} style={btnGhost}>Today</button>
          </div>
          <button onClick={() => setCreating({ date: selected, title: "", startTime: "09:00", endTime: "10:00", type: "event", color: "#1E88E5" })} style={btnPrimary}>+ New event</button>
        </div>

        {view === "Day" && (
          <DayView selectedKey={selected} events={selectedDayEvents} onCreateAt={(time) => setCreating({ date: selected, title: "", startTime: time, endTime: addHour(time), type: "event", color: "#1E88E5" })} />
        )}
        {view === "Week" && (
          <WeekView selected={selected} byDay={byDay} onSelectDay={setSelected} onCreateAt={(date, time) => setCreating({ date, title: "", startTime: time, endTime: addHour(time), type: "event", color: "#1E88E5" })} />
        )}
        {view === "Month" && <>

        {/* Weekday header */}
        <div className="cios-cal-headers" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
          {DAY_HEADERS.map((d) => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", padding: "6px 0" }}>{d}</div>
          ))}
        </div>

        {/* Month grid */}
        <div className="cios-cal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
          {days.map((d) => {
            const k = dayKey(d);
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = k === todayKey;
            const isSelected = selected === k;
            const evs = byDay.get(k) || [];
            return (
              <button key={k} className="cios-cal-cell" onClick={() => setSelected(k)} onDoubleClick={() => setCreating({ date: k, title: "", startTime: "09:00", endTime: "10:00", type: "event", color: "#1E88E5" })}
                style={{
                  minHeight: 104, padding: 8, textAlign: "left", cursor: "pointer",
                  background: isSelected ? "rgba(30,136,229,0.12)" : isToday ? "rgba(30,136,229,0.06)" : "#0A0E1A",
                  border: `1px solid ${isSelected ? "#1E88E5" : isToday ? "rgba(30,136,229,0.3)" : "rgba(255,255,255,0.04)"}`,
                  borderRadius: 10, color: inMonth ? "#E8EDF5" : "#5A6478",
                  display: "flex", flexDirection: "column", gap: 4,
                  transition: "background 0.15s, border-color 0.15s, transform 0.15s",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{
                    fontSize: 13, fontWeight: isToday ? 800 : 500,
                    width: isToday ? 26 : "auto", height: isToday ? 26 : "auto",
                    borderRadius: isToday ? "50%" : 0,
                    background: isToday ? "#1E88E5" : "transparent",
                    color: isToday ? "#fff" : inMonth ? "#E8EDF5" : "#5A6478",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{d.getDate()}</span>
                  {evs.length > 0 && <span style={{ fontSize: 9, color: "#8892A4" }}>{evs.length}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0 }}>
                  {evs.slice(0, 3).map((e) => (
                    <div key={e.id} className="cios-cal-ev" title={e.title} style={{
                      fontSize: 10, padding: "3px 6px", borderRadius: 4, color: "#fff", fontWeight: 600,
                      background: `${TYPE_META[e.type].color}CC`,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{e.title}</div>
                  ))}
                  {evs.length > 3 && <div style={{ fontSize: 9, color: "#8892A4" }}>+{evs.length - 3} more</div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
          {(Object.keys(TYPE_META) as CalEventType[]).map((k) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_META[k].color }} />
              <span style={{ fontSize: 11, color: "#8892A4" }}>{TYPE_META[k].label}</span>
            </div>
          ))}
        </div>
        </>}
      </div>

      {/* Selected day detail */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>
            {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <span style={{ fontSize: 11, color: "#8892A4" }}>{selectedDayEvents.length} {selectedDayEvents.length === 1 ? "event" : "events"}</span>
        </div>
        {selectedDayEvents.length === 0 && (
          <div style={{ padding: "28px 10px", textAlign: "center", color: "#5A6478", fontSize: 13 }}>
            Nothing scheduled. Double-click any day on the grid to quickly create an event.
          </div>
        )}
        {selectedDayEvents.map((ev) => {
          const meta = TYPE_META[ev.type];
          const d = new Date(ev.date);
          const canDelete = ev.id.startsWith("ev-");
          return (
            <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 4, alignSelf: "stretch", background: meta.color, borderRadius: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 600 }}>{ev.title}</div>
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
                  ⏰ {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  {ev.location && ` · 📍 ${ev.location}`}
                </div>
              </div>
              <span style={{ fontSize: 9, padding: "3px 10px", borderRadius: 99, background: `${meta.color}22`, color: meta.color, fontWeight: 700, textTransform: "uppercase" }}>{meta.label}</span>
              {canDelete && <button onClick={() => onDelete(ev.id)} disabled={pending} style={btnTinyDanger}>✕</button>}
            </div>
          );
        })}
      </div>

      {/* Upcoming */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 18, marginTop: 16 }}>
        <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 12px 0", fontWeight: 800 }}>📅 Upcoming</h2>
        {upcoming.length === 0 && <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Nothing upcoming.</p>}
        <div style={{ display: "grid", gap: 8 }}>
          {upcoming.map((ev) => {
            const meta = TYPE_META[ev.type];
            const d = new Date(ev.date);
            return (
              <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: meta.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{ev.title}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: `${meta.color}22`, color: meta.color, fontWeight: 700, textTransform: "uppercase" }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 3 }}>
                    {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    {ev.location && ` · ${ev.location}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {creating && (
        <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && setCreating(null)}>
          <div style={modalPanel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0 }}>New event · {new Date(creating.date).toLocaleDateString()}</h2>
              <button onClick={() => setCreating(null)} style={btnClose}>✕</button>
            </div>
            <label style={lbl}>Title</label>
            <input value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value })} placeholder="e.g. AI class" autoFocus style={{ ...input, width: "100%", marginBottom: 10 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div><label style={lbl}>Start</label><input type="time" value={creating.startTime} onChange={(e) => setCreating({ ...creating, startTime: e.target.value })} style={{ ...input, width: "100%" }} /></div>
              <div><label style={lbl}>End</label><input type="time" value={creating.endTime} onChange={(e) => setCreating({ ...creating, endTime: e.target.value })} style={{ ...input, width: "100%" }} /></div>
            </div>
            <label style={lbl}>Type</label>
            <select value={creating.type} onChange={(e) => setCreating({ ...creating, type: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }}>
              <option value="event">Event</option><option value="class">Class</option>
              <option value="deadline">Deadline</option><option value="meeting">Meeting</option>
              <option value="reminder">Reminder</option>
            </select>
            <label style={lbl}>Color</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setCreating({ ...creating, color: c })} style={{
                  width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer",
                  border: creating.color === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.1)",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setCreating(null)} style={btnGhost}>Cancel</button>
              <button onClick={onCreate} disabled={pending || !creating.title.trim()} style={btnPrimary}>{pending ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07:00 → 21:00
function pad(n: number) { return n.toString().padStart(2, "0"); }
function addHour(t: string) { const [h, m] = t.split(":").map(Number); return `${pad((h + 1) % 24)}:${pad(m)}`; }

function navLabel(view: "Day" | "Week" | "Month", selected: string, month: Date) {
  if (view === "Day") return new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  if (view === "Week") {
    const d = new Date(selected);
    const start = new Date(d); start.setDate(d.getDate() - d.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function navPrev(view: string, selected: string, month: Date, setSelected: (s: string) => void, setMonth: (d: Date) => void) {
  if (view === "Day") { const d = new Date(selected); d.setDate(d.getDate() - 1); setSelected(d.toISOString().slice(0, 10)); return; }
  if (view === "Week") { const d = new Date(selected); d.setDate(d.getDate() - 7); setSelected(d.toISOString().slice(0, 10)); return; }
  setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
}
function navNext(view: string, selected: string, month: Date, setSelected: (s: string) => void, setMonth: (d: Date) => void) {
  if (view === "Day") { const d = new Date(selected); d.setDate(d.getDate() + 1); setSelected(d.toISOString().slice(0, 10)); return; }
  if (view === "Week") { const d = new Date(selected); d.setDate(d.getDate() + 7); setSelected(d.toISOString().slice(0, 10)); return; }
  setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
}

function DayView({ selectedKey, events, onCreateAt }: { selectedKey: string; events: CalEvent[]; onCreateAt: (time: string) => void }) {
  const byHour = new Map<number, CalEvent[]>();
  for (const e of events) {
    const h = new Date(e.date).getHours();
    (byHour.get(h) || byHour.set(h, []).get(h)!).push(e);
  }
  const nowH = new Date().getHours();
  const isToday = selectedKey === new Date().toISOString().slice(0, 10);
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
      {HOURS.map((h) => {
        const evs = byHour.get(h) || [];
        const isNow = isToday && h === nowH;
        return (
          <div key={h} className="cios-cal-timeline-row" onDoubleClick={() => onCreateAt(`${pad(h)}:00`)} style={{ display: "grid", gridTemplateColumns: "70px 1fr", borderTop: "1px solid rgba(255,255,255,0.04)", minHeight: 56, background: isNow ? "rgba(30,136,229,0.06)" : "transparent", cursor: "pointer" }}>
            <div style={{ padding: "6px 10px", fontSize: 11, color: "#8892A4", borderRight: "1px solid rgba(255,255,255,0.05)", textAlign: "right" }}>{pad(h)}:00</div>
            <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {evs.map((e) => (
                <div key={e.id} style={{ padding: "6px 10px", borderRadius: 6, background: `${TYPE_META[e.type].color}22`, borderLeft: `3px solid ${TYPE_META[e.type].color}`, fontSize: 12, color: "#E8EDF5" }}>
                  <strong>{new Date(e.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</strong> · {e.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({ selected, byDay, onSelectDay, onCreateAt }: { selected: string; byDay: Map<string, CalEvent[]>; onSelectDay: (k: string) => void; onCreateAt: (date: string, time: string) => void }) {
  const d = new Date(selected);
  const start = new Date(d); start.setDate(d.getDate() - d.getDay());
  const days = Array.from({ length: 7 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x; });
  const todayKey = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", background: "#0A0E1A", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div />
        {days.map((dd) => {
          const k = dd.toISOString().slice(0, 10);
          const isToday = k === todayKey;
          const isSel = k === selected;
          return (
            <button key={k} onClick={() => onSelectDay(k)} style={{ padding: "8px 4px", textAlign: "center", background: isSel ? "rgba(30,136,229,0.15)" : "transparent", border: "none", cursor: "pointer", borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 10, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1 }}>{dd.toLocaleDateString(undefined, { weekday: "short" })}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: isToday ? "#1E88E5" : "#E8EDF5", marginTop: 2 }}>{dd.getDate()}</div>
            </button>
          );
        })}
      </div>
      {HOURS.map((h) => (
        <div key={h} className="cios-cal-timeline-row" style={{ display: "grid", gridTemplateColumns: "60px repeat(7, 1fr)", borderTop: "1px solid rgba(255,255,255,0.04)", minHeight: 50 }}>
          <div style={{ padding: "4px 8px", fontSize: 10, color: "#8892A4", borderRight: "1px solid rgba(255,255,255,0.05)", textAlign: "right" }}>{pad(h)}:00</div>
          {days.map((dd) => {
            const k = dd.toISOString().slice(0, 10);
            const evs = (byDay.get(k) || []).filter((e) => new Date(e.date).getHours() === h);
            return (
              <div key={k + h} onDoubleClick={() => onCreateAt(k, `${pad(h)}:00`)} style={{ padding: 3, borderLeft: "1px solid rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 2, cursor: "pointer" }}>
                {evs.map((e) => (
                  <div key={e.id} title={e.title} style={{ padding: "3px 6px", borderRadius: 4, background: `${TYPE_META[e.type].color}33`, borderLeft: `2px solid ${TYPE_META[e.type].color}`, fontSize: 10, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "8px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnNav: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.08)", fontSize: 20, cursor: "pointer" };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" };
const btnTinyDanger: React.CSSProperties = { padding: "4px 10px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const input: React.CSSProperties = { padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 6 };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 440, maxWidth: "96vw" };
