"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { sendContactRequest } from "@/app/actions/messaging-privacy";
import { BackBar } from "@/components/back-bar";

interface Contact { id: string; displayName: string; internId: string | null; avatarUrl: string | null; role: string; masked: boolean; lastSeen: string | null }

export function ContactsClient({ initial, myRole }: { initial: Contact[]; myRole: string }) {
  const [search, setSearch] = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [mode, setMode] = useState<"peer" | "admin">("peer");
  const [internId, setInternId] = useState("");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const isAdmin = myRole === "admin" || myRole === "super_admin";

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return initial.filter((c) =>
      !q || c.displayName.toLowerCase().includes(q) || (c.internId || "").toLowerCase().includes(q),
    );
  }, [initial, search]);

  const onRequest = () => start(async () => {
    const res = await sendContactRequest(internId, reason, mode);
    if (!res.ok) return toast.error(res.error);
    toast.success(mode === "peer" ? "Connect request sent — waiting for their approval" : "Request sent to admin");
    setShowRequest(false); setInternId(""); setReason("");
  });

  // 60s threshold — matches src/lib/presence.ts so numbers never disagree
  // across the messages page, contacts page, and chat header.
  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 60_000;
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/messages" label="Back to messages" />
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>CONTACTS</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>💬 Your allowed contacts</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>
            {isAdmin ? "As admin you can message anyone." : "Only people assigned by an admin appear here. Protect identities."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/messages/requests" style={btnGhost}>📨 Requests</Link>
          {!isAdmin && <button onClick={() => setShowRequest(true)} style={btnPrimary}>+ Request new contact</button>}
        </div>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search your contacts…"
        style={{ width: "100%", padding: "10px 14px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 13, marginBottom: 14, boxSizing: "border-box" }} />

      <div style={{ display: "grid", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
            {initial.length === 0 ? "No contacts yet. Request one by their Intern ID or ask an admin to assign contacts." : "No matches."}
          </div>
        )}
        {filtered.map((c) => {
          const online = isOnline(c.lastSeen);
          return (
            <Link key={c.id} href={`/messages?to=${c.id}`} style={{
              display: "flex", gap: 12, alignItems: "center",
              padding: 14, background: "#111827", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, textDecoration: "none", color: "inherit",
            }}>
              <div style={{ position: "relative" }}>
                {c.avatarUrl
                  ? <img src={c.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{c.displayName.slice(0, 2).toUpperCase()}</div>}
                <span style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: "50%", background: online ? "#66BB6A" : "#5A6478", border: "2px solid #111827" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", display: "flex", alignItems: "center", gap: 6 }}>
                  {c.displayName}
                  {c.masked && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", borderRadius: 99, fontWeight: 700 }}>MASKED</span>}
                </div>
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {c.internId && <span style={{ fontFamily: "monospace" }}>{c.internId}</span>}
                  <span style={{ textTransform: "capitalize" }}>{c.role.replace("_", " ")}</span>
                  <span>{online ? "🟢 Online" : c.lastSeen ? `Seen ${new Date(c.lastSeen).toLocaleDateString()}` : "Offline"}</span>
                </div>
              </div>
              <span style={{ fontSize: 16, color: "#8892A4" }}>→</span>
            </Link>
          );
        })}
      </div>

      {showRequest && (
        <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && setShowRequest(false)}>
          <div style={modalPanel}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>🤝 New contact</h2>
              <button onClick={() => setShowRequest(false)} style={btnClose}>✕</button>
            </div>

            {/* Mode tabs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14, background: "#0A0E1A", padding: 4, borderRadius: 10 }}>
              <button onClick={() => setMode("peer")} style={{ padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === "peer" ? "rgba(30,136,229,0.2)" : "transparent", color: mode === "peer" ? "#1E88E5" : "#8892A4", fontSize: 12, fontWeight: 700 }}>🤝 Connect directly</button>
              <button onClick={() => setMode("admin")} style={{ padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer", background: mode === "admin" ? "rgba(171,71,188,0.2)" : "transparent", color: mode === "admin" ? "#AB47BC" : "#8892A4", fontSize: 12, fontWeight: 700 }}>🛡 Request via admin</button>
            </div>

            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 14px 0", lineHeight: 1.55 }}>
              {mode === "peer" ? (
                <>LinkedIn-style: send a direct connect request to the intern. They approve or decline themselves, no admin needed. Both of you can message once they accept.</>
              ) : (
                <>Ask an admin to grant you access to this intern. Use this when you don&apos;t know them personally or need special permission.</>
              )}
            </p>

            <label style={lbl}>Intern ID</label>
            <input value={internId} onChange={(e) => setInternId(e.target.value.toUpperCase())} placeholder="CPS-INT-1042" style={input} />
            <label style={lbl}>{mode === "peer" ? "Note (shown to them)" : "Reason (shown to admin)"}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={mode === "peer" ? "Hey, we met at the Lagos onboarding — would love to connect." : "Why do you need to connect?"} style={{ ...input, fontFamily: "inherit", resize: "vertical" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowRequest(false)} style={btnGhost}>Cancel</button>
              <button onClick={onRequest} disabled={pending || !internId.trim()} style={btnPrimary}>
                {pending ? "Sending…" : mode === "peer" ? "Send connect" : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: "none", cursor: "pointer", display: "inline-block" };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, marginBottom: 10, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 6, fontWeight: 700 };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 440, maxWidth: "96vw" };
