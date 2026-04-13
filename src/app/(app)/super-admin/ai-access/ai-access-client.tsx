"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { grantAIAccess, revokeAIAccess, bulkGrantByRole } from "@/app/actions/ai-access";
import type { AIToolId } from "@/lib/ai-access";

interface User { id: string; name: string; email: string; avatar_url: string | null; role: string }
interface Perm { user_id: string; tool_id: string; daily_token_cap: number; expires_at: string | null; revoked_at: string | null }
interface Tool { id: string; label: string; description: string }

export function AIAccessClient({ initialOverview }: { initialOverview: { users: User[]; perms: Perm[]; tools: Tool[] } }) {
  const [users] = useState(initialOverview.users);
  const [perms, setPerms] = useState(initialOverview.perms);
  const [tools] = useState(initialOverview.tools);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pending, start] = useTransition();

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const permsByUser = useMemo(() => {
    const m = new Map<string, Map<string, Perm>>();
    for (const p of perms) {
      if (!m.has(p.user_id)) m.set(p.user_id, new Map());
      m.get(p.user_id)!.set(p.tool_id, p);
    }
    return m;
  }, [perms]);

  const countFor = (userId: string) => {
    const map = permsByUser.get(userId);
    if (!map) return 0;
    return Array.from(map.values()).filter((p) => !p.revoked_at).length;
  };

  const toggle = (userId: string, toolId: AIToolId, on: boolean, cap: number, expiresAt: string | null) => start(async () => {
    if (on) {
      const res = await grantAIAccess(userId, toolId, cap, expiresAt);
      if (!res.ok) return toast.error(res.error);
      setPerms((prev) => {
        const rest = prev.filter((p) => !(p.user_id === userId && p.tool_id === toolId));
        return [...rest, { user_id: userId, tool_id: toolId, daily_token_cap: cap, expires_at: expiresAt, revoked_at: null }];
      });
      toast.success("Access granted");
    } else {
      const res = await revokeAIAccess(userId, toolId);
      if (!res.ok) return toast.error(res.error);
      setPerms((prev) => prev.map((p) => (p.user_id === userId && p.tool_id === toolId) ? { ...p, revoked_at: new Date().toISOString() } : p));
      toast.success("Access revoked");
    }
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>AI ACCESS CONTROL</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>✨ Who can use AI Tools</h1>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "2px 0 0 0" }}>Grant per-user or role-level access · set daily token caps · expiry dates</p>
      </div>

      <BulkGrant tools={tools} pending={pending} onGrant={(role, toolId, cap) => start(async () => {
        const res = await bulkGrantByRole(role, toolId as AIToolId, cap);
        if (res.ok) toast.success(`Granted to ${res.data?.count || 0} users — refresh to see`);
        else toast.error(res.error);
      })} />

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, marginTop: 16 }}>
        {/* User list */}
        <aside style={panel}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" style={{ ...input, width: "100%", marginBottom: 10 }} />
          <div style={{ maxHeight: 600, overflowY: "auto" }}>
            {filteredUsers.map((u) => (
              <button key={u.id} onClick={() => setSelectedUser(u)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                background: selectedUser?.id === u.id ? "rgba(171,71,188,0.15)" : "transparent",
                border: "none", cursor: "pointer", textAlign: "left", marginBottom: 4, color: "#E8EDF5",
              }}>
                {u.avatar_url
                  ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1E88E5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{u.name.slice(0, 1)}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.role} · {u.email}</div>
                </div>
                <span style={{ fontSize: 10, color: countFor(u.id) > 0 ? "#66BB6A" : "#5A6478", fontWeight: 700 }}>{countFor(u.id)}/{tools.length}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section style={panel}>
          {!selectedUser && <div style={{ padding: 40, textAlign: "center", color: "#8892A4" }}>Select a user from the left to manage their AI tool access.</div>}
          {selectedUser && (
            <UserDetail user={selectedUser} tools={tools} perms={permsByUser.get(selectedUser.id) || new Map()} pending={pending} onToggle={toggle} />
          )}
        </section>
      </div>
    </div>
  );
}

function UserDetail({ user, tools, perms, pending, onToggle }: { user: User; tools: Tool[]; perms: Map<string, Perm>; pending: boolean; onToggle: (u: string, t: AIToolId, on: boolean, cap: number, exp: string | null) => void }) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>{user.name}</h2>
      <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16, textTransform: "capitalize" }}>{user.role.replace("_", " ")} · {user.email}</div>

      {tools.map((t) => {
        const p = perms.get(t.id);
        const active = !!p && !p.revoked_at;
        return <ToolRow key={t.id} tool={t} perm={p} active={active} pending={pending} onToggle={(on, cap, exp) => onToggle(user.id, t.id as AIToolId, on, cap, exp)} />;
      })}
    </div>
  );
}

function ToolRow({ tool, perm, active, pending, onToggle }: { tool: Tool; perm: Perm | undefined; active: boolean; pending: boolean; onToggle: (on: boolean, cap: number, exp: string | null) => void }) {
  const [cap, setCap] = useState(perm?.daily_token_cap || 50000);
  const [exp, setExp] = useState(perm?.expires_at ? perm.expires_at.slice(0, 10) : "");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, flexShrink: 0 }}>
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked, cap, exp || null)} disabled={pending} style={{ display: "none" }} />
        <span style={{ position: "absolute", inset: 0, background: active ? "#AB47BC" : "rgba(255,255,255,0.12)", borderRadius: 99, transition: "background 0.2s" }} />
        <span style={{ position: "absolute", top: 2, left: active ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
      </label>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{tool.label}</div>
        <div style={{ fontSize: 11, color: "#8892A4" }}>{tool.description}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={miniLbl}>Daily tokens</label>
        <input type="number" value={cap} onChange={(e) => setCap(parseInt(e.target.value) || 0)}
          onBlur={() => { if (active) onToggle(true, cap, exp || null); }}
          style={{ ...input, width: 100 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={miniLbl}>Expires (optional)</label>
        <input type="date" value={exp} onChange={(e) => setExp(e.target.value)}
          onBlur={() => { if (active) onToggle(true, cap, exp || null); }}
          style={{ ...input, width: 140 }} />
      </div>
    </div>
  );
}

function BulkGrant({ tools, pending, onGrant }: { tools: Tool[]; pending: boolean; onGrant: (role: string, toolId: string, cap: number) => void }) {
  const [role, setRole] = useState("intern");
  const [toolId, setToolId] = useState(tools[0]?.id || "chat");
  const [cap, setCap] = useState(50000);
  return (
    <div style={{ ...panel, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginRight: 6 }}>Bulk grant:</span>
      <select value={role} onChange={(e) => setRole(e.target.value)} style={input}>
        <option value="intern">All interns</option>
        <option value="team_lead">All team leads</option>
        <option value="instructor">All instructors</option>
        <option value="admin">All admins</option>
      </select>
      <select value={toolId} onChange={(e) => setToolId(e.target.value)} style={input}>
        {tools.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <input type="number" value={cap} onChange={(e) => setCap(parseInt(e.target.value) || 0)} style={{ ...input, width: 120 }} placeholder="tokens/day" />
      <button onClick={() => onGrant(role, toolId, cap)} disabled={pending} style={btnPrimary}>Grant to all</button>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 };
const input: React.CSSProperties = { padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
const miniLbl: React.CSSProperties = { fontSize: 9, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" };
const btnPrimary: React.CSSProperties = { padding: "8px 16px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
