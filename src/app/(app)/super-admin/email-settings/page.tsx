"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { saveEmailSettings, clearEmailSettings, testEmail, getEmailStatus } from "@/app/actions/email-settings";

type Provider = "resend" | "sendgrid" | "smtp";

const HINTS: Record<Provider, string> = {
  resend: "resend.com/api-keys · Starts with re_… · Best developer experience.",
  sendgrid: "app.sendgrid.com/settings/api_keys · Starts with SG…",
  smtp: "Generic SMTP not implemented yet — pick Resend or SendGrid.",
};

export default function EmailSettingsPage() {
  const [provider, setProvider] = useState<Provider>("resend");
  const [apiKey, setApiKey] = useState("");
  const [fromAddress, setFromAddress] = useState("CIOS <hello@yourdomain.com>");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<{ configured: boolean; provider: string | null; fromAddress: string | null; keyMasked: string | null } | null>(null);

  async function refreshStatus() {
    const r = await getEmailStatus();
    if (r.ok) setStatus(r.data!);
  }
  useEffect(() => { refreshStatus(); }, []);

  async function save() {
    if (!apiKey.trim()) { toast.error("Paste an API key"); return; }
    if (!fromAddress.includes("@")) { toast.error("From address must include @"); return; }
    setBusy(true);
    const r = await saveEmailSettings({ provider, apiKey, fromAddress });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Saved");
    setApiKey("");
    refreshStatus();
  }

  async function test() {
    if (!testTo.includes("@")) { toast.error("Add a recipient email"); return; }
    setBusy(true);
    setResult(null);
    const r = await testEmail(testTo);
    setBusy(false);
    if (!r.ok) { setResult(`❌ ${r.error}`); toast.error(r.error); return; }
    setResult(`✅ Test email sent to ${testTo}. Check the inbox.`);
    toast.success("Sent");
  }

  async function clear() {
    if (!confirm("Clear all email config?")) return;
    setBusy(true);
    const r = await clearEmailSettings();
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Cleared");
    setApiKey(""); setResult(null);
    refreshStatus();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>SUPER ADMIN · EMAIL</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>✉️ Email provider settings</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>One key powers graded-assignment emails, certificate notifications, invites, and admin broadcasts with email copy.</p>
      </div>

      {status && (
        <div style={{
          marginBottom: 14, padding: 12, borderRadius: 12,
          background: status.configured ? "rgba(102,187,106,0.08)" : "rgba(255,193,7,0.08)",
          border: `1px solid ${status.configured ? "rgba(102,187,106,0.25)" : "rgba(255,193,7,0.25)"}`,
          display: "flex", gap: 10, alignItems: "center",
        }}>
          <div style={{ fontSize: 22 }}>{status.configured ? "✅" : "⚠️"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: status.configured ? "#66BB6A" : "#FFC107" }}>
              {status.configured ? "Connected" : "Not configured"}
            </div>
            {status.configured && (
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
                Provider: <b style={{ color: "#E8EDF5", textTransform: "capitalize" }}>{status.provider}</b> ·
                From: <b style={{ color: "#E8EDF5" }}>{status.fromAddress}</b> ·
                Key: <code style={{ color: "#8892A4" }}>{status.keyMasked}</code>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={lbl}>Provider</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["resend", "sendgrid"] as Provider[]).map((p) => (
              <button key={p} onClick={() => setProvider(p)} style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                background: provider === p ? "#1E88E5" : "transparent",
                color: provider === p ? "#fff" : "#8892A4",
                border: provider === p ? "none" : "1px solid rgba(255,255,255,0.1)",
                textTransform: "capitalize",
              }}>{p}</button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "#8892A4", marginTop: 6 }}>🔗 {HINTS[provider]}</p>
        </div>

        <div>
          <div style={lbl}>API Key</div>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your key" style={input} />
        </div>
        <div>
          <div style={lbl}>From address</div>
          <input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder='"CIOS <hello@yourdomain.com>"' style={input} />
          <p style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>Must be a domain you&apos;ve verified in the provider dashboard.</p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={save} disabled={busy} style={btnPrimary}>💾 Save</button>
          <button onClick={clear} disabled={busy} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)", marginLeft: "auto" }}>🗑 Clear</button>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 14, marginTop: 4 }}>
          <div style={lbl}>Send a test email</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@domain.com" style={input} />
            <button onClick={test} disabled={busy} style={btnPrimary}>🧪 Send</button>
          </div>
          {result && (
            <div style={{ marginTop: 8, padding: 10, background: "#0A0E1A", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 8, fontSize: 12, color: "#E8EDF5" }}>{result}</div>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit" };
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
