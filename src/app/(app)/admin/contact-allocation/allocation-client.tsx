"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { allocateContact, revokeContact, reviewContactRequest, bulkAllocateByRole } from "@/app/actions/messaging-privacy";

interface User { id: string; name: string; email: string; role: string; intern_id: string | null; avatar_url: string | null }
interface Perm { user_a: string; user_b: string; granted_at: string; source: string; note: string | null }

export function AllocationClient({ users, perms, requests }: { users: User[]; perms: Perm[]; requests: Array<Record<string, unknown>> }) {
  const [tab, setTab] = useState<"allocate" | "existing" | "requests">("requests");
  const [search, setSearch] = useState("");
  const [userA, setUserA] = useState<string>("");
  const [userB, setUserB] = useState<string>("");
  const [bulkRole, setBulkRole] = useState<string>("");
  const [pending, start] = useTransition();
  const [revokeConfirm, setRevokeConfirm] = useState<{ a: string; b: string } | null>(null);
  const [reviewing, setReviewing] = useState<{ id: string; approve: boolean } | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.intern_id || "").toLowerCase().includes(q));
  }, [users, search]);

  const doAllocate = () => start(async () => {
    if (!userA || !userB) return toast.error("Pick two users");
    const res = await allocateContact(userA, userB);
    if (!res.ok) return toast.error(res.error);
    toast.success("Pair allocated");
    setUserA(""); setUserB("");
    setTimeout(() => window.location.reload(), 400);
  });

  const doBulk = () => start(async () => {
    if (!userA || !bulkRole) return toast.error("Pick user and role");
    const res = await bulkAllocateByRole(userA, bulkRole);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Allocated to ${res.data?.count || 0} ${bulkRole}s`);
    setTimeout(() => window.location.reload(), 400);
  });

  const doRevoke = (a: string, b: string) => start(async () => {
    const res = await revokeContact(a, b);
    if (!res.ok) return toast.error(res.error);
    toast.success("Revoked");
    setRevokeConfirm(null);
    setTimeout(() => window.location.reload(), 300);
  });

  const doReview = () => start(async () => {
    if (!reviewing) return;
    const res = await reviewContactRequest(reviewing.id, reviewing.approve, adminNote);
    if (!res.ok) return toast.error(res.error);
    toast.success(reviewing.approve ? "Approved" : "Rejected");
    setReviewing(null); setAdminNote("");
    setTimeout(() => window.location.reload(), 400);
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>CONTACT ALLOCATION</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔗 Who can message whom</h1>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Assign contact pairs, review requests, revoke access</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        {[{ k: "requests", label: `📨 Requests (${requests.length})` }, { k: "allocate", label: "🔗 Allocate" }, { k: "existing", label: `🗂 Existing (${perms.length})` }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as "allocate" | "existing" | "requests")} style={{
            flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(30,136,229,0.15)" : "transparent",
            color: tab === t.k ? "#1E88E5" : "#8892A4", border: "none",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "requests" && (
        <div style={{ display: "grid", gap: 8 }}>
          {requests.length === 0 && <Empty>No pending requests.</Empty>}
          {requests.map((r) => {
            const req = r.requester as { name: string; intern_id: string; role: string } | null;
            const tgt = r.target as { name: string; intern_id: string; role: string } | null;
            return (
              <div key={r.id as string} style={{ background: "#111827", border: "1px solid rgba(255,193,7,0.25)", borderLeft: "4px solid #FFC107", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>
                    {req?.name} <span style={{ fontFamily: "monospace", color: "#1E88E5" }}>({req?.intern_id})</span> → {tgt?.name} <span style={{ fontFamily: "monospace", color: "#AB47BC" }}>({tgt?.intern_id})</span>
                  </div>
                  {r.reason ? <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>{r.reason as string}</div> : null}
                  <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4 }}>{new Date(r.created_at as string).toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setReviewing({ id: r.id as string, approve: true })} disabled={pending} style={btnSuccess}>✓ Approve</button>
                  <button onClick={() => setReviewing({ id: r.id as string, approve: false })} disabled={pending} style={btnDanger}>✕ Reject</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "allocate" && (
        <div style={panel}>
          <h2 style={sectionH}>🔗 Allocate pair (user ↔ user)</h2>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 12px 0" }}>Both users will be able to message each other after allocation.</p>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search users by name, email, intern ID…" style={input} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
            <UserPicker label="User A" users={filteredUsers} value={userA} onChange={setUserA} />
            <UserPicker label="User B" users={filteredUsers} value={userB} onChange={setUserB} />
          </div>
          <button onClick={doAllocate} disabled={pending || !userA || !userB} style={{ ...btnPrimary, marginTop: 10 }}>{pending ? "Allocating…" : "Allocate pair"}</button>

          <h3 style={{ ...sectionH, marginTop: 24 }}>⚡ Bulk allocate</h3>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 10px 0" }}>Link <strong style={{ color: "#E8EDF5" }}>User A</strong> above to every user of a given role.</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={bulkRole} onChange={(e) => setBulkRole(e.target.value)} style={{ ...input, flex: 1, marginBottom: 0 }}>
              <option value="">Select role…</option>
              {["intern", "team_lead", "instructor", "admin", "moderator", "finance", "support"].map((r) => <option key={r} value={r}>All {r}s</option>)}
            </select>
            <button onClick={doBulk} disabled={pending || !userA || !bulkRole} style={btnPrimary}>Bulk allocate</button>
          </div>
        </div>
      )}

      {tab === "existing" && (
        <div style={{ display: "grid", gap: 8 }}>
          {perms.length === 0 && <Empty>No active contact pairs yet.</Empty>}
          {perms.map((p) => {
            const a = byId.get(p.user_a);
            const b = byId.get(p.user_b);
            return (
              <div key={`${p.user_a}:${p.user_b}`} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "#E8EDF5" }}>
                  <strong>{a?.name || "Unknown"}</strong> <span style={{ fontSize: 11, color: "#8892A4", fontFamily: "monospace" }}>({a?.intern_id})</span> ↔ <strong>{b?.name || "Unknown"}</strong> <span style={{ fontSize: 11, color: "#8892A4", fontFamily: "monospace" }}>({b?.intern_id})</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(136,146,164,0.15)", color: "#8892A4" }}>{p.source}</span>
                  <button onClick={() => setRevokeConfirm({ a: p.user_a, b: p.user_b })} disabled={pending} style={btnDanger}>Revoke</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {revokeConfirm && (
        <div style={modalBack} onClick={(e) => e.target === e.currentTarget && setRevokeConfirm(null)}>
          <div style={modalPanel}>
            <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 10px 0", fontWeight: 800 }}>Revoke contact pair?</h2>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 14px 0" }}>These two users will no longer be able to message each other. This is audit-logged.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setRevokeConfirm(null)} style={btnGhost}>Cancel</button>
              <button onClick={() => doRevoke(revokeConfirm.a, revokeConfirm.b)} disabled={pending} style={btnDanger}>Revoke</button>
            </div>
          </div>
        </div>
      )}

      {reviewing && (
        <div style={modalBack} onClick={(e) => e.target === e.currentTarget && setReviewing(null)}>
          <div style={modalPanel}>
            <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 10px 0", fontWeight: 800 }}>{reviewing.approve ? "Approve request?" : "Reject request?"}</h2>
            <label style={lbl}>Note to requester (optional)</label>
            <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={3} style={{ ...input, fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
              <button onClick={() => setReviewing(null)} style={btnGhost}>Cancel</button>
              <button onClick={doReview} disabled={pending} style={reviewing.approve ? btnSuccess : btnDanger}>{pending ? "…" : reviewing.approve ? "Approve" : "Reject"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserPicker({ label, users, value, onChange }: { label: string; users: User[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={input}>
        <option value="">Select user…</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.intern_id || u.email} · {u.role}</option>)}
      </select>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) { return <div style={{ padding: 30, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12 }}>{children}</div>; }

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 };
const sectionH: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px 0" };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, marginBottom: 6, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 4, fontWeight: 700 };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSuccess: React.CSSProperties = { padding: "7px 14px", background: "#66BB6A", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "7px 14px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const modalBack: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 440, maxWidth: "96vw" };
