"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  listShareableUsers,
  listNoteCollaborators,
  shareNoteWith,
  unshareNote,
  type ShareableUser,
  type NoteCollaborator,
} from "@/app/actions/notes";

type Role = "viewer" | "commenter" | "editor";

export function ShareNoteModal({
  noteId,
  noteTitle,
  onClose,
}: {
  noteId: string;
  noteTitle: string;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<ShareableUser[]>([]);
  const [collabs, setCollabs] = useState<NoteCollaborator[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "intern">("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [role, setRole] = useState<Role>("viewer");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, start] = useTransition();

  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([listShareableUsers(), listNoteCollaborators(noteId)]);
      if (u.ok) setUsers(u.data || []);
      else toast.error(u.error);
      if (c.ok) setCollabs(c.data || []);
      setLoading(false);
    })();
  }, [noteId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && !u.role.toLowerCase().includes(roleFilter)) return false;
      if (!q) return true;
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const doShare = () => start(async () => {
    if (picked.size === 0) { toast.error("Pick someone first"); return; }
    const r = await shareNoteWith(noteId, Array.from(picked), role, message.trim() || undefined);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Shared with ${r.data?.added} ${r.data?.added === 1 ? "person" : "people"}`);
    const c = await listNoteCollaborators(noteId);
    if (c.ok) setCollabs(c.data || []);
    setPicked(new Set());
    setMessage("");
  });

  const doUnshare = (shareId: string) => start(async () => {
    const r = await unshareNote(shareId);
    if (!r.ok) { toast.error(r.error); return; }
    setCollabs((c) => c.filter((x) => x.shareId !== shareId));
    toast.success("Removed");
  });

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/notes/${noteId}`); toast.success("Link copied"); }
    catch { toast.error("Couldn't copy"); }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 560, maxHeight: "88dvh", overflowY: "auto",
        background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px 18px 0 0",
        padding: 18, color: "#E8EDF5",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>Share “{noteTitle || "Untitled"}”</div>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>✕</button>
        </div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 12 }}>
          Send this document to teammates — interns, admins, anyone in CIOS.
        </div>

        {/* Search + role filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            style={{
              flex: 1, background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "8px 12px", color: "#E8EDF5", fontSize: 13, outline: "none",
            }}
          />
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px", color: "#E8EDF5", fontSize: 12 }}>
            <option value="all">Everyone</option>
            <option value="intern">Interns</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {/* User list */}
        <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, background: "#0E1320" }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "#8892A4", fontSize: 12 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#8892A4", fontSize: 12 }}>No one matches that search.</div>
          ) : (
            filtered.map((u) => {
              const on = picked.has(u.id);
              return (
                <label key={u.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
                  background: on ? "rgba(239,83,80,0.08)" : "transparent",
                }}>
                  <input type="checkbox" checked={on} onChange={() => toggle(u.id)} style={{ accentColor: "#EF5350" }} />
                  {u.avatarUrl
                    ? <img src={u.avatarUrl} alt="" width={30} height={30} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1F2937", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{u.name.charAt(0).toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: "#8892A4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  </div>
                  <span style={roleChip(u.role)}>{u.role}</span>
                </label>
              );
            })
          )}
        </div>

        {/* Role + message + action */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["viewer", "commenter", "editor"] as Role[]).map((r) => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: "7px 10px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer",
                border: role === r ? "1px solid #EF5350" : "1px solid rgba(255,255,255,0.08)",
                background: role === r ? "rgba(239,83,80,0.15)" : "#111827",
                color: "#E8EDF5", textTransform: "capitalize",
              }}>{r === "viewer" ? "👁 Viewer" : r === "commenter" ? "💬 Commenter" : "✎ Editor"}</button>
            ))}
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a short message (optional)…" rows={2}
            style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, color: "#E8EDF5", fontSize: 12, resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={copyLink} style={secondaryBtn}>🔗 Copy link</button>
            <button onClick={doShare} disabled={busy || picked.size === 0} style={primaryBtn(busy || picked.size === 0)}>
              {busy ? "Sharing…" : `Send${picked.size > 0 ? ` to ${picked.size}` : ""}`}
            </button>
          </div>
        </div>

        {/* Existing collaborators */}
        {collabs.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#8892A4", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Shared with ({collabs.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {collabs.map((c) => (
                <div key={c.shareId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "#111827", borderRadius: 8 }}>
                  {c.avatarUrl
                    ? <img src={c.avatarUrl} alt="" width={26} height={26} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#1F2937", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{c.name.charAt(0).toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: "#8892A4" }}>{c.role}</div>
                  </div>
                  <button onClick={() => doUnshare(c.shareId)} disabled={busy} style={{ background: "none", border: "none", color: "#EF5350", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const closeBtn: React.CSSProperties = { background: "none", border: "none", color: "#8892A4", fontSize: 18, cursor: "pointer", padding: 4 };
const secondaryBtn: React.CSSProperties = { flex: 1, padding: "10px 14px", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#E8EDF5", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const primaryBtn = (disabled: boolean): React.CSSProperties => ({ flex: 2, padding: "10px 14px", background: disabled ? "#4A1F1F" : "linear-gradient(135deg,#EF5350,#C62828)", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 });
function roleChip(role: string): React.CSSProperties {
  const r = role.toLowerCase();
  const c = r.includes("admin") ? "#FFB74D" : r.includes("recruit") ? "#BA68C8" : "#66BB6A";
  return { fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 999, background: `${c}22`, color: c, textTransform: "capitalize" };
}
