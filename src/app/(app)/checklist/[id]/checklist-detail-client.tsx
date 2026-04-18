"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Checklist, ChecklistItem } from "@/app/actions/checklist";
import { toggleChecklistItem, blockChecklistItem, addChecklistItem, signChecklist } from "@/app/actions/checklist";

interface Props { checklist: Checklist; userId: string; userRole: string }

export function ChecklistDetailClient({ checklist: initialData, userId, userRole }: Props) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [pending, start] = useTransition();
  const [showAddItem, setShowAddItem] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCritical, setNewItemCritical] = useState(false);
  const [newItemDeadline, setNewItemDeadline] = useState("");
  const [signName, setSignName] = useState("");
  const isAdmin = ["admin", "super_admin"].includes(userRole);
  const canSign = data.signature_required && !data.signed && data.completion_pct === 100;

  function handleToggle(item: ChecklistItem) {
    start(async () => {
      const res = await toggleChecklistItem(data.id, item.id, !item.completed);
      if (res.ok) {
        setData((prev) => {
          const updatedItems = updateItemInTree(prev.items ?? [], item.id, (i) => ({
            ...i, completed: !item.completed, completed_at: !item.completed ? new Date().toISOString() : null,
          }));
          return { ...prev, items: updatedItems, completion_pct: res.data.completion_pct };
        });
        if (!item.completed && res.data.completion_pct === 100) {
          toast.success("🎉 Checklist complete! Great work!");
        }
      } else { toast.error(res.error); }
    });
  }

  function handleBlock(item: ChecklistItem) {
    const reason = prompt("Why is this item blocked?");
    if (!reason) return;
    start(async () => {
      const res = await blockChecklistItem(item.id, reason);
      if (res.ok) { toast.success("Item marked as blocked."); router.refresh(); }
      else toast.error(res.error);
    });
  }

  function handleAddItem() {
    if (!newItemTitle.trim()) { toast.error("Title required"); return; }
    start(async () => {
      const res = await addChecklistItem(data.id, {
        title: newItemTitle.trim(),
        is_critical: newItemCritical,
        deadline: newItemDeadline || undefined,
      });
      if (res.ok) {
        toast.success("Item added");
        setNewItemTitle(""); setNewItemCritical(false); setNewItemDeadline("");
        setShowAddItem(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function handleSign() {
    if (!signName.trim()) { toast.error("Please type your name"); return; }
    start(async () => {
      const res = await signChecklist(data.id, signName.trim());
      if (res.ok) {
        toast.success("✍️ Checklist signed!");
        setData((prev) => ({ ...prev, signed: true }));
        setShowSignModal(false);
      } else toast.error(res.error);
    });
  }

  const topItems = (data.items ?? []).filter((i) => !i.parent_id);
  const completed = topItems.filter((i) => i.completed).length;
  const overdueItems = topItems.filter((i) => !i.completed && i.deadline && new Date(i.deadline) < new Date());
  const criticalPending = topItems.filter((i) => i.is_critical && !i.completed);

  return (
    <div style={{ maxWidth: 740, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        .cd-back { background: none; border: none; color: #5A6478; cursor: pointer; font-size: 13px; font-family: 'Nunito', sans-serif; display: flex; align-items: center; gap: 6px; padding: 0; margin-bottom: 18px; }
        .cd-back:hover { color: #E8EDF5; }

        .cd-hero { background: linear-gradient(135deg, #111827 60%, rgba(30,136,229,0.06)); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 24px; margin-bottom: 18px; }
        .cd-hero-top { display: flex; gap: 16px; align-items: flex-start; }
        .cd-ring-wrap { flex-shrink: 0; }
        .cd-hero-body { flex: 1; min-width: 0; }
        .cd-title { font-size: 20px; font-weight: 800; font-family: 'Space Grotesk', sans-serif; margin: 0 0 5px; }
        .cd-desc { font-size: 13px; color: #8892A4; margin: 0 0 12px; }
        .cd-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .cd-chip { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }

        .cd-progress-bar { height: 8px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
        .cd-progress-fill { height: 100%; border-radius: 99px; transition: width 0.5s; }

        .cd-alert { padding: 11px 14px; border-radius: 12px; font-size: 13px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }

        .cd-section-head { font-size: 11px; font-weight: 700; color: #5A6478; text-transform: uppercase; letter-spacing: 0.8px; margin: 22px 0 10px; display: flex; align-items: center; gap: 8px; }
        .cd-section-head::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }

        .cd-item { background: #111827; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 13px 16px; margin-bottom: 8px; display: flex; gap: 12px; align-items: flex-start; transition: border-color 0.2s; }
        .cd-item-done { background: rgba(102,187,106,0.03); border-color: rgba(102,187,106,0.15) !important; }
        .cd-item-blocked { background: rgba(239,83,80,0.03); border-color: rgba(239,83,80,0.15) !important; }
        .cd-item-overdue { border-color: rgba(255,193,7,0.2) !important; }
        .cd-checkbox { width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; cursor: pointer; border: 2px solid rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-top: 1px; }
        .cd-checkbox:hover { border-color: #1E88E5; }
        .cd-checkbox-done { background: #66BB6A; border-color: #66BB6A !important; }
        .cd-item-body { flex: 1; min-width: 0; }
        .cd-item-title { font-size: 13px; font-weight: 700; color: #E8EDF5; line-height: 1.4; }
        .cd-item-title-done { text-decoration: line-through; color: #5A6478; }
        .cd-item-meta { display: flex; gap: 7px; align-items: center; margin-top: 5px; flex-wrap: wrap; }
        .cd-item-actions { display: flex; gap: 5px; flex-shrink: 0; align-self: flex-start; }
        .cd-action-btn { padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #5A6478; font-size: 10px; cursor: pointer; font-family: 'Nunito', sans-serif; }

        /* Subtasks */
        .cd-subtasks { margin-top: 10px; padding-left: 16px; display: flex; flex-direction: column; gap: 6px; }
        .cd-subtask { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #8892A4; cursor: pointer; }

        /* Sign modal */
        .cd-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 999; display: flex; align-items: flex-end; justify-content: center; }
        @media (min-width: 640px) { .cd-modal-overlay { align-items: center; padding: 20px; } }
        .cd-modal { background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 22px 22px 0 0; padding: 24px 20px 32px; width: 100%; max-width: 440px; max-height: 92dvh; overflow-y: auto; }
        @media (min-width: 640px) { .cd-modal { border-radius: 22px; padding: 28px 24px; } }

        @media (max-width: 640px) {
          .cd-title { font-size: 17px; }
          .cd-hero { padding: 18px 16px; border-radius: 16px; }
          .cd-hero-top { gap: 12px; }
          .cd-item { padding: 11px 13px; gap: 10px; }
          .cd-item-title { font-size: 12px; }
          .cd-chips { gap: 6px; }
          .cd-chip { padding: 2px 8px; font-size: 10px; }
          .cd-section-head { font-size: 10px; margin: 16px 0 8px; }
          .cd-alert { padding: 10px 12px; font-size: 12px; border-radius: 10px; }
          .cd-add-grid { flex-direction: column !important; }
        }
      `}</style>

      <button className="cd-back" onClick={() => router.push("/checklist")}>← Back to Checklists</button>

      {/* Hero card */}
      <div className="cd-hero">
        <div className="cd-hero-top">
          <div className="cd-ring-wrap">
            <svg viewBox="0 0 60 60" width="64" height="64">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
              <circle cx="30" cy="30" r="24" fill="none"
                stroke={data.completion_pct === 100 ? "#66BB6A" : "#1E88E5"}
                strokeWidth="5"
                strokeDasharray={`${(data.completion_pct / 100) * 150.8} 150.8`}
                strokeLinecap="round"
                transform="rotate(-90 30 30)"
              />
              <text x="30" y="34" textAnchor="middle" fontSize="13" fontWeight="800" fill={data.completion_pct === 100 ? "#66BB6A" : "#E8EDF5"} fontFamily="'Space Grotesk', sans-serif">
                {data.completion_pct}%
              </text>
            </svg>
          </div>
          <div className="cd-hero-body">
            <h1 className="cd-title">{data.title}</h1>
            {data.description && <p className="cd-desc">{data.description}</p>}
            <div className="cd-chips">
              <span className="cd-chip" style={{ background: "rgba(30,136,229,0.12)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.2)" }}>{data.category}</span>
              {data.due_date && (
                <span className="cd-chip" style={{ background: new Date(data.due_date) < new Date() && data.status !== "completed" ? "rgba(239,83,80,0.12)" : "rgba(255,193,7,0.12)", color: new Date(data.due_date) < new Date() && data.status !== "completed" ? "#EF5350" : "#FFC107", border: "1px solid" }}>
                  {new Date(data.due_date) < new Date() && data.status !== "completed" ? "⚠️ Overdue" : "📅"} {new Date(data.due_date).toLocaleDateString()}
                </span>
              )}
              {data.signature_required && (
                <span className="cd-chip" style={{ background: data.signed ? "rgba(102,187,106,0.12)" : "rgba(171,71,188,0.12)", color: data.signed ? "#66BB6A" : "#AB47BC", border: "1px solid" }}>
                  {data.signed ? "✍️ Signed" : "✍️ Signature Required"}
                </span>
              )}
            </div>
            <div className="cd-progress-bar">
              <div className="cd-progress-fill" style={{ width: `${data.completion_pct}%`, background: data.completion_pct === 100 ? "#66BB6A" : "linear-gradient(90deg,#1E88E5,#AB47BC)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5A6478", marginTop: 5 }}>
              <span>{completed}/{topItems.length} items done</span>
              <span>{data.xp_reward} XP on completion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {overdueItems.length > 0 && (
        <div className="cd-alert" style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.2)", color: "#FFC107" }}>
          ⚠️ {overdueItems.length} item{overdueItems.length !== 1 ? "s" : ""} past their deadline
        </div>
      )}
      {criticalPending.length > 0 && (
        <div className="cd-alert" style={{ background: "rgba(239,83,80,0.07)", border: "1px solid rgba(239,83,80,0.15)", color: "#EF5350" }}>
          🚨 {criticalPending.length} critical item{criticalPending.length !== 1 ? "s" : ""} not yet completed
        </div>
      )}
      {canSign && (
        <div className="cd-alert" style={{ background: "rgba(171,71,188,0.08)", border: "1px solid rgba(171,71,188,0.2)", color: "#AB47BC", cursor: "pointer" }} onClick={() => setShowSignModal(true)}>
          ✍️ All items done! Click here to sign off this checklist
        </div>
      )}

      {/* Items */}
      <div className="cd-section-head">📋 Checklist Items ({topItems.length})</div>

      {topItems.length === 0 ? (
        <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 14, padding: 30, textAlign: "center", color: "#5A6478", fontSize: 13 }}>
          No items yet. Add your first item below.
        </div>
      ) : (
        topItems.sort((a, b) => a.sort_order - b.sort_order).map((item) => {
          const isOverdue = !item.completed && item.deadline && new Date(item.deadline) < new Date();
          return (
            <div key={item.id} className={`cd-item${item.completed ? " cd-item-done" : ""}${item.blocked ? " cd-item-blocked" : ""}${isOverdue ? " cd-item-overdue" : ""}`}>
              {/* Checkbox */}
              <div
                className={`cd-checkbox${item.completed ? " cd-checkbox-done" : ""}`}
                onClick={() => !item.blocked && handleToggle(item)}
                title={item.blocked ? "Item is blocked" : item.completed ? "Mark incomplete" : "Mark complete"}
              >
                {item.completed && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {item.blocked && !item.completed && <span style={{ fontSize: 11 }}>🚫</span>}
              </div>

              <div className="cd-item-body">
                <div className={`cd-item-title${item.completed ? " cd-item-title-done" : ""}`}>
                  {item.is_critical && !item.completed && <span style={{ color: "#EF5350", marginRight: 5 }}>★</span>}
                  {item.title}
                </div>
                {item.notes && <div style={{ fontSize: 12, color: "#5A6478", marginTop: 3 }}>{item.notes}</div>}
                <div className="cd-item-meta">
                  {item.is_critical && <span style={{ fontSize: 10, color: "#EF5350", fontWeight: 700 }}>CRITICAL</span>}
                  {isOverdue && <span style={{ fontSize: 10, color: "#FFC107", fontWeight: 700 }}>OVERDUE</span>}
                  {item.deadline && (
                    <span style={{ fontSize: 10, color: isOverdue ? "#FFC107" : "#5A6478" }}>
                      Due {new Date(item.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {item.completed && item.completed_at && (
                    <span style={{ fontSize: 10, color: "#66BB6A" }}>✓ Done {new Date(item.completed_at).toLocaleDateString()}</span>
                  )}
                  {item.blocked && <span style={{ fontSize: 10, color: "#EF5350" }}>🚫 {item.blocked_reason}</span>}
                </div>

                {/* Subtasks */}
                {item.subtasks && item.subtasks.length > 0 && (
                  <div className="cd-subtasks">
                    {item.subtasks.map((sub) => (
                      <div key={sub.id} className="cd-subtask" onClick={() => handleToggle(sub)}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sub.completed ? "#66BB6A" : "rgba(255,255,255,0.2)"}`, background: sub.completed ? "#66BB6A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {sub.completed && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <span style={{ textDecoration: sub.completed ? "line-through" : "none", color: sub.completed ? "#5A6478" : "#8892A4" }}>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cd-item-actions">
                {!item.completed && !item.blocked && (
                  <button className="cd-action-btn" onClick={() => handleBlock(item)} title="Mark as blocked">🚫</button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Add item */}
      {showAddItem ? (
        <div style={{ background: "#111827", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 14, padding: "14px 16px", marginTop: 10 }}>
          <input
            style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#E8EDF5", fontSize: 13, fontFamily: "'Nunito', sans-serif", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
            placeholder="New item title…"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            autoFocus
          />
          <div className="cd-add-grid" style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <input type="datetime-local" value={newItemDeadline} onChange={(e) => setNewItemDeadline(e.target.value)} style={{ flex: 1, minWidth: 0, padding: "8px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 12, fontFamily: "'Nunito', sans-serif", outline: "none" }} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#E8EDF5", cursor: "pointer", flexShrink: 0 }}>
              <input type="checkbox" checked={newItemCritical} onChange={(e) => setNewItemCritical(e.target.checked)} style={{ accentColor: "#EF5350" }} />
              Critical
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddItem} disabled={pending} style={{ padding: "8px 18px", background: "#1E88E5", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              Add Item
            </button>
            <button onClick={() => { setShowAddItem(false); setNewItemTitle(""); }} style={{ padding: "8px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#5A6478", fontSize: 12, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddItem(true)} style={{ width: "100%", marginTop: 10, padding: 12, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, color: "#5A6478", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", transition: "border-color 0.2s" }}>
          + Add Item
        </button>
      )}

      {/* Sign modal */}
      {showSignModal && (
        <div className="cd-modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 99, margin: "0 auto 18px" }} />
            <div style={{ fontSize: 40, textAlign: "center", marginBottom: 10 }}>✍️</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4, textAlign: "center" }}>Sign Off Checklist</div>
            <div style={{ fontSize: 13, color: "#8892A4", textAlign: "center", marginBottom: 20 }}>By signing, you confirm all items are complete</div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Your Full Name *</label>
            <input
              style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(171,71,188,0.3)", borderRadius: 10, color: "#E8EDF5", fontSize: 15, fontFamily: "'Space Grotesk', sans-serif", outline: "none", marginBottom: 16, boxSizing: "border-box", letterSpacing: "1px" }}
              placeholder="Type your full name…"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
            />
            <button onClick={handleSign} disabled={pending} style={{ width: "100%", padding: 14, background: "linear-gradient(135deg,#AB47BC,#6A1B9A)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 800, cursor: pending ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif" }}>
              {pending ? "Signing…" : "✍️ Sign & Complete"}
            </button>
            <button onClick={() => setShowSignModal(false)} style={{ width: "100%", marginTop: 8, padding: 12, background: "none", border: "none", color: "#5A6478", fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function updateItemInTree(items: ChecklistItem[], id: string, updater: (i: ChecklistItem) => ChecklistItem): ChecklistItem[] {
  return items.map((item) => {
    if (item.id === id) return updater(item);
    if (item.subtasks) return { ...item, subtasks: updateItemInTree(item.subtasks, id, updater) };
    return item;
  });
}
