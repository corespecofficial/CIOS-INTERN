"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Checklist } from "@/app/actions/checklist";
import { createChecklist, deleteChecklist } from "@/app/actions/checklist";

const PRIORITY_CFG = {
  urgent: { color: "#EF5350", bg: "rgba(239,83,80,0.12)", dot: "#EF5350", label: "Urgent" },
  high:   { color: "#FF7043", bg: "rgba(255,112,67,0.12)", dot: "#FF7043", label: "High" },
  medium: { color: "#FFC107", bg: "rgba(255,193,7,0.12)", dot: "#FFC107", label: "Medium" },
  low:    { color: "#8892A4", bg: "rgba(136,146,164,0.1)", dot: "#5A6478", label: "Low" },
};

const STATUS_CFG = {
  active:    { color: "#1E88E5", bg: "rgba(30,136,229,0.12)", label: "Active" },
  completed: { color: "#66BB6A", bg: "rgba(102,187,106,0.12)", label: "Completed ✓" },
  archived:  { color: "#5A6478", bg: "rgba(90,100,120,0.1)", label: "Archived" },
  cancelled: { color: "#EF5350", bg: "rgba(239,83,80,0.1)", label: "Cancelled" },
};

interface Props { checklists: Checklist[]; userRole: string }

export function ChecklistHomeClient({ checklists, userRole }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDue, setNewDue] = useState("");
  const [newSig, setNewSig] = useState(false);
  const isAdmin = ["admin", "super_admin"].includes(userRole);

  const filtered = checklists.filter((c) =>
    filter === "all" ? true : filter === "active" ? c.status === "active" : c.status === "completed"
  );

  const totalDone    = checklists.filter((c) => c.status === "completed").length;
  const totalActive  = checklists.filter((c) => c.status === "active").length;
  const totalOverdue = checklists.reduce((s, c) => s + (c.overdue_count ?? 0), 0);
  const avgCompletion = checklists.length > 0
    ? Math.round(checklists.reduce((s, c) => s + c.completion_pct, 0) / checklists.length)
    : 0;

  function handleCreate() {
    if (!newTitle.trim()) { toast.error("Title is required"); return; }
    start(async () => {
      const res = await createChecklist({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        due_date: newDue || undefined,
        signature_required: newSig,
      });
      if (res.ok) {
        setShowCreate(false);
        setNewTitle(""); setNewDesc(""); setNewDue(""); setNewSig(false);
        router.refresh(); // reload server data so the new item appears in the list
        toast.success("Checklist created! ✅", {
          duration: 4000,
          icon: "📋",
        });
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleDelete(c: Checklist) {
    if (!confirm(`Archive "${c.title}"?`)) return;
    start(async () => {
      const res = await deleteChecklist(c.id);
      if (res.ok) { toast.success("Archived."); router.refresh(); }
      else toast.error(res.error);
    });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        /* ── Checklist home ── */
        .cl-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 12px; }
        .cl-h1 { font-size: 28px; font-weight: 800; margin: 0; font-family: 'Space Grotesk', sans-serif; }
        .cl-sub { font-size: 13px; color: #5A6478; margin: 4px 0 0; }

        .cl-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin-bottom: 20px; }
        .cl-stat { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px 10px; text-align: center; }
        .cl-stat-num { font-size: 24px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; line-height: 1; }
        .cl-stat-label { font-size: 10px; color: #5A6478; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }

        .cl-filter-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .cl-filter-tab { padding: 8px 16px; border-radius: 99px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #5A6478; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s; }
        .cl-filter-tab-active { background: #1E88E5; border-color: #1E88E5; color: #fff; }

        .cl-card { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px 18px; cursor: pointer; transition: border-color 0.2s, transform 0.15s; margin-bottom: 10px; display: flex; align-items: center; gap: 14px; }
        .cl-card:hover { border-color: rgba(30,136,229,0.3); transform: translateY(-1px); }
        .cl-card-done { border-color: rgba(102,187,106,0.2) !important; background: rgba(102,187,106,0.03) !important; }

        .cl-pct-ring-wrap { width: 48px; height: 48px; flex-shrink: 0; position: relative; }
        .cl-card-body { flex: 1; min-width: 0; }
        .cl-card-title { font-size: 14px; font-weight: 700; color: #E8EDF5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cl-card-meta { display: flex; gap: 8px; align-items: center; margin-top: 5px; flex-wrap: wrap; }
        .cl-card-chip { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .cl-card-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }

        .cl-progress-bar-wrap { width: 100%; background: rgba(255,255,255,0.06); border-radius: 99px; height: 6px; overflow: hidden; margin-top: 8px; }
        .cl-progress-bar-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }

        /* Create modal */
        .cl-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 999; display: flex; align-items: flex-end; justify-content: center; padding: 0; }
        @media (min-width: 640px) { .cl-modal-overlay { align-items: center; padding: 20px; } }
        .cl-modal { background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px 22px 0 0; padding: 24px 20px 32px; width: 100%; max-width: 500px; max-height: 92dvh; overflow-y: auto; }
        @media (min-width: 640px) { .cl-modal { border-radius: 22px; padding: 28px 24px; max-height: 90vh; } }
        .cl-modal-title { font-size: 18px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; margin-bottom: 20px; }
        .cl-input { width: 100%; padding: 11px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #E8EDF5; font-size: 13px; font-family: 'Nunito', sans-serif; outline: none; box-sizing: border-box; margin-bottom: 12px; }
        .cl-label { font-size: 11px; font-weight: 700; color: #8892A4; display: block; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
        .cl-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        @media (max-width: 400px) { .cl-form-grid { grid-template-columns: 1fr; } }

        @media (max-width: 640px) {
          .cl-stats { grid-template-columns: repeat(2,1fr); gap: 8px; }
          .cl-h1 { font-size: 22px; }
          .cl-header { margin-bottom: 18px; }
          .cl-stat { padding: 12px 8px; border-radius: 12px; }
          .cl-stat-num { font-size: 22px; }
          .cl-card { padding: 13px 14px; gap: 11px; }
          .cl-pct-ring-wrap { width: 42px; height: 42px; }
          .cl-card-title { font-size: 13px; }
          .cl-filter-tabs { gap: 6px; }
          .cl-filter-tab { padding: 7px 12px; font-size: 11px; }
          .cl-modal { padding: 22px 18px; }
          .cl-modal-title { font-size: 16px; }
        }
      `}</style>

      {/* Header */}
      <div className="cl-header">
        <div>
          <h1 className="cl-h1">✅ Checklists</h1>
          <p className="cl-sub">Track your progress · Sign off milestones · Stay accountable</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/checklist/templates")} style={{ padding: "10px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#E8EDF5", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            📋 Templates
          </button>
          <button onClick={() => setShowCreate(true)} style={{ padding: "10px 18px", background: "linear-gradient(135deg,#1E88E5,#43A047)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            + New Checklist
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cl-stats">
        <div className="cl-stat" style={{ borderTop: "2px solid #1E88E5" }}>
          <div className="cl-stat-num" style={{ color: "#1E88E5" }}>{totalActive}</div>
          <div className="cl-stat-label">Active</div>
        </div>
        <div className="cl-stat" style={{ borderTop: "2px solid #66BB6A" }}>
          <div className="cl-stat-num" style={{ color: "#66BB6A" }}>{totalDone}</div>
          <div className="cl-stat-label">Completed</div>
        </div>
        <div className="cl-stat" style={{ borderTop: "2px solid #EF5350" }}>
          <div className="cl-stat-num" style={{ color: "#EF5350" }}>{totalOverdue}</div>
          <div className="cl-stat-label">Overdue Items</div>
        </div>
        <div className="cl-stat" style={{ borderTop: "2px solid #AB47BC" }}>
          <div className="cl-stat-num" style={{ color: "#AB47BC" }}>{avgCompletion}%</div>
          <div className="cl-stat-label">Avg. Done</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="cl-filter-tabs">
        {(["all", "active", "completed"] as const).map((f) => (
          <button key={f} className={`cl-filter-tab${filter === f ? " cl-filter-tab-active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? `All (${checklists.length})` : f === "active" ? `Active (${totalActive})` : `Done (${totalDone})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 18, padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#E8EDF5" }}>No checklists yet</div>
          <div style={{ fontSize: 13, color: "#5A6478", marginTop: 4, marginBottom: 20 }}>Create your first checklist or pick a template</div>
          <button onClick={() => setShowCreate(true)} style={{ padding: "12px 24px", background: "linear-gradient(135deg,#1E88E5,#43A047)", border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            + Create Checklist
          </button>
        </div>
      ) : (
        filtered.map((cl) => {
          const pri = PRIORITY_CFG[cl.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
          const sta = STATUS_CFG[cl.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.active;
          const isDue = cl.due_date && new Date(cl.due_date) < new Date() && cl.status !== "completed";

          return (
            <div
              key={cl.id}
              className={`cl-card${cl.status === "completed" ? " cl-card-done" : ""}`}
              onClick={() => router.push(`/checklist/${cl.id}`)}
            >
              {/* Progress circle */}
              <div className="cl-pct-ring-wrap">
                <svg viewBox="0 0 44 44" width="48" height="48">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
                  <circle cx="22" cy="22" r="18" fill="none"
                    stroke={cl.status === "completed" ? "#66BB6A" : "#1E88E5"}
                    strokeWidth="4"
                    strokeDasharray={`${(cl.completion_pct / 100) * 113} 113`}
                    strokeLinecap="round"
                    transform="rotate(-90 22 22)"
                  />
                  <text x="22" y="26" textAnchor="middle" fontSize="10" fontWeight="800" fill={cl.status === "completed" ? "#66BB6A" : "#E8EDF5"} fontFamily="'Space Grotesk', sans-serif">
                    {cl.completion_pct}%
                  </text>
                </svg>
              </div>

              <div className="cl-card-body">
                <div className="cl-card-title">{cl.title}</div>
                <div className="cl-card-meta">
                  <span className="cl-card-chip" style={{ background: pri.bg, color: pri.color }}>{pri.label}</span>
                  <span className="cl-card-chip" style={{ background: sta.bg, color: sta.color }}>{sta.label}</span>
                  {isDue && <span className="cl-card-chip" style={{ background: "rgba(239,83,80,0.12)", color: "#EF5350" }}>⚠️ Overdue</span>}
                  {cl.overdue_count && cl.overdue_count > 0 && (
                    <span style={{ fontSize: 11, color: "#EF5350" }}>{cl.overdue_count} item{cl.overdue_count !== 1 ? "s" : ""} overdue</span>
                  )}
                  {cl.due_date && !isDue && (
                    <span style={{ fontSize: 11, color: "#5A6478" }}>Due {new Date(cl.due_date).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="cl-progress-bar-wrap">
                  <div className="cl-progress-bar-fill" style={{ width: `${cl.completion_pct}%`, background: cl.status === "completed" ? "#66BB6A" : "linear-gradient(90deg,#1E88E5,#AB47BC)" }} />
                </div>
              </div>

              <div className="cl-card-right" onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: 11, color: "#5A6478", fontWeight: 700 }}>{cl.completed_items}/{cl.total_items} done</span>
                {cl.signature_required && <span style={{ fontSize: 11, color: "#AB47BC" }}>✍️ Sig req.</span>}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(cl); }} disabled={pending} style={{ padding: "4px 10px", background: "rgba(239,83,80,0.1)", border: "1px solid rgba(239,83,80,0.15)", borderRadius: 7, color: "#EF5350", fontSize: 11, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
                  Archive
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* History link */}
      {checklists.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button onClick={() => router.push("/checklist/history")} style={{ padding: "10px 22px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#5A6478", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
            📜 View History
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="cl-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="cl-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 99, margin: "0 auto 20px" }} />
            <div className="cl-modal-title">✅ New Checklist</div>

            <label className="cl-label">Title *</label>
            <input className="cl-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Launch Week Checklist" />

            <label className="cl-label">Description (optional)</label>
            <textarea className="cl-input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this checklist for?" style={{ minHeight: 70, resize: "vertical" }} />

            <div className="cl-form-grid">
              <div>
                <label className="cl-label">Priority</label>
                <select className="cl-input" value={newPriority} onChange={(e) => setNewPriority(e.target.value)} style={{ marginBottom: 0, cursor: "pointer" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="cl-label">Due Date</label>
                <input type="datetime-local" className="cl-input" value={newDue} onChange={(e) => setNewDue(e.target.value)} style={{ marginBottom: 0 }} />
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#E8EDF5", marginBottom: 20 }}>
              <input type="checkbox" checked={newSig} onChange={(e) => setNewSig(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#AB47BC", cursor: "pointer" }} />
              ✍️ Require digital signature on completion
            </label>

            <button onClick={handleCreate} disabled={pending} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#1E88E5,#43A047)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: pending ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", opacity: pending ? 0.6 : 1 }}>
              {pending ? "Creating…" : "Create Checklist"}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ width: "100%", padding: 12, marginTop: 8, background: "none", border: "none", color: "#5A6478", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
