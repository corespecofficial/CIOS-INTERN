"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { reviewPeerRequest } from "@/app/actions/messaging-privacy";

interface Outgoing {
  id: string;
  target_intern_id: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  mode?: string | null;
  admin_note?: string | null;
  created_at: string;
}

interface Incoming {
  id: string;
  requester_id: string;
  requester_name: string | null;
  requester_avatar: string | null;
  requester_intern_id: string | null;
  reason: string | null;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = { pending: "#FFC107", approved: "#66BB6A", rejected: "#EF5350" };

export function RequestsClient({ outgoing, incoming }: { outgoing: Outgoing[]; incoming: Incoming[] }) {
  const [tab, setTab] = useState<"incoming" | "outgoing">(incoming.length > 0 ? "incoming" : "outgoing");
  const [rows, setRows] = useState<Incoming[]>(incoming);
  const [pending, start] = useTransition();

  const decide = (id: string, accept: boolean, name: string | null) => start(async () => {
    const r = await reviewPeerRequest(id, accept);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(accept ? `✅ Connected with ${name || "them"}` : "Declined");
    setRows((prev) => prev.filter((x) => x.id !== id));
  });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📨 Connect requests</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Incoming peer requests you need to approve, and your outgoing requests</p>
        </div>
        <Link href="/messages/contacts" style={{ padding: "9px 14px", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Contacts</Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: "#0A0E1A", padding: 4, borderRadius: 10, marginBottom: 14 }}>
        <button onClick={() => setTab("incoming")} style={tabStyle(tab === "incoming", "#1E88E5")}>
          🔔 Incoming {rows.length > 0 && <span style={{ marginLeft: 4, background: "#EF5350", color: "#fff", padding: "1px 7px", borderRadius: 99, fontSize: 10 }}>{rows.length}</span>}
        </button>
        <button onClick={() => setTab("outgoing")} style={tabStyle(tab === "outgoing", "#AB47BC")}>
          📤 Outgoing
        </button>
      </div>

      {tab === "incoming" && (
        <>
          {rows.length === 0 && (
            <div style={{ padding: 30, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
              No incoming requests. When another intern sends you a connect, it appears here.
            </div>
          )}
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ background: "#111827", border: "1px solid rgba(30,136,229,0.25)", borderLeft: "4px solid #1E88E5", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {r.requester_avatar
                    ? <img src={r.requester_avatar} alt="" width={48} height={48} style={{ borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>{(r.requester_name || "?").slice(0, 2).toUpperCase()}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{r.requester_name || "Someone"}</div>
                    <div style={{ fontSize: 11, color: "#8892A4", fontFamily: "monospace", marginTop: 2 }}>{r.requester_intern_id || "—"}</div>
                    {r.reason && <div style={{ fontSize: 13, color: "#B0BEC5", marginTop: 8, fontStyle: "italic", lineHeight: 1.45 }}>&ldquo;{r.reason}&rdquo;</div>}
                    <div style={{ fontSize: 10, color: "#5A6478", marginTop: 6 }}>Sent {new Date(r.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => decide(r.id, true, r.requester_name)} disabled={pending} style={{ flex: 1, padding: "10px 16px", background: "linear-gradient(135deg, #66BB6A, #43A047)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: pending ? "wait" : "pointer" }}>
                    ✓ Accept
                  </button>
                  <button onClick={() => decide(r.id, false, r.requester_name)} disabled={pending} style={{ padding: "10px 16px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: pending ? "wait" : "pointer" }}>
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "outgoing" && (
        <div style={{ display: "grid", gap: 8 }}>
          {outgoing.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>No outgoing requests yet.</div>}
          {outgoing.map((r) => (
            <div key={r.id} style={{ background: "#111827", border: `1px solid ${STATUS_COLOR[r.status] || "#8892A4"}33`, borderLeft: `4px solid ${STATUS_COLOR[r.status] || "#8892A4"}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", fontFamily: "monospace" }}>{r.target_intern_id}</div>
                  {r.mode && <div style={{ fontSize: 10, color: "#AB47BC", marginTop: 2, fontWeight: 700 }}>{r.mode === "peer" ? "🤝 Peer connect" : "🛡 Via admin"}</div>}
                  {r.reason ? <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>{r.reason}</div> : null}
                  <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4 }}>Sent {new Date(r.created_at).toLocaleString()}</div>
                  {r.admin_note ? <div style={{ fontSize: 11, color: "#FFC107", marginTop: 4 }}>Admin: {r.admin_note}</div> : null}
                </div>
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 99, background: `${STATUS_COLOR[r.status] || "#8892A4"}22`, color: STATUS_COLOR[r.status] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function tabStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
    background: active ? `${color}22` : "transparent",
    color: active ? color : "#8892A4",
    fontSize: 13, fontWeight: 700,
  };
}
