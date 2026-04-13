"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  updateUserRole,
  inviteUser,
  setUserBan,
  deleteUser,
  revokeInvitation,
  type UserListItem,
  type PendingInvitation,
  type Role,
} from "@/app/actions/users";

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: "intern", label: "Intern", color: "#1E88E5" },
  { value: "team_lead", label: "Team Lead", color: "#66BB6A" },
  { value: "admin", label: "Admin", color: "#AB47BC" },
  { value: "super_admin", label: "Super Admin", color: "#EF5350" },
  { value: "instructor", label: "Instructor", color: "#FFC107" },
  { value: "moderator", label: "Moderator", color: "#FF7043" },
  { value: "finance", label: "Finance", color: "#43A047" },
  { value: "support", label: "Support", color: "#26C6DA" },
];

function getRoleMeta(role: Role) {
  return ROLES.find(r => r.value === role) || ROLES[0];
}

function formatDate(ts: number | null | undefined): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

interface Props {
  initialUsers: UserListItem[];
  initialInvitations: PendingInvitation[];
}

export function UserManagementClient({ initialUsers, initialInvitations }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [users] = useState(initialUsers);
  const [invitations] = useState(initialInvitations);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<Role | "all">("all");

  const refresh = () => startTransition(() => router.refresh());

  const filtered = users.filter(u => {
    const matchesSearch = !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = async (userId: string, newRole: Role) => {
    const t = toast.loading("Updating role...");
    const res = await updateUserRole(userId, newRole);
    if (res.ok) {
      toast.success(`Role updated to ${getRoleMeta(newRole).label}`, { id: t });
      refresh();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const handleBan = async (userId: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? "Unbanning" : "Banning";
    const t = toast.loading(`${action} user...`);
    const res = await setUserBan(userId, !currentlyBanned);
    if (res.ok) {
      toast.success(`User ${currentlyBanned ? "unbanned" : "banned"}`, { id: t });
      refresh();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const t = toast.loading("Deleting user...");
    const res = await deleteUser(userId);
    if (res.ok) {
      toast.success("User deleted", { id: t });
      refresh();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    if (!confirm(`Revoke invitation for ${email}?`)) return;
    const t = toast.loading("Revoking invitation...");
    const res = await revokeInvitation(inviteId);
    if (res.ok) {
      toast.success("Invitation revoked", { id: t });
      refresh();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(239,83,80,0.12), rgba(171,71,188,0.08))",
        border: "1px solid rgba(239,83,80,0.2)",
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1 }}>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(239,83,80,0.2)", color: "#EF5350", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
            SUPER ADMIN
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "2px 0 2px 0" }}>User Management</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
            {users.length} users · {invitations.length} pending invitations
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          style={{
            background: "linear-gradient(135deg, #1E88E5, #1565C0)",
            color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 20px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 16px rgba(30,136,229,0.3)",
          }}
        >+ Invite User</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 240,
            padding: "9px 14px", borderRadius: 10,
            background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
            color: "#E8EDF5", fontSize: 13, outline: "none",
          }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value as Role | "all")}
          style={{
            padding: "9px 14px", borderRadius: 10,
            background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
            color: "#E8EDF5", fontSize: 13, cursor: "pointer", outline: "none",
          }}
        >
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 14, padding: 18, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFC107", marginBottom: 12 }}>
            📧 Pending Invitations ({invitations.length})
          </h3>
          {invitations.map(inv => {
            const meta = getRoleMeta(inv.role);
            return (
              <div key={inv.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", background: "rgba(255,193,7,0.04)",
                borderRadius: 10, marginBottom: 8, gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{inv.email}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
                    Invited as <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}</span> · {formatDate(inv.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeInvite(inv.id, inv.email)}
                  style={{
                    background: "transparent", border: "1px solid rgba(239,83,80,0.3)",
                    color: "#EF5350", borderRadius: 8, padding: "6px 12px",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >Revoke</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Users Table */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{
          display: "grid", gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr 1.5fr",
          padding: "12px 20px", background: "rgba(255,255,255,0.03)",
          fontSize: 11, fontWeight: 700, color: "#8892A4",
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>User</div>
          <div>Role</div>
          <div>Status</div>
          <div>Last Active</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#8892A4" }}>
            No users found
          </div>
        ) : filtered.map(u => {
          const meta = getRoleMeta(u.role);
          const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
          return (
            <div key={u.id} style={{
              display: "grid", gridTemplateColumns: "2.5fr 1.5fr 1fr 1fr 1.5fr",
              padding: "14px 20px", alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              fontSize: 13,
            }}>
              {/* User */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                {u.imageUrl ? (
                  <img src={u.imageUrl} alt={displayName} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${meta.color}, ${meta.color}99)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif",
                  }}>
                    {(u.firstName[0] || u.email[0] || "U").toUpperCase()}
                    {(u.lastName[0] || u.email[1] || "").toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#E8EDF5", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
                  <div style={{ color: "#8892A4", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                </div>
              </div>

              {/* Role dropdown */}
              <div>
                <select
                  value={u.role}
                  onChange={e => handleRoleChange(u.id, e.target.value as Role)}
                  style={{
                    padding: "5px 10px", borderRadius: 6,
                    background: `${meta.color}22`, color: meta.color,
                    border: `1px solid ${meta.color}44`, fontSize: 11, fontWeight: 700,
                    cursor: "pointer", outline: "none",
                  }}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                {u.banned ? (
                  <span style={{ background: "rgba(239,83,80,0.15)", color: "#EF5350", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Banned</span>
                ) : (
                  <span style={{ background: "rgba(102,187,106,0.15)", color: "#66BB6A", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Active</span>
                )}
              </div>

              {/* Last Active */}
              <div style={{ color: "#8892A4", fontSize: 12 }}>
                {formatDate(u.lastSignInAt)}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  onClick={() => handleBan(u.id, u.banned)}
                  style={{
                    background: u.banned ? "rgba(102,187,106,0.12)" : "rgba(255,193,7,0.12)",
                    color: u.banned ? "#66BB6A" : "#FFC107",
                    border: `1px solid ${u.banned ? "rgba(102,187,106,0.3)" : "rgba(255,193,7,0.3)"}`,
                    borderRadius: 6, padding: "5px 10px",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >{u.banned ? "Unban" : "Ban"}</button>
                <button
                  onClick={() => handleDelete(u.id, displayName)}
                  style={{
                    background: "rgba(239,83,80,0.1)", color: "#EF5350",
                    border: "1px solid rgba(239,83,80,0.3)", borderRadius: 6,
                    padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}
                >Delete</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invite Modal */}
      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onInvited={() => { setInviteOpen(false); refresh(); }}
        />
      )}
    </div>
  );
}

/* ── Invite Modal ── */
function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) { toast.error("Email is required"); return; }
    if (!email.includes("@")) { toast.error("Invalid email address"); return; }
    setSending(true);
    const t = toast.loading(`Sending invitation to ${email}...`);
    const res = await inviteUser(email.trim(), role);
    setSending(false);
    if (res.ok) {
      toast.success(`Invitation sent to ${email}! 📧`, { id: t });
      onInvited();
    } else {
      toast.error(res.error, { id: t });
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20, backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16, padding: 28, width: "100%", maxWidth: 440,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>
          Invite New User
        </h2>
        <p style={{ fontSize: 13, color: "#8892A4", marginBottom: 24 }}>
          An email invitation will be sent. They&apos;ll be assigned the selected role when they accept.
        </p>

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="newuser@gmail.com"
          disabled={sending}
          autoFocus
          style={{
            width: "100%", padding: "11px 14px", marginBottom: 18,
            background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, color: "#E8EDF5", fontSize: 14, outline: "none",
          }}
        />

        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
          Assign Role
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
          {ROLES.filter(r => r.value !== "super_admin").map(r => (
            <button
              key={r.value}
              onClick={() => setRole(r.value)}
              disabled={sending}
              style={{
                padding: "10px 14px", borderRadius: 10,
                background: role === r.value ? `${r.color}22` : "transparent",
                color: role === r.value ? r.color : "#8892A4",
                border: `1px solid ${role === r.value ? `${r.color}66` : "rgba(255,255,255,0.1)"}`,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                textAlign: "left", transition: "all 0.15s",
              }}
            >{r.label}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: "10px 20px", borderRadius: 10,
              background: "transparent", color: "#8892A4",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{
              padding: "10px 20px", borderRadius: 10,
              background: sending ? "rgba(30,136,229,0.3)" : "linear-gradient(135deg, #1E88E5, #1565C0)",
              color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700,
              cursor: sending ? "not-allowed" : "pointer",
              boxShadow: "0 4px 16px rgba(30,136,229,0.3)",
            }}
          >{sending ? "Sending..." : "Send Invitation"}</button>
        </div>
      </div>
    </div>
  );
}
