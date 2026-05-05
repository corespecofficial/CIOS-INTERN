"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AdminUserRow, ScopedOrg } from "./page";

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
  // "member" is the scoped-view fallback — see admin/users/page.tsx
  // where non-super_admin viewers get the platform role masked so we
  // never leak "this person is super_admin elsewhere."
  member:      { label: "Member",      color: "#26A69A" },
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

function isSuspended(u: AdminUserRow) {
  return u.status === "suspended" || u.status === "banned";
}

export default function AdminUsersClient({ users, myOrgs }: { users: AdminUserRow[]; myOrgs: ScopedOrg[] | null }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "suspended">("all");
  const [filterOrg, setFilterOrg] = useState<string>("all");

  // myOrgs === null means the requester is super_admin viewing platform-wide.
  // myOrgs.length > 0 means an org owner/admin viewing only their orgs.
  const isOrgScoped = myOrgs !== null;

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    const matchRole = filterRole === "all" || u.role === filterRole;
    const suspended = isSuspended(u);
    const matchStatus = filterStatus === "all" || (filterStatus === "suspended" ? suspended : !suspended);
    const matchOrg = filterOrg === "all" || (u.orgs || []).some((o) => o.org_id === filterOrg);
    return matchSearch && matchRole && matchStatus && matchOrg;
  });

  const totalInterns = users.filter(u => u.role === "intern").length;
  const totalSuspended = users.filter(u => isSuspended(u)).length;
  const totalActive = users.filter(u => !isSuspended(u)).length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        .au-table-wrap { display: block; }
        .au-cards-wrap { display: none; }
        @media (max-width: 640px) {
          .au-table-wrap { display: none; }
          .au-cards-wrap { display: flex; flex-direction: column; gap: 10px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          display: "inline-block", padding: "3px 12px",
          background: "rgba(171,71,188,0.15)", color: "#AB47BC",
          fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 8,
        }}>USER MANAGEMENT</span>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>
          {isOrgScoped ? "Members in your orgs" : "All Users"}
        </h1>
        <p style={{ color: "#6B7280", fontSize: 13, margin: 0 }}>
          {users.length} users · {totalInterns} interns · {totalActive} active · {totalSuspended} suspended
          {isOrgScoped && myOrgs && myOrgs.length > 0 && (
            <> · scoped to {myOrgs.length} org{myOrgs.length === 1 ? "" : "s"}</>
          )}
        </p>
      </div>

      {/* Stats 2×2 on mobile, 4×1 on desktop */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
        <style>{`@media (min-width: 641px) { .au-stats { grid-template-columns: repeat(4, 1fr) !important; } }`}</style>
        {[
          { label: "Total Users",  value: users.length,     color: "#1E88E5" },
          { label: "Interns",      value: totalInterns,     color: "#AB47BC" },
          { label: "Active",       value: totalActive,      color: "#66BB6A" },
          { label: "Suspended",    value: totalSuspended,   color: "#EF5350" },
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
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 160, background: "#111827",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
            padding: "9px 12px", color: "#E8EDF5", fontSize: 13, outline: "none",
          }}
        />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#E8EDF5", fontSize: 12, cursor: "pointer", outline: "none" }}>
          {ROLES_FILTER.map(r => (
            <option key={r} value={r}>{r === "all" ? "All roles" : getRoleMeta(r).label}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as "all" | "active" | "suspended")}
          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#E8EDF5", fontSize: 12, cursor: "pointer", outline: "none" }}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        {isOrgScoped && myOrgs && myOrgs.length > 1 && (
          <select value={filterOrg} onChange={e => setFilterOrg(e.target.value)}
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#E8EDF5", fontSize: 12, cursor: "pointer", outline: "none" }}>
            <option value="all">All my orgs</option>
            {myOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="au-table-wrap">
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    "User",
                    "Role",
                    ...(isOrgScoped ? ["Org membership"] : []),
                    "XP / Level",
                    "Performance",
                    "Last Seen",
                    "Status",
                  ].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6B7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={isOrgScoped ? 7 : 6} style={{ padding: "32px 16px", textAlign: "center", color: "#4B5563" }}>No users match</td></tr>
                ) : filtered.map((u) => {
                  const rm = getRoleMeta(u.role);
                  const suspended = isSuspended(u);
                  const perf = u.performance ?? 0;
                  return (
                    <tr key={u.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt="" width={32} height={32} style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, aspectRatio: "1 / 1" }} />
                            : <div style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: "50%", flexShrink: 0, aspectRatio: "1 / 1", background: `${rm.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: rm.color }}>{(u.name || u.email || "?")[0].toUpperCase()}</div>
                          }
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{u.name || "Unnamed"}</div>
                            <div style={{ fontSize: 11, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{u.email || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: `${rm.color}18`, color: rm.color }}>{rm.label}</span>
                      </td>
                      {isOrgScoped && (
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {(u.orgs || []).length === 0 ? (
                              <span style={{ fontSize: 11, color: "#5A6478", fontStyle: "italic" }}>—</span>
                            ) : (
                              (u.orgs || []).slice(0, 3).map((o) => (
                                <Link
                                  key={o.org_id}
                                  href={`/o/${o.org_slug}/members`}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 11,
                                    color: "#26A69A",
                                    background: "rgba(38,166,154,0.10)",
                                    border: "1px solid rgba(38,166,154,0.25)",
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    textDecoration: "none",
                                    whiteSpace: "nowrap",
                                    maxWidth: 240,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                  title={`Manage ${o.role} role in ${o.org_name}`}
                                >
                                  <strong style={{ color: "#E8EDF5" }}>{o.org_name}</strong>
                                  <span style={{ opacity: 0.7 }}>· {o.role}</span>
                                </Link>
                              ))
                            )}
                            {(u.orgs || []).length > 3 && (
                              <span style={{ fontSize: 10, color: "#5A6478" }}>+ {((u.orgs || []).length - 3)} more</span>
                            )}
                          </div>
                        </td>
                      )}
                      <td style={{ padding: "12px 16px", color: "#FFC107", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {(u.xp ?? 0).toLocaleString()} XP · Lv {u.level}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 999, width: `${Math.min(100, perf)}%`, background: perf >= 70 ? "#66BB6A" : perf >= 40 ? "#FFC107" : "#EF5350" }} />
                          </div>
                          <span style={{ fontSize: 12, color: "#9CA3AF" }}>{perf}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#6B7280", whiteSpace: "nowrap", fontSize: 12 }}>
                        {formatDate(u.last_seen || u.created_at)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: suspended ? "rgba(239,83,80,0.15)" : "rgba(102,187,106,0.15)", color: suspended ? "#EF5350" : "#66BB6A" }}>
                          {suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "10px 16px", color: "#4B5563", fontSize: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
            Showing {filtered.length} of {users.length} · Full role management: Super Admin → Manage Users
          </div>
        </div>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="au-cards-wrap">
        {filtered.length === 0 && (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#4B5563", background: "#111827", borderRadius: 12, fontSize: 13 }}>
            No users match
          </div>
        )}
        {filtered.map((u) => {
          const rm = getRoleMeta(u.role);
          const suspended = isSuspended(u);
          const perf = u.performance ?? 0;
          return (
            <div key={u.id}
              style={{
                background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "14px 16px",
              }}
            >
              {/* Avatar + name + role */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `${rm.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: rm.color }}>{(u.name || u.email || "?")[0].toUpperCase()}</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#E8EDF5", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || "Unnamed"}</div>
                  <div style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || "—"}</div>
                </div>
                <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: `${rm.color}18`, color: rm.color }}>{rm.label}</span>
              </div>

              {/* Stats row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div style={{ background: "rgba(255,193,7,0.07)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#FFC107" }}>{(u.xp ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>XP</div>
                </div>
                <div style={{ background: "rgba(30,136,229,0.07)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#1E88E5" }}>Lv {u.level}</div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>Level</div>
                </div>
                <div style={{ background: perf >= 70 ? "rgba(102,187,106,0.07)" : perf >= 40 ? "rgba(255,193,7,0.07)" : "rgba(239,83,80,0.07)", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: perf >= 70 ? "#66BB6A" : perf >= 40 ? "#FFC107" : "#EF5350" }}>{perf}%</div>
                  <div style={{ fontSize: 10, color: "#6B7280" }}>Perf.</div>
                </div>
              </div>

              {/* Last seen + status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>Last seen: {formatDate(u.last_seen || u.created_at)}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: suspended ? "rgba(239,83,80,0.15)" : "rgba(102,187,106,0.15)", color: suspended ? "#EF5350" : "#66BB6A" }}>
                  {suspended ? "Suspended" : "Active"}
                </span>
              </div>
            </div>
          );
        })}
        <div style={{ padding: "10px 0", color: "#4B5563", fontSize: 12, textAlign: "center" }}>
          {filtered.length} of {users.length} users shown
        </div>
      </div>
    </div>
  );
}
