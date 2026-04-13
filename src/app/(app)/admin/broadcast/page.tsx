"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { broadcastAnnouncement } from "@/app/actions/notifications";

const ROLES: Array<{ key: "all" | "intern" | "team_lead" | "instructor" | "admin" | "super_admin" | "moderator" | "finance" | "support"; label: string }> = [
  { key: "all", label: "Everyone" },
  { key: "intern", label: "Interns" },
  { key: "team_lead", label: "Team Leads" },
  { key: "instructor", label: "Instructors" },
  { key: "moderator", label: "Moderators" },
  { key: "finance", label: "Finance" },
  { key: "support", label: "Support" },
  { key: "admin", label: "Admins" },
  { key: "super_admin", label: "Super Admins" },
];

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "intern" | "team_lead" | "instructor" | "admin" | "super_admin" | "moderator" | "finance" | "support">("all");
  const [priority, setPriority] = useState<"critical" | "important" | "normal">("normal");
  const [sendEmailCopy, setSendEmailCopy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastSent, setLastSent] = useState<{ sent: number; emailed: number } | null>(null);

  async function send() {
    if (!title.trim()) { toast.error("Title required"); return; }
    if (!confirm(`Send "${title}" to ${target === "all" ? "ALL users" : ROLES.find((r) => r.key === target)?.label}${sendEmailCopy ? " (with email copy)" : ""}?`)) return;
    setBusy(true);
    const r = await broadcastAnnouncement({ title, message, targetRole: target, priority, sendEmailCopy });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Delivered in-app to ${r.data!.sent}${sendEmailCopy ? ` + emailed ${r.data!.emailed}` : ""}`);
    setLastSent(r.data!);
    setTitle(""); setMessage("");
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>
          ADMIN · BROADCAST
        </span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>📢 Broadcast announcement</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Every recipient gets an in-app notification, live toast, chime, and browser push if enabled.</p>
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={lbl}>Target audience</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ROLES.map((r) => (
              <button key={r.key} onClick={() => setTarget(r.key)} style={{
                padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: target === r.key ? "#1E88E5" : "transparent",
                color: target === r.key ? "#fff" : "#8892A4",
                border: target === r.key ? "none" : "1px solid rgba(255,255,255,0.07)",
              }}>{r.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>Priority</div>
          <div style={{ display: "flex", gap: 6 }}>
            {([
              { k: "normal", label: "🔔 Normal", color: "#1E88E5" },
              { k: "important", label: "⚠️ Important", color: "#FFC107" },
              { k: "critical", label: "🚨 Critical", color: "#EF5350" },
            ] as const).map((p) => (
              <button key={p.k} onClick={() => setPriority(p.k)} style={{
                flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: priority === p.k ? `${p.color}22` : "transparent",
                color: priority === p.k ? p.color : "#8892A4",
                border: `1px solid ${priority === p.k ? p.color + "60" : "rgba(255,255,255,0.07)"}`,
              }}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>Title</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Maintenance tonight at 10 PM" style={input} />
          <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4, textAlign: "right" }}>{title.length}/150</div>
        </div>

        <div>
          <div style={lbl}>Message (optional)</div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={5} placeholder="Add details…" style={{ ...input, minHeight: 120, resize: "vertical" }} />
          <div style={{ fontSize: 10, color: "#5A6478", marginTop: 4, textAlign: "right" }}>{message.length}/500</div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#E8EDF5", cursor: "pointer" }}>
          <input type="checkbox" checked={sendEmailCopy} onChange={(e) => setSendEmailCopy(e.target.checked)} />
          Also send as email (requires email provider configured at /super-admin/email-settings)
        </label>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={send} disabled={busy || !title.trim()} style={{ background: priority === "critical" ? "linear-gradient(135deg, #EF5350, #C62828)" : "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: busy || !title.trim() ? 0.5 : 1 }}>
            {busy ? "Sending…" : "📢 Broadcast now"}
          </button>
        </div>

        {lastSent !== null && (
          <div style={{ padding: 12, background: "rgba(102,187,106,0.08)", border: "1px solid rgba(102,187,106,0.25)", borderRadius: 10, color: "#66BB6A", fontSize: 13 }}>
            ✓ Last broadcast: in-app to {lastSent.sent}, emailed {lastSent.emailed}.
          </div>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#5A6478", marginTop: 12 }}>
        Critical broadcasts bypass user mute settings.
      </p>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit" };
