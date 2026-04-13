"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import toast from "react-hot-toast";
import {
  createPlan, updatePlan, deletePlan, reorderPlans,
  addItem, toggleItem, updateItemContent, deleteItem, reorderItems,
  addComment, getPlanDetail,
} from "@/app/actions/planner";
import { listMyEvents, createEvent, deleteEvent } from "@/app/actions/calendar-events";

type Priority = "low" | "normal" | "high" | "urgent";
type Status = "not_started" | "in_progress" | "waiting" | "completed" | "cancelled";
type Visibility = "private" | "team" | "public";

interface Plan {
  id: string; title: string; description: string; category: string;
  priority: Priority; status: Status; due_at: string | null;
  estimate_minutes: number | null; tags: string[]; visibility: Visibility;
  color: string; icon: string; sort_order: number;
  completed_at: string | null; created_at: string;
}
interface PlanItem { id: string; plan_id: string; content: string; done: boolean; sort_order: number }
interface PlanComment { id: string; body: string; created_at: string; users: { name: string; avatar_url: string | null } | null }
interface PlanActivity { id: string; kind: string; detail: string | null; created_at: string; users: { name: string } | null }

const PRIORITY_META: Record<Priority, { color: string; label: string }> = {
  urgent: { color: "#EF5350", label: "Urgent" },
  high:   { color: "#FF7043", label: "High" },
  normal: { color: "#1E88E5", label: "Normal" },
  low:    { color: "#8892A4", label: "Low" },
};
const STATUS_META: Record<Status, { color: string; label: string; emoji: string }> = {
  not_started: { color: "#8892A4", label: "Not started", emoji: "⚪" },
  in_progress: { color: "#1E88E5", label: "In progress", emoji: "🔵" },
  waiting:     { color: "#FFC107", label: "Waiting",     emoji: "🟡" },
  completed:   { color: "#66BB6A", label: "Completed",   emoji: "✅" },
  cancelled:   { color: "#8892A4", label: "Cancelled",   emoji: "⛔" },
};
const ICONS = ["📋", "🚀", "💡", "🎯", "📚", "💼", "🎨", "🏆", "⚡", "🔥", "🧠", "🌱"];
const COLORS = ["#1E88E5", "#AB47BC", "#FF7043", "#66BB6A", "#FFC107", "#26C6DA", "#EF5350", "#8892A4"];

type FilterView = "all" | "today" | "week" | "upcoming" | "done" | "priority";
type PlannerTab = "plans" | "calendar" | "timeline" | "analytics" | "completed";

