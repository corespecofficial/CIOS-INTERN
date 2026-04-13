"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateRolePermission, deleteAnnouncement, type Priority } from "@/app/actions/announcements";

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const AUDIENCE_TYPES = ["all", "role", "user", "team", "class", "portal"];
const PRIORITY_COLOR: Record<string, string> = { low: "#8892A4", medium: "#1E88E5", high: "#FFC107", critical: "#EF5350" };

interface Perm { role: string; can_send: boolean; allowed_audiences: string[]; max_priority: Priority }
interface Ann { id: string; title: string; priority: string; status: string; audience_type: string; created_at: string; sender: { name: string; role: string } | null }

export function ControlClient({ announcements, permissions }: { announcements: Array<Record<string, unknown>>; permissions: Perm[] }) {
  const [perms, setPerms] = useState<Perm[]>(permissions);
  const [tab, setTab] = useState<"perms" | "history">("perms");
  const [pending, start] = useTransition();

  const update = (role: string, patch: Partial<Perm>) => start(async () => {
    const res = await updateRolePermission(role, {
      canSend: patch.can_send,
      allowedAudiences: patch.allowed_audiences,
      maxPriority: patch.max_priority,
    });
    if (!res.ok) { toast.error(res.error); return; }
    setPerms((prev) => prev.map((p) => p.role === role ? { ...p, ...patch } : p));
    toast.success("Updated");
  });

  const onDelete = (id: string) => start(async () => {
    if (!confirm("Archive this announcement?")) return;
    const res = await deleteAnnouncement(id);
    if (!res.ok) return toast.error(res.error);
    toast.success("Archived");
    window.location.reload();
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>SUPER ADMIN CONTROL</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📢 Announcement control</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Manage who can broadcast, at what priority, to whom</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        <button onClick={() => setTab("perms")} style={{ ...tabBtn, ...(tab === "perms" ? tabBtnActive : {}) }}>🛡 Permissions</button>
        <button onClick={() => setTab("history")} style={{ ...tabBtn, ...(tab === "history" ? tabBtnActive : {}) }}>📜 All announcements ({announcements.length})</button>
      </div>

      {tab === "perms" && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 2fr", padding: "10px 16px", background: "rgba(0,0,0,0.3)", fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1, textTransform: "uppercase" }}>
            <div>Role</div><div>Can send</div><div>Max priority</div><div>Allowed audiences</div>
          </div>
          {perms.map((p) => (
            <div key={p.role} style={{ display: "grid", gridTemplateColumns: "1fr 100px 160px 2fr", padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", alignItems: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", textTransform: "capitalize" }}>{p.role.replace("_", " ")}</div>
              <label style={{ position: "relative", display: "inline-block", width: 40, height: 22 }}>
                <input type="checkbox" checked={p.can_send} onChange={(e) => update(p.role, { can_send: e.target.checked })} disabled={pending} style={{ display: "none" }} />
                <span style={{ position: "absolute", inset: 0, background: p.can_send ? "#66BB6A" : "rgba(255,255,255,0.12)", borderRadius: 99, transition: "background 0.2s" }} />
                <span style={{ position: "absolute", top: 2, left: p.can_send ? 20 : 2, width: 18, height: 18, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
              </label>
              <select value={p.max_priority} onChange={(e) => update(p.role, { max_priority: e.target.value as Priority })} disabled={pending} style={{ ...input, background: `${PRIORITY_COLOR[p.max_priority]}22`, color: PRIORITY_COLOR[p.max_priority], fontWeight: 700, width: 140 }}>
                {PRIORITIES.map((pr) => <option key={pr} value={pr} style={{ background: "#0A0E1A", color: "#E8EDF5" }}>{pr}</option>)}
              </select>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {AUDIENCE_TYPES.map((a) => {
                  const has = p.allowed_audiences.includes(a);
                  return (
                    <button key={a} onClick={() => update(p.role, { allowed_audiences: has ? p.allowed_audiences.filter((x) => x !== a) : [...p.allowed_audiences, a] })} disabled={pending} style={{
                      padding: "4px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: "pointer",
                      background: has ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.04)",
                      color: has ? "#1E88E5" : "#8892A4", border: "none",
                    }}>{a}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div style={{ display: "grid", gap: 8 }}>
          {announcements.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>No announcements yet.</div>}
          {(announcements as unknown as Ann[]).map((a) => (
            <div key={a.id} style={{ background: "#111827", border: `1px solid ${PRIORITY_COLOR[a.priority] || "#8892A4"}22`, borderLeft: `4px solid ${PRIORITY_COLOR[a.priority] || "#8892A4"}`, borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{a.title}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>{a.priority} · {a.audience_type} · by {a.sender?.name} ({a.sender?.role}) · {new Date(a.created_at).toLocaleString()}</div>
              </div>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: a.status === "published" ? "rgba(102,187,106,0.15)" : "rgba(136,146,164,0.15)", color: a.status === "published" ? "#66BB6A" : "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{a.status}</span>
              <Link href={`/announcements/${a.id}`} style={btnSmall}>View</Link>
              {a.status === "published" && <button onClick={() => onDelete(a.id)} disabled={pending} style={btnSmallDanger}>Archive</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const tabBtn: React.CSSProperties = { flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "transparent", color: "#8892A4", border: "none" };
const tabBtnActive: React.CSSProperties = { background: "rgba(171,71,188,0.15)", color: "#AB47BC" };
const input: React.CSSProperties = { padding: "6px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 12 };
const btnSmall: React.CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, textDecoration: "none" };
const btnSmallDanger: React.CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, cursor: "pointer" };
