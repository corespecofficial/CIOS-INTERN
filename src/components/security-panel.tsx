"use client";

import { useEffect, useState } from "react";
import { useUser, useSessionList, useClerk } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { listMyLoginHistory, type LoginEvent } from "@/app/actions/security";

export function SecurityPanel() {
  const { user } = useUser();
  const { sessions } = useSessionList() as { sessions?: Array<{ id: string; status: string; lastActiveAt?: Date; latestActivity?: { browserName?: string | null; deviceType?: string | null; city?: string | null; country?: string | null; ipAddress?: string | null }; revoke: () => Promise<unknown> }> };
  const { openUserProfile } = useClerk();
  const [history, setHistory] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await listMyLoginHistory(20);
      if (r.ok) setHistory(r.data!);
      setLoading(false);
    })();
  }, []);

  const twoFactorEnabled = !!user?.twoFactorEnabled;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 2FA */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", display: "flex", alignItems: "center", gap: 8 }}>
              🛡 Two-factor authentication
              {twoFactorEnabled
                ? <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderRadius: 99, fontWeight: 700 }}>ENABLED</span>
                : <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(239,83,80,0.15)", color: "#EF5350", borderRadius: 99, fontWeight: 700 }}>OFF</span>}
            </div>
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>Add an extra step at sign-in (authenticator app, SMS, or backup codes).</div>
          </div>
          <button onClick={() => openUserProfile()} style={btnPrimary}>
            {twoFactorEnabled ? "Manage 2FA" : "Set up 2FA"}
          </button>
        </div>
      </div>

      {/* Active sessions */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>📱 Active sessions</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 12 }}>Devices currently signed in. Revoke any you don't recognise.</div>
        {!sessions || sessions.length === 0 ? (
          <div style={{ fontSize: 12, color: "#5A6478" }}>Loading sessions…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sessions.filter((s) => s.status === "active").map((s) => {
              const a = s.latestActivity;
              const where = [a?.city, a?.country].filter(Boolean).join(", ");
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8 }}>
                  <div style={{ fontSize: 22 }}>{deviceEmoji(a?.deviceType)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{a?.browserName || "Browser"} · {a?.deviceType || "device"}</div>
                    <div style={{ fontSize: 11, color: "#8892A4" }}>{where || "Unknown location"} · {a?.ipAddress || "—"} · last active {fmtRel(s.lastActiveAt)}</div>
                  </div>
                  <button onClick={async () => {
                    if (!confirm("Sign out this device?")) return;
                    try { await s.revoke(); toast.success("Session revoked"); }
                    catch (e) { toast.error((e as Error).message); }
                  }} style={btnDanger}>Revoke</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Login history (last 20) */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>🕓 Login history</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 12 }}>The last 20 sign-in events on your account.</div>
        {loading ? (
          <div style={{ fontSize: 12, color: "#5A6478" }}>Loading…</div>
        ) : history.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "#5A6478" }}>No sign-in events recorded yet. (Will populate from your next login.)</div>
        ) : (
          <table style={{ width: "100%", fontSize: 12, color: "#E8EDF5", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#8892A4", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <th style={{ padding: 6, textAlign: "left" }}>When</th>
                <th style={{ padding: 6, textAlign: "left" }}>Device</th>
                <th style={{ padding: 6, textAlign: "left" }}>IP</th>
                <th style={{ padding: 6, textAlign: "right" }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: 6 }}>{new Date(h.created_at).toLocaleString()}</td>
                  <td style={{ padding: 6 }}>{h.device || "—"}</td>
                  <td style={{ padding: 6, fontFamily: "monospace", color: "#8892A4" }}>{h.ip || "—"}</td>
                  <td style={{ padding: 6, textAlign: "right" }}>
                    {h.success
                      ? <span style={{ color: "#66BB6A" }}>✓ Success</span>
                      : <span style={{ color: "#EF5350" }}>✗ Failed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function deviceEmoji(t: string | null | undefined) {
  if (!t) return "🖥";
  const x = t.toLowerCase();
  if (x.includes("phone") || x.includes("mobile")) return "📱";
  if (x.includes("tablet")) return "📲";
  return "💻";
}

function fmtRel(d: Date | undefined) {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const btnPrimary: React.CSSProperties = { padding: "10px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" };