export function PlannerClient({
  initialPlans, initialItemsByPlan,
}: {
  initialPlans: Array<Record<string, unknown>>;
  initialItemsByPlan: Record<string, Array<Record<string, unknown>>>;
}) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans as unknown as Plan[]);
  const [itemsByPlan, setItemsByPlan] = useState<Record<string, PlanItem[]>>(initialItemsByPlan as unknown as Record<string, PlanItem[]>);
  const [tab, setTab] = useState<PlannerTab>("plans");
  const [filter, setFilter] = useState<FilterView>("all");
  const [search, setSearch] = useState("");
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay); endOfDay.setDate(endOfDay.getDate() + 1);
    const endOfWeek = new Date(startOfDay); endOfWeek.setDate(endOfWeek.getDate() + 7);
    const q = search.trim().toLowerCase();

    return plans.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q) && !(p.tags || []).some((t) => t.toLowerCase().includes(q))) return false;
      if (filter === "done") return p.status === "completed";
      if (filter === "priority") return (p.priority === "high" || p.priority === "urgent") && p.status !== "completed";
      if (p.status === "completed") return false;
      if (filter === "today") {
        if (!p.due_at) return false;
        const d = new Date(p.due_at);
        return d >= startOfDay && d < endOfDay;
      }
      if (filter === "week") {
        if (!p.due_at) return false;
        const d = new Date(p.due_at);
        return d >= startOfDay && d < endOfWeek;
      }
      if (filter === "upcoming") return !p.due_at || new Date(p.due_at) >= startOfDay;
      return true;
    });
  }, [plans, filter, search]);

  const stats = useMemo(() => {
    const total = plans.length;
    const done = plans.filter((p) => p.status === "completed").length;
    const active = plans.filter((p) => p.status === "in_progress").length;
    const overdue = plans.filter((p) => p.status !== "completed" && p.due_at && new Date(p.due_at) < new Date()).length;
    return { total, done, active, overdue, rate: total ? Math.round((done / total) * 100) : 0 };
  }, [plans]);

  /* ─── CRUD handlers ─── */

  const handleSave = (d: Partial<Plan>) => start(async () => {
    if (d.id) {
      const res = await updatePlan(d.id, {
        title: d.title, description: d.description, category: d.category,
        priority: d.priority, status: d.status, dueAt: d.due_at,
        estimateMinutes: d.estimate_minutes, tags: d.tags, visibility: d.visibility,
        color: d.color, icon: d.icon,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setPlans(plans.map((p) => p.id === d.id ? { ...p, ...d } as Plan : p));
      toast.success("Plan updated");
    } else {
      const res = await createPlan({
        title: d.title || "",
        description: d.description, category: d.category,
        priority: d.priority, status: d.status, dueAt: d.due_at,
        estimateMinutes: d.estimate_minutes, tags: d.tags, visibility: d.visibility,
        color: d.color, icon: d.icon,
      });
      if (!res.ok) { toast.error(res.error); return; }
      const newP: Plan = {
        id: res.data!.id, title: d.title || "", description: d.description || "",
        category: d.category || "general", priority: d.priority || "normal",
        status: d.status || "not_started", due_at: d.due_at || null,
        estimate_minutes: d.estimate_minutes || null, tags: d.tags || [],
        visibility: d.visibility || "private", color: d.color || "#1E88E5",
        icon: d.icon || "📋", sort_order: plans.length + 1,
        completed_at: null, created_at: new Date().toISOString(),
      };
      setPlans([...plans, newP]);
      toast.success("Plan created");
    }
    setEditingPlan(null);
  });

  const handleDelete = (id: string) => start(async () => {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    const res = await deletePlan(id);
    if (!res.ok) { toast.error(res.error); return; }
    setPlans(plans.filter((p) => p.id !== id));
    setOpenPlanId(null);
    toast.success("Deleted");
  });

  const handleQuickStatus = (id: string, status: Status) => start(async () => {
    const res = await updatePlan(id, { status });
    if (!res.ok) { toast.error(res.error); return; }
    setPlans(plans.map((p) => p.id === id ? { ...p, status, completed_at: status === "completed" ? new Date().toISOString() : null } : p));
    if (status === "completed") toast.success("Completed ✓");
  });

  /* ─── Drag plans ─── */

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ordered = [...filtered];
    const from = ordered.findIndex((p) => p.id === dragId);
    const to = ordered.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    // Apply back to full list (preserve non-filtered order)
    const orderedIds = ordered.map((p) => p.id);
    const rest = plans.filter((p) => !orderedIds.includes(p.id));
    const full = [...ordered, ...rest];
    setPlans(full);
    setDragId(null);
    start(async () => { await reorderPlans(full.map((p) => p.id)); });
  };

  /* ─── Items ─── */

  const onItemToggle = (planId: string, itemId: string) => {
    const item = (itemsByPlan[planId] || []).find((i) => i.id === itemId);
    if (!item) return;
    const next = !item.done;
    setItemsByPlan({ ...itemsByPlan, [planId]: (itemsByPlan[planId] || []).map((i) => i.id === itemId ? { ...i, done: next } : i) });
    start(async () => {
      const res = await toggleItem(itemId, next);
      if (!res.ok) toast.error(res.error);
    });
  };

  const onItemAdd = (planId: string, content: string) => {
    if (!content.trim()) return;
    start(async () => {
      const res = await addItem(planId, content);
      if (!res.ok) { toast.error(res.error); return; }
      const tmp: PlanItem = { id: res.data!.id, plan_id: planId, content: content.trim(), done: false, sort_order: (itemsByPlan[planId] || []).length + 1 };
      setItemsByPlan({ ...itemsByPlan, [planId]: [...(itemsByPlan[planId] || []), tmp] });
    });
  };

  const onItemDelete = (planId: string, itemId: string) => start(async () => {
    const res = await deleteItem(itemId);
    if (!res.ok) { toast.error(res.error); return; }
    setItemsByPlan({ ...itemsByPlan, [planId]: (itemsByPlan[planId] || []).filter((i) => i.id !== itemId) });
  });

  const onItemEdit = (planId: string, itemId: string, content: string) => start(async () => {
    const res = await updateItemContent(itemId, content);
    if (!res.ok) { toast.error(res.error); return; }
    setItemsByPlan({ ...itemsByPlan, [planId]: (itemsByPlan[planId] || []).map((i) => i.id === itemId ? { ...i, content } : i) });
  });

  const openPlan = openPlanId ? plans.find((p) => p.id === openPlanId) : null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>PLANNER</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📋 Your smart planning workspace</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Organize work · tick progress · drag to reorder</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/planner/today" style={btnGhost}>📆 Today</Link>
          <button onClick={() => setEditingPlan({})} style={btnPrimary}>+ New plan</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16, overflowX: "auto" }}>
        {([
          { k: "plans", label: "📋 Plans" },
          { k: "calendar", label: "🗓️ Calendar" },
          { k: "timeline", label: "📈 Timeline" },
          { k: "analytics", label: "📊 Analytics" },
          { k: "completed", label: "✅ Completed" },
        ] as { k: PlannerTab; label: string }[]).map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(171,71,188,0.15)" : "transparent",
            color: tab === t.k ? "#AB47BC" : "#8892A4",
            border: "none", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Stat label="Total"       value={stats.total}    color="#8892A4" />
        <Stat label="In progress" value={stats.active}   color="#1E88E5" />
        <Stat label="Overdue"     value={stats.overdue}  color="#EF5350" />
        <Stat label="Completed"   value={stats.done}     color="#66BB6A" />
        <Stat label="Completion"  value={`${stats.rate}%`} color="#AB47BC" />
      </div>

      {tab === "plans" && <>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search plans…" style={{ ...input, flex: 1, minWidth: 200 }} />
        <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4 }}>
          {([
            { k: "all", label: "All" },
            { k: "today", label: "Today" },
            { k: "week", label: "This week" },
            { k: "priority", label: "Priority" },
            { k: "done", label: "Done" },
          ] as { k: FilterView; label: string }[]).map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} style={{
              padding: "7px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: filter === f.k ? "rgba(171,71,188,0.15)" : "transparent",
              color: filter === f.k ? "#AB47BC" : "#8892A4",
              border: "none",
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Plan list */}
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
            {plans.length === 0 ? "No plans yet. Tap + New plan to create your first." : "Nothing matches this filter."}
          </div>
        )}
        {filtered.map((p, idx) => {
          const items = itemsByPlan[p.id] || [];
          const done = items.filter((i) => i.done).length;
          const pct = items.length > 0 ? Math.round((done / items.length) * 100) : (p.status === "completed" ? 100 : 0);
          const overdue = p.due_at && new Date(p.due_at) < new Date() && p.status !== "completed";
          return (
            <div key={p.id}
              draggable
              onDragStart={() => onDragStart(p.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(p.id)}
              style={{
                background: "#111827",
                border: `1px solid ${dragId === p.id ? p.color : "rgba(255,255,255,0.07)"}`,
                borderLeft: `4px solid ${p.color}`,
                borderRadius: 14, padding: 14,
                opacity: p.status === "completed" ? 0.7 : 1,
                cursor: "grab",
              }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ color: "#5A6478", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", minWidth: 24 }}>{idx + 1}</div>
                <div style={{ fontSize: 26 }}>{p.icon}</div>
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setOpenPlanId(p.id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", textDecoration: p.status === "completed" ? "line-through" : "none" }}>{p.title}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: `${PRIORITY_META[p.priority].color}22`, color: PRIORITY_META[p.priority].color, textTransform: "uppercase" }}>{PRIORITY_META[p.priority].label}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: `${STATUS_META[p.status].color}22`, color: STATUS_META[p.status].color, textTransform: "uppercase" }}>{STATUS_META[p.status].emoji} {STATUS_META[p.status].label}</span>
                    {p.tags && p.tags.map((t) => <span key={t} style={{ fontSize: 10, color: "#8892A4", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 6 }}>#{t}</span>)}
                  </div>
                  {p.description && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.description}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    <div style={{ flex: 1, maxWidth: 300 }}>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: p.color, transition: "width 0.35s" }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: "#8892A4" }}>{done}/{items.length} · {pct}%</span>
                    {p.due_at && <span style={{ fontSize: 11, color: overdue ? "#EF5350" : "#8892A4" }}>⏰ {new Date(p.due_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {p.status !== "completed" && <button onClick={() => handleQuickStatus(p.id, "completed")} style={btnTinySuccess} title="Mark complete">✓</button>}
                  {p.status === "completed" && <button onClick={() => handleQuickStatus(p.id, "in_progress")} style={btnTinyGhost} title="Reopen">↻</button>}
                  <button onClick={() => setOpenPlanId(p.id)} style={btnTinyGhost}>↗</button>
                </div>
              </div>

              {/* Inline checklist (first 5 items) */}
              {items.length > 0 && (
                <div style={{ marginTop: 12, paddingLeft: 40 }}>
                  {items.slice(0, 5).map((it, i) => (
                    <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                      <input type="checkbox" checked={it.done} onChange={() => onItemToggle(p.id, it.id)} style={{ cursor: "pointer" }} />
                      <span style={{ fontSize: 10, color: "#5A6478", minWidth: 22, fontFamily: "'Space Grotesk', sans-serif" }}>{idx + 1}.{i + 1}</span>
                      <span style={{ fontSize: 13, color: it.done ? "#5A6478" : "#E8EDF5", textDecoration: it.done ? "line-through" : "none", flex: 1 }}>{it.content}</span>
                    </div>
                  ))}
                  {items.length > 5 && <div style={{ fontSize: 11, color: "#8892A4", paddingTop: 4 }}>+{items.length - 5} more · click to expand</div>}
                </div>
              )}

              {items.length === 0 && (
                <div style={{ marginTop: 10, paddingLeft: 40 }}>
                  <QuickAddItem onAdd={(v) => onItemAdd(p.id, v)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>}

      {tab === "calendar" && <CalendarTab plans={plans} />}
      {tab === "timeline" && <TimelineTab plans={plans} />}
      {tab === "analytics" && <AnalyticsTab plans={plans} itemsByPlan={itemsByPlan} />}
      {tab === "completed" && <CompletedTab plans={plans.filter((p) => p.status === "completed")} />}

      {editingPlan && <PlanEditor draft={editingPlan} onCancel={() => setEditingPlan(null)} onSave={handleSave} pending={pending} />}
      {openPlan && (
        <PlanDetail
          plan={openPlan}
          items={itemsByPlan[openPlan.id] || []}
          onClose={() => setOpenPlanId(null)}
          onEdit={() => { setEditingPlan(openPlan); setOpenPlanId(null); }}
          onDelete={() => handleDelete(openPlan.id)}
          onStatus={(s) => handleQuickStatus(openPlan.id, s)}
          onItemToggle={(id) => onItemToggle(openPlan.id, id)}
          onItemAdd={(c) => onItemAdd(openPlan.id, c)}
          onItemDelete={(id) => onItemDelete(openPlan.id, id)}
          onItemEdit={(id, v) => onItemEdit(openPlan.id, id, v)}
        />
      )}
    </div>
  );
}

/* ─── Quick-add inline input ─── */
function QuickAddItem({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onAdd(v); setV(""); } }}
        placeholder="+ Add step (press Enter)" style={{ ...input, flex: 1, fontSize: 12 }} />
    </div>
  );
}

/* ─── Plan editor modal ─── */
function PlanEditor({ draft, onCancel, onSave, pending }: { draft: Partial<Plan>; onCancel: () => void; onSave: (d: Partial<Plan>) => void; pending: boolean }) {
  const [d, setD] = useState<Partial<Plan>>(draft);
  const toLocal = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : "";

  return (
    <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={{ ...modalPanel, width: 560, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0 }}>{d.id ? "Edit plan" : "New plan"}</h2>
          <button onClick={onCancel} style={btnClose}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={lbl}>Icon</label>
            <select value={d.icon || "📋"} onChange={(e) => setD({ ...d, icon: e.target.value })} style={{ ...input, width: 70, fontSize: 18 }}>
              {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Title</label>
            <input value={d.title || ""} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Launch social campaign" style={{ ...input, width: "100%" }} />
          </div>
        </div>
        <label style={lbl}>Description</label>
        <textarea value={d.description || ""} onChange={(e) => setD({ ...d, description: e.target.value })} rows={3} placeholder="What does success look like?" style={{ ...input, width: "100%", fontFamily: "inherit", resize: "vertical", marginBottom: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={lbl}>Priority</label>
            <select value={d.priority || "normal"} onChange={(e) => setD({ ...d, priority: e.target.value as Priority })} style={{ ...input, width: "100%" }}>
              <option value="low">Low</option><option value="normal">Normal</option>
              <option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Status</label>
            <select value={d.status || "not_started"} onChange={(e) => setD({ ...d, status: e.target.value as Status })} style={{ ...input, width: "100%" }}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="waiting">Waiting</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Due date</label>
            <input type="datetime-local" value={toLocal(d.due_at)} onChange={(e) => setD({ ...d, due_at: e.target.value ? new Date(e.target.value).toISOString() : null })} style={{ ...input, width: "100%" }} />
          </div>
          <div>
            <label style={lbl}>Estimate (min)</label>
            <input type="number" value={d.estimate_minutes || ""} onChange={(e) => setD({ ...d, estimate_minutes: parseInt(e.target.value) || null })} style={{ ...input, width: "100%" }} />
          </div>
          <div>
            <label style={lbl}>Category</label>
            <input value={d.category || ""} onChange={(e) => setD({ ...d, category: e.target.value })} placeholder="general" style={{ ...input, width: "100%" }} />
          </div>
          <div>
            <label style={lbl}>Visibility</label>
            <select value={d.visibility || "private"} onChange={(e) => setD({ ...d, visibility: e.target.value as Visibility })} style={{ ...input, width: "100%" }}>
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>
        <label style={lbl}>Tags (comma separated)</label>
        <input value={(d.tags || []).join(", ")} onChange={(e) => setD({ ...d, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} placeholder="design, urgent, q2" style={{ ...input, width: "100%", marginBottom: 10 }} />
        <label style={lbl}>Theme color</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setD({ ...d, color: c })} style={{
              width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
              border: (d.color || "#1E88E5") === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.1)",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(d)} disabled={pending || !d.title} style={btnPrimary}>{pending ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Plan detail modal (side panel on desktop) ─── */
function PlanDetail({
  plan, items, onClose, onEdit, onDelete, onStatus,
  onItemToggle, onItemAdd, onItemDelete, onItemEdit,
}: {
  plan: Plan; items: PlanItem[]; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
  onStatus: (s: Status) => void;
  onItemToggle: (id: string) => void;
  onItemAdd: (c: string) => void;
  onItemDelete: (id: string) => void;
  onItemEdit: (id: string, v: string) => void;
}) {
  const [comments, setComments] = useState<PlanComment[]>([]);
  const [activity, setActivity] = useState<PlanActivity[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    getPlanDetail(plan.id).then((res) => {
      if (res.ok) {
        setComments((res.data!.comments as unknown as PlanComment[]) || []);
        setActivity((res.data!.activity as unknown as PlanActivity[]) || []);
      }
    });
  }, [plan.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const pct = items.length > 0 ? Math.round(items.filter((i) => i.done).length / items.length * 100) : (plan.status === "completed" ? 100 : 0);

  const submitComment = () => start(async () => {
    if (!newComment.trim()) return;
    const res = await addComment(plan.id, newComment);
    if (!res.ok) { toast.error(res.error); return; }
    setComments([...comments, { id: res.data!.id, body: newComment, created_at: new Date().toISOString(), users: null }]);
    setNewComment("");
  });

  return (
    <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalPanel, width: 720, maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 40 }}>{plan.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 20, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>{plan.title}</h2>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${PRIORITY_META[plan.priority].color}22`, color: PRIORITY_META[plan.priority].color, textTransform: "uppercase" }}>{PRIORITY_META[plan.priority].label} priority</span>
              <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${STATUS_META[plan.status].color}22`, color: STATUS_META[plan.status].color, textTransform: "uppercase" }}>{STATUS_META[plan.status].emoji} {STATUS_META[plan.status].label}</span>
              {plan.tags && plan.tags.map((t) => <span key={t} style={{ fontSize: 10, color: "#8892A4", background: "rgba(255,255,255,0.05)", padding: "3px 8px", borderRadius: 99 }}>#{t}</span>)}
            </div>
          </div>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>

        {plan.description && <p style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.6, margin: "0 0 14px 0" }}>{plan.description}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          <DetailStat label="Progress"  value={`${pct}%`} />
          <DetailStat label="Steps"     value={`${items.filter((i) => i.done).length} / ${items.length}`} />
          <DetailStat label="Due"       value={plan.due_at ? new Date(plan.due_at).toLocaleDateString() : "—"} />
          <DetailStat label="Estimate"  value={plan.estimate_minutes ? `${plan.estimate_minutes}m` : "—"} />
        </div>

        <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: plan.color, transition: "width 0.4s" }} />
        </div>

        {/* Status quick actions */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {(Object.keys(STATUS_META) as Status[]).map((s) => (
            <button key={s} onClick={() => onStatus(s)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: plan.status === s ? `${STATUS_META[s].color}22` : "transparent",
              color: plan.status === s ? STATUS_META[s].color : "#8892A4",
              border: `1px solid ${plan.status === s ? STATUS_META[s].color : "rgba(255,255,255,0.1)"}`,
            }}>{STATUS_META[s].emoji} {STATUS_META[s].label}</button>
          ))}
        </div>

        {/* Checklist */}
        <h3 style={sectionHeader}>✅ Checklist</h3>
        <div style={{ marginBottom: 20 }}>
          {items.map((it, i) => (
            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <input type="checkbox" checked={it.done} onChange={() => onItemToggle(it.id)} style={{ cursor: "pointer", width: 16, height: 16 }} />
              <span style={{ fontSize: 10, color: "#5A6478", minWidth: 30, fontFamily: "'Space Grotesk', sans-serif" }}>{i + 1}.</span>
              {editing === it.id ? (
                <input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { onItemEdit(it.id, editText); setEditing(null); } if (e.key === "Escape") setEditing(null); }}
                  onBlur={() => { onItemEdit(it.id, editText); setEditing(null); }}
                  style={{ ...input, flex: 1, fontSize: 13 }} />
              ) : (
                <span onClick={() => { setEditing(it.id); setEditText(it.content); }}
                  style={{ fontSize: 14, flex: 1, color: it.done ? "#5A6478" : "#E8EDF5", textDecoration: it.done ? "line-through" : "none", cursor: "text" }}>
                  {it.content}
                </span>
              )}
              <button onClick={() => onItemDelete(it.id)} style={btnTinyDanger}>✕</button>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <QuickAddItem onAdd={onItemAdd} />
          </div>
        </div>

        {/* Comments */}
        <h3 style={sectionHeader}>💬 Comments</h3>
        <div style={{ marginBottom: 14 }}>
          {comments.length === 0 && <div style={{ fontSize: 12, color: "#8892A4" }}>No comments yet.</div>}
          {comments.map((c) => (
            <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 2 }}>{c.users?.name || "You"} · {new Date(c.created_at).toLocaleString()}</div>
              <div style={{ fontSize: 13, color: "#E8EDF5" }}>{c.body}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
              placeholder="Add a comment…" style={{ ...input, flex: 1 }} />
            <button onClick={submitComment} disabled={pending || !newComment.trim()} style={btnPrimary}>Send</button>
          </div>
        </div>

        {/* Activity */}
        <h3 style={sectionHeader}>📜 Activity</h3>
        <div style={{ marginBottom: 20 }}>
          {activity.length === 0 && <div style={{ fontSize: 12, color: "#8892A4" }}>No activity yet.</div>}
          {activity.map((a) => (
            <div key={a.id} style={{ fontSize: 12, color: "#8892A4", padding: "4px 0" }}>
              <span style={{ color: "#E8EDF5" }}>{a.users?.name || "Someone"}</span> {a.kind}{a.detail ? ` — ${a.detail}` : ""} · <span style={{ fontSize: 10 }}>{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14 }}>
          <button onClick={onDelete} style={btnDanger}>🗑 Delete</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnGhost}>Close</button>
            <button onClick={onEdit} style={btnPrimary}>✎ Edit plan</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CALENDAR TAB (month grid + events from global table) ─── */
interface CalEvent { id: string; title: string; start_time: string; end_time: string; type: string; color: string; location: string | null; created_by: string }

function CalendarTab({ plans }: { plans: Plan[] }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState<{ date: string; title: string; startTime: string; endTime: string; type: string; color: string } | null>(null);
  const [pending, start] = useTransition();

  const firstDay = new Date(month);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startOfGrid = new Date(firstDay); startOfGrid.setDate(firstDay.getDate() - firstDay.getDay());
  const endOfGrid = new Date(lastDay); endOfGrid.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  useEffect(() => {
    listMyEvents(startOfGrid.toISOString(), endOfGrid.toISOString()).then((r) => {
      if (r.ok) setEvents(r.data as unknown as CalEvent[]);
    });
  }, [month]); // eslint-disable-line

  // Overlay plan due dates as pseudo-events
  const planPins = plans.filter((p) => p.due_at && p.status !== "completed").map((p) => ({
    id: `plan:${p.id}`,
    title: `📋 ${p.title}`,
    start_time: p.due_at as string,
    end_time: p.due_at as string,
    type: "plan",
    color: p.color,
    location: null,
    created_by: "",
    isPlan: true,
  } as CalEvent & { isPlan?: boolean }));

  const allEvents = [...events, ...planPins];

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = new Map<string, (CalEvent & { isPlan?: boolean })[]>();
  for (const e of allEvents) {
    const k = new Date(e.start_time).toISOString().slice(0, 10);
    (byDay.get(k) || byDay.set(k, []).get(k)!).push(e);
  }

  const days: Date[] = [];
  for (let d = new Date(startOfGrid); d <= endOfGrid; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  const selectedDayEvents = selected ? (byDay.get(selected) || []) : [];

  const onCreate = () => start(async () => {
    if (!creating) return;
    const startISO = new Date(`${creating.date}T${creating.startTime}`).toISOString();
    const endISO = new Date(`${creating.date}T${creating.endTime}`).toISOString();
    const res = await createEvent({
      title: creating.title, startTime: startISO, endTime: endISO,
      type: creating.type as "event" | "class" | "deadline" | "meeting" | "reminder",
      color: creating.color,
    });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Event created");
    setCreating(null);
    // Reload
    listMyEvents(startOfGrid.toISOString(), endOfGrid.toISOString()).then((r) => { if (r.ok) setEvents(r.data as unknown as CalEvent[]); });
  });

  const onDeleteEvent = (id: string) => start(async () => {
    const res = await deleteEvent(id);
    if (!res.ok) { toast.error(res.error); return; }
    setEvents(events.filter((e) => e.id !== id));
    toast.success("Deleted");
  });

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div>
      {/* Calendar header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={btnNav}>‹</button>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: 0, minWidth: 180, textAlign: "center" }}>
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={btnNav}>›</button>
          <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} style={btnGhost}>Today</button>
        </div>
        <div style={{ fontSize: 12, color: "#8892A4" }}>{events.length} events · {planPins.length} plan deadlines</div>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", textAlign: "center" }}>{d}</div>
        ))}
      </div>

      {/* Month grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, background: "#0A0E1A", padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
        {days.map((d) => {
          const k = dayKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = k === todayKey;
          const isSelected = selected === k;
          const events = byDay.get(k) || [];
          return (
            <button key={k} onClick={() => setSelected(k)} onDoubleClick={() => setCreating({ date: k, title: "", startTime: "09:00", endTime: "10:00", type: "event", color: "#1E88E5" })}
              style={{
                minHeight: 90, padding: 6, textAlign: "left", cursor: "pointer",
                background: isSelected ? "rgba(171,71,188,0.12)" : isToday ? "rgba(30,136,229,0.08)" : "#111827",
                border: `1px solid ${isSelected ? "#AB47BC" : isToday ? "rgba(30,136,229,0.3)" : "rgba(255,255,255,0.04)"}`,
                borderRadius: 8, color: inMonth ? "#E8EDF5" : "#5A6478",
                display: "flex", flexDirection: "column", gap: 3,
                transition: "background 0.15s, border 0.15s",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? "#1E88E5" : inMonth ? "#E8EDF5" : "#5A6478" }}>{d.getDate()}</span>
                {events.length > 0 && <span style={{ fontSize: 9, color: "#8892A4" }}>{events.length}</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minHeight: 0 }}>
                {events.slice(0, 3).map((e) => (
                  <div key={e.id} title={e.title} style={{
                    fontSize: 10, padding: "2px 5px", borderRadius: 4, color: "#fff",
                    background: `${e.color}CC`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>{e.title}</div>
                ))}
                {events.length > 3 && <div style={{ fontSize: 9, color: "#8892A4" }}>+{events.length - 3} more</div>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day detail + quick-add */}
      {selected && (
        <div style={{ marginTop: 14, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, color: "#E8EDF5", margin: 0, fontWeight: 700 }}>
              {new Date(selected).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </h3>
            <button onClick={() => setCreating({ date: selected, title: "", startTime: "09:00", endTime: "10:00", type: "event", color: "#1E88E5" })} style={btnPrimary}>+ Add event</button>
          </div>
          {selectedDayEvents.length === 0 && <div style={{ fontSize: 12, color: "#8892A4" }}>No events. Double-click any day to add.</div>}
          {selectedDayEvents.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 4, height: 28, background: e.color, borderRadius: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{e.title}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>
                  {new Date(e.start_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  {e.type !== "plan" && e.end_time && ` – ${new Date(e.end_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
                  {e.location && ` · ${e.location}`}
                </div>
              </div>
              <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: `${e.color}22`, color: e.color, textTransform: "uppercase", fontWeight: 700 }}>{e.type}</span>
              {!(e as CalEvent & { isPlan?: boolean }).isPlan && (
                <button onClick={() => onDeleteEvent(e.id)} disabled={pending} style={btnTinyDanger}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && setCreating(null)}>
          <div style={{ ...modalPanel, width: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0 }}>New event · {new Date(creating.date).toLocaleDateString()}</h2>
              <button onClick={() => setCreating(null)} style={btnClose}>✕</button>
            </div>
            <label style={lbl}>Title</label>
            <input value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value })} placeholder="e.g. AI class" style={{ ...input, width: "100%", marginBottom: 10 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Start</label>
                <input type="time" value={creating.startTime} onChange={(e) => setCreating({ ...creating, startTime: e.target.value })} style={{ ...input, width: "100%" }} />
              </div>
              <div>
                <label style={lbl}>End</label>
                <input type="time" value={creating.endTime} onChange={(e) => setCreating({ ...creating, endTime: e.target.value })} style={{ ...input, width: "100%" }} />
              </div>
            </div>
            <label style={lbl}>Type</label>
            <select value={creating.type} onChange={(e) => setCreating({ ...creating, type: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }}>
              <option value="event">Event</option><option value="class">Class</option>
              <option value="deadline">Deadline</option><option value="meeting">Meeting</option>
              <option value="reminder">Reminder</option>
            </select>
            <label style={lbl}>Color</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {COLORS.map((c) => (
                <button key={c} onClick={() => setCreating({ ...creating, color: c })} style={{
                  width: 28, height: 28, borderRadius: "50%", background: c, cursor: "pointer",
                  border: creating.color === c ? "3px solid #fff" : "2px solid rgba(255,255,255,0.1)",
                }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setCreating(null)} style={btnGhost}>Cancel</button>
              <button onClick={onCreate} disabled={pending || !creating.title} style={btnPrimary}>{pending ? "Saving…" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── TIMELINE TAB (plans ordered by due date) ─── */
function TimelineTab({ plans }: { plans: Plan[] }) {
  const sorted = [...plans].filter((p) => p.due_at).sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  if (sorted.length === 0) return <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>No dated plans yet. Add a due date to see them on the timeline.</div>;
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
      <div style={{ position: "relative", paddingLeft: 30 }}>
        <div style={{ position: "absolute", left: 8, top: 4, bottom: 4, width: 2, background: "rgba(171,71,188,0.3)" }} />
        {sorted.map((p) => {
          const due = new Date(p.due_at!);
          const overdue = due < new Date() && p.status !== "completed";
          return (
            <div key={p.id} style={{ position: "relative", paddingBottom: 18 }}>
              <div style={{ position: "absolute", left: -24, top: 6, width: 14, height: 14, borderRadius: "50%", background: p.color, border: "3px solid #111827", boxShadow: `0 0 0 2px ${p.color}55` }} />
              <div style={{ fontSize: 11, color: overdue ? "#EF5350" : "#8892A4", letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 700 }}>
                {due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} {due.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                {overdue && " · OVERDUE"}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", marginTop: 2 }}>
                {p.icon} {p.title}
              </div>
              {p.description && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{p.description}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ─── */
function AnalyticsTab({ plans, itemsByPlan }: { plans: Plan[]; itemsByPlan: Record<string, PlanItem[]> }) {
  const total = plans.length;
  const done = plans.filter((p) => p.status === "completed").length;
  const onTime = plans.filter((p) => p.status === "completed" && p.due_at && p.completed_at && new Date(p.completed_at) <= new Date(p.due_at)).length;
  const inProgress = plans.filter((p) => p.status === "in_progress").length;
  const overdue = plans.filter((p) => p.status !== "completed" && p.due_at && new Date(p.due_at) < new Date()).length;
  const allItems = Object.values(itemsByPlan).flat();
  const totalItems = allItems.length;
  const doneItems = allItems.filter((i) => i.done).length;

  const byPriority = (["urgent", "high", "normal", "low"] as Priority[]).map((p) => ({
    label: PRIORITY_META[p].label, color: PRIORITY_META[p].color,
    count: plans.filter((pl) => pl.priority === p).length,
  }));
  const maxByPri = Math.max(1, ...byPriority.map((x) => x.count));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Stat label="Total plans"   value={total}     color="#8892A4" />
        <Stat label="Completed"     value={done}       color="#66BB6A" />
        <Stat label="On-time rate"  value={done ? `${Math.round((onTime / done) * 100)}%` : "—"} color="#1E88E5" />
        <Stat label="Items ticked"  value={`${doneItems}/${totalItems}`} color="#AB47BC" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <h3 style={sectionHeader}>By priority</h3>
          {byPriority.map((p) => (
            <div key={p.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E8EDF5", marginBottom: 4 }}>
                <span style={{ color: p.color, fontWeight: 700 }}>{p.label}</span><span style={{ color: "#8892A4" }}>{p.count}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${(p.count / maxByPri) * 100}%`, height: "100%", background: p.color }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <h3 style={sectionHeader}>Status mix</h3>
          <div style={{ fontSize: 12, color: "#E8EDF5" }}>
            <KV label="In progress" value={inProgress} color="#1E88E5" />
            <KV label="Completed"   value={done}       color="#66BB6A" />
            <KV label="Overdue"     value={overdue}    color="#EF5350" />
            <KV label="Other"       value={total - inProgress - done - overdue} color="#8892A4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function KV({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ color: "#8892A4" }}>{label}</span>
      <span style={{ color, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</span>
    </div>
  );
}

/* ─── COMPLETED TAB ─── */
function CompletedTab({ plans }: { plans: Plan[] }) {
  if (plans.length === 0) return <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>Nothing completed yet. Keep going!</div>;
  const sorted = [...plans].sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime());
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {sorted.map((p) => (
        <div key={p.id} style={{ background: "#111827", border: "1px solid rgba(102,187,106,0.15)", borderLeft: `4px solid ${p.color}`, borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 24 }}>{p.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{p.title}</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Completed {p.completed_at ? new Date(p.completed_at).toLocaleString() : "—"}</div>
          </div>
          <span style={{ fontSize: 22 }}>✅</span>
        </div>
      ))}
    </div>
  );
}

const btnNav: React.CSSProperties = { width: 36, height: 36, borderRadius: 8, background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.08)", fontSize: 20, cursor: "pointer" };

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>{value}</div>
    </div>
  );
}
function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginTop: 2 }}>{value}</div>
    </div>
  );
}

const input: React.CSSProperties = { padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 6 };
const sectionHeader: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase", margin: "0 0 10px 0" };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnDanger: React.CSSProperties = { padding: "9px 14px", background: "rgba(239,83,80,0.12)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnTinySuccess: React.CSSProperties = { padding: "4px 8px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 6, fontSize: 12, cursor: "pointer" };
const btnTinyGhost: React.CSSProperties = { padding: "4px 8px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const btnTinyDanger: React.CSSProperties = { padding: "4px 8px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.2)", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20, overflowY: "auto" };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, maxWidth: "96vw" };
