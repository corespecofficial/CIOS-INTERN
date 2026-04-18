"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateRolePermission, deleteAnnouncement, type Priority } from "@/app/actions/announcements";

const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];
const AUDIENCE_TYPES = ["all", "role", "user", "team", "class", "portal"];
const PRIORITY_COLOR: Record<string, string> = {
  low: "#8892A4", medium: "#1E88E5", high: "#FFC107", critical: "#EF5350",
};

interface Perm {
  role: string;
  can_send: boolean;
  allowed_audiences: string[];
  max_priority: Priority;
}

interface Ann {
  id: string;
  title: string;
  priority: string;
  status: string;
  audience_type: string;
  created_at: string;
  sender: { name: string; role: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", team_lead: "Team Lead",
  instructor: "Instructor", moderator: "Moderator", intern: "Intern",
  finance: "Finance", support: "Support", recruiter: "Recruiter",
};

export function ControlClient({
  announcements,
  permissions,
}: {
  announcements: Array<Record<string, unknown>>;
  permissions: Perm[];
}) {
  const [perms, setPerms] = useState<Perm[]>(permissions);
  const [tab, setTab] = useState<"perms" | "history">("perms");
  const [pending, start] = useTransition();
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const update = (role: string, patch: Partial<Perm>) =>
    start(async () => {
      const cur = perms.find((p) => p.role === role);
      if (!cur) return;
      const merged = { ...cur, ...patch };
      const res = await updateRolePermission(role, {
        canSend: merged.can_send,
        allowedAudiences: merged.allowed_audiences,
        maxPriority: merged.max_priority,
      });
      if (!res.ok) { toast.error(res.error); return; }
      setPerms((prev) => prev.map((p) => p.role === role ? merged : p));
      toast.success("Saved");
    });

  const onDelete = (id: string) =>
    start(async () => {
      if (!confirm("Archive this announcement?")) return;
      const res = await deleteAnnouncement(id);
      if (!res.ok) return toast.error(res.error);
      toast.success("Archived");
      window.location.reload();
    });

  const anns = announcements as unknown as Ann[];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif", color: "#E8EDF5" }}>
      <style>{`
        .ann-perm-row { padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .ann-audience-wrap { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        @media (max-width: 640px) {
          .ann-tab-label { display: none; }
          .ann-tab-label-short { display: inline !important; }
        }
        @media (min-width: 641px) {
          .ann-tab-label-short { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: "inline-block", padding: "3px 12px",
          background: "rgba(171,71,188,0.15)", color: "#AB47BC",
          fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 8,
        }}>SUPER ADMIN CONTROL</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px" }}>📢 Announcement Control</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Manage who can broadcast, at what priority, and to which audiences
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
        padding: 4, marginBottom: 16,
      }}>
        <button
          onClick={() => setTab("perms")}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 7, fontSize: 13, fontWeight: 700,
            cursor: "pointer", border: "none",
            background: tab === "perms" ? "rgba(171,71,188,0.15)" : "transparent",
            color: tab === "perms" ? "#AB47BC" : "#8892A4",
          }}
        >
          🛡 <span className="ann-tab-label">Permissions</span>
          <span className="ann-tab-label-short" style={{ display: "none" }}>Perms</span>
        </button>
        <button
          onClick={() => setTab("history")}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 7, fontSize: 13, fontWeight: 700,
            cursor: "pointer", border: "none",
            background: tab === "history" ? "rgba(171,71,188,0.15)" : "transparent",
            color: tab === "history" ? "#AB47BC" : "#8892A4",
          }}
        >
          📜 <span className="ann-tab-label">All announcements</span>
          <span className="ann-tab-label-short" style={{ display: "none" }}>History</span>
          {" "}
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20, borderRadius: "50%", fontSize: 10, fontWeight: 800,
            background: "rgba(255,255,255,0.1)", color: "#E8EDF5",
          }}>{anns.length}</span>
        </button>
      </div>

      {/* ── PERMISSIONS TAB ── */}
      {tab === "perms" && (
        <div style={{
          background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, overflow: "hidden",
        }}>
          {perms.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#5A6478", fontSize: 14 }}>
              No permission rows found. Run the database migration to seed defaults.
            </div>
          )}

          {perms.map((p) => {
            const isExpanded = expandedRole === p.role;
            return (
              <div key={p.role} className="ann-perm-row">
                {/* Row header — always visible */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpandedRole(isExpanded ? null : p.role)}
                >
                  {/* Role name */}
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>
                    {ROLE_LABELS[p.role] || p.role}
                  </div>

                  {/* Can-send toggle */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <label style={{
                      position: "relative", display: "inline-block", width: 44, height: 24,
                      cursor: "pointer", flexShrink: 0,
                    }}>
                      <input
                        type="checkbox" checked={p.can_send}
                        onChange={(e) => update(p.role, { can_send: e.target.checked })}
                        disabled={pending}
                        style={{ display: "none" }}
                      />
                      <span style={{
                        position: "absolute", inset: 0,
                        background: p.can_send ? "#66BB6A" : "rgba(255,255,255,0.12)",
                        borderRadius: 99, transition: "background 0.2s",
                      }} />
                      <span style={{
                        position: "absolute", top: 3,
                        left: p.can_send ? 22 : 3,
                        width: 18, height: 18, background: "#fff",
                        borderRadius: "50%", transition: "left 0.2s",
                      }} />
                    </label>
                  </div>

                  {/* Priority badge */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={p.max_priority}
                      onChange={(e) => update(p.role, { max_priority: e.target.value as Priority })}
                      disabled={pending}
                      style={{
                        padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: `${PRIORITY_COLOR[p.max_priority]}22`,
                        color: PRIORITY_COLOR[p.max_priority],
                        border: `1px solid ${PRIORITY_COLOR[p.max_priority]}44`,
                        cursor: "pointer", outline: "none",
                      }}
                    >
                      {PRIORITIES.map((pr) => (
                        <option key={pr} value={pr} style={{ background: "#0A0E1A", color: "#E8EDF5" }}>
                          {pr.charAt(0).toUpperCase() + pr.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Expand chevron */}
                  <span style={{ color: "#5A6478", fontSize: 14, userSelect: "none", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                </div>

                {/* Expandable audience section */}
                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <p style={{ fontSize: 11, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 8px" }}>
                      Allowed audiences
                    </p>
                    <div className="ann-audience-wrap">
                      {AUDIENCE_TYPES.map((a) => {
                        const has = p.allowed_audiences.includes(a);
                        return (
                          <button
                            key={a}
                            onClick={() => update(p.role, {
                              allowed_audiences: has
                                ? p.allowed_audiences.filter((x) => x !== a)
                                : [...p.allowed_audiences, a],
                            })}
                            disabled={pending}
                            style={{
                              padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700,
                              cursor: "pointer", border: "none", transition: "all 0.15s",
                              background: has ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.05)",
                              color: has ? "#1E88E5" : "#5A6478",
                            }}
                          >
                            {has ? "✓ " : ""}{a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {anns.length === 0 && (
            <div style={{
              padding: "40px 24px", textAlign: "center", color: "#8892A4",
              background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12,
            }}>
              No announcements yet.
            </div>
          )}
          {anns.map((a) => {
            const pc = PRIORITY_COLOR[a.priority] || "#8892A4";
            return (
              <div key={a.id} style={{
                background: "#111827",
                border: `1px solid ${pc}22`,
                borderLeft: `4px solid ${pc}`,
                borderRadius: 12, padding: 14,
              }}>
                {/* Title + priority + status */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#E8EDF5", wordBreak: "break-word" }}>{a.title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#8892A4" }}>
                      {a.priority} · {a.audience_type}
                      {a.sender ? ` · ${a.sender.name} (${a.sender.role})` : ""}
                      {" · "}{new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span style={{
                    flexShrink: 0, padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                    textTransform: "uppercase",
                    background: a.status === "published" ? "rgba(102,187,106,0.15)" : "rgba(136,146,164,0.15)",
                    color: a.status === "published" ? "#66BB6A" : "#8892A4",
                  }}>
                    {a.status}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/announcements/${a.id}`} style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: 700,
                    background: "rgba(255,255,255,0.06)", color: "#8892A4",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                    textDecoration: "none",
                  }}>
                    View
                  </Link>
                  {a.status === "published" && (
                    <button onClick={() => onDelete(a.id)} disabled={pending} style={{
                      padding: "6px 14px", fontSize: 12, fontWeight: 700,
                      background: "rgba(239,83,80,0.08)", color: "#EF5350",
                      border: "1px solid rgba(239,83,80,0.25)", borderRadius: 8,
                      cursor: "pointer",
                    }}>
                      Archive
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
