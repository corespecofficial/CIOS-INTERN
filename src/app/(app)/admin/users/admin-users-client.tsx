"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { AdminUserRow } from "./page";

const ROLE_META: Record<string, { label: string; color: string }> = {
  intern:      { label: "Intern",      color: "#1E88E5" },
  team_lead:   { label: "Team Lead",   color: "#66BB6A" },
  admin:       { label: "Admin",       color: "#AB47BC" },
  super_admin: { label: "Super Admin", color: "#EF5350" },
  instructor:  { label: "Instructor",  color: "#FFC107" },
  moderator:   { label: "Moderator",   color: "#FF7043" },
  finance:     { label: "Finance",     color: "#43A047" },
  support:     { label: "Support",     color: "#26C6DA" },
  recruiter:   { label: "Recruiter",   color: "#9C27B0" },
  mentor:      { label: "Mentor",      color: "#00BCD4" },
  alumni:      { label: "Alumni",      color: "#8D6E63" },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] ?? { label: role, color: "#8892A4" };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const ROLES_FILTER = ["all", "intern", "team_lead", "admin", "super_admin", "instructor", "moderator", "finance", "support", "recruiter", "mentor", "alumni"];

export default function AdminUsersClient({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all" || (filterStatus === "suspended" ? u.is_suspended : !u.is_suspended);
    return matchSearch && matchRole && matchStatus;
  });

  const totalInterns = users.filter(u => u.role === "intern").length;
  const totalSuspended = users.filter(u => u.is_suspended).length;
  const totalActive = users.filter(u => !u.is_suspended).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: "inline-block", padding: "3px 12px",
          background: "rgba(171,71,188,0.15)", color: "#AB47BC",
          fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 8,
        }}>USER MANAGEMENT</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>
          All Users
        </h1>
        <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>
          {users.length} users total · {totalInterns} interns · {totalActive} active · {totalSuspended} suspended
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Users", value: users.length, color: "#1E88E5" },
          { label: "Interns", value: totalInterns, color: "#AB47BC" },
          { label: "Active", value: totalActive, color: "#66BB6A" },
          { label: "Suspended", value: totalSuspended, color: "#EF5350" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, background: "#111827",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
            padding: "9px 14px", color: "#E8EDF5", fontSize: 13,
            outline: "none",
          }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{
            background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "9px 14px", color: "#E8EDF5",
            fontSize: 13, cursor: "pointer", outline: "none",
          }}
        >
          {ROLES_FILTER.map(r => (
            <option key={r} value={r}>{r === "all" ? "All roles" : getRoleMeta(r).label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as "all" | "active" | "suspended")}
          style={{
            background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: "9px 14px", color: "#E8EDF5",
            fontSize: 13, cursor: "pointer", outline: "none",
          }}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["User", "Role", "XP / Level", "Performance", "Last Active", "Status"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left",
                    color: "#6B7280", fontWeight: 700, fontSize: 11,
                    textTransform: "uppercase", letterSpacing: 0.6,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "#4B5563" }}>
                    No users match your filters
                  </td>
                </tr>
              ) : filtered.map((u) => {
                const rm = getRoleMeta(u.role);
                return (
                  <tr
                    key={u.id}
                    onClick={() => router.push(`/super-admin/users`)}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* User */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" width={32} height={32}
                            style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: `${rm.color}22`, display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 13, fontWeight: 700, color: rm.color,
                          }}>
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                            {u.name || "Unnamed"}
                          </div>
                          <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>
                            {u.email || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: `${rm.color}18`, color: rm.color,
                      }}>{rm.label}</span>
                    </td>
                    {/* XP/Level */}
                    <td style={{ padding: "12px 16px", color: "#FFC107", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {(u.xp ?? 0).toLocaleString()} XP · Lv {u.level ?? 1}
                    </td>
                    {/* Performance */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 999,
                            width: `${Math.min(100, u.performance ?? 0)}%`,
                            background: (u.performance ?? 0) >= 70 ? "#66BB6A" : (u.performance ?? 0) >= 40 ? "#FFC107" : "#EF5350",
                          }} />
                        </div>
                        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{u.performance ?? 0}%</span>
                      </div>
                    </td>
                    {/* Last Active */}
                    <td style={{ padding: "12px 16px", color: "#6B7280", whiteSpace: "nowrap" }}>
                      {formatDate(u.last_active_at || u.created_at)}
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                        background: u.is_suspended ? "rgba(239,83,80,0.15)" : "rgba(102,187,106,0.15)",
                        color: u.is_suspended ? "#EF5350" : "#66BB6A",
                      }}>
                        {u.is_suspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", color: "#4B5563", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          Showing {filtered.length} of {users.length} users · For full role management, use Super Admin → Manage Users
        </div>
      </div>
    </div>
  );
}
