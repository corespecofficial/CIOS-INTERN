"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateGlobalMessagingPolicy, muteUser, banFromMessaging } from "@/app/actions/messaging-privacy";

interface Policy {
  intern_messaging_enabled?: boolean; allow_files?: boolean; allow_voice?: boolean;
  allow_group_chats?: boolean; retention_days?: number; rate_limit_per_min?: number;
}

export function ControlClient({ isSuperAdmin, policy, muted }: { isSuperAdmin: boolean; policy: Record<string, unknown>; muted: Array<Record<string, unknown>> }) {
  const [p, setP] = useState<Policy>(policy as Policy);
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const res = await updateGlobalMessagingPolicy(p);
    if (!res.ok) return toast.error(res.error);
    toast.success("Policy saved");
  });

  const lift = (userId: string, kind: "mute" | "ban") => start(async () => {
    const res = kind === "mute" ? await muteUser(userId, 0) : await banFromMessaging(userId, false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Lifted");
    setTimeout(() => window.location.reload(), 300);
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>MESSAGING CONTROL</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🛡 Message oversight</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>Global policy · mutes · bans · moderation</p>
        </div>
        <Link href="/admin/contact-allocation" style={{ padding: "9px 14px", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>🔗 Contact allocation</Link>
      </div>

      {isSuperAdmin && (
        <div style={panel}>
          <h2 style={sectionH}>🌍 Global policy</h2>
          <p style={{ fontSize: 11, color: "#5A6478", marginBottom: 14 }}>Applies platform-wide. Changes are audit-logged.</p>

          <Toggle label="Intern messaging enabled" desc="If off, interns cannot send any messages" checked={!!p.intern_messaging_enabled} onChange={(v) => setP({ ...p, intern_messaging_enabled: v })} />
          <Toggle label="Allow file attachments" checked={!!p.allow_files} onChange={(v) => setP({ ...p, allow_files: v })} />
          <Toggle label="Allow voice notes" checked={!!p.allow_voice} onChange={(v) => setP({ ...p, allow_voice: v })} />
          <Toggle label="Allow group chats" checked={!!p.allow_group_chats} onChange={(v) => setP({ ...p, allow_group_chats: v })} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <NumberField label="Retention (days)" value={p.retention_days || 365} onChange={(v) => setP({ ...p, retention_days: v })} />
            <NumberField label="Rate limit (msgs/min)" value={p.rate_limit_per_min || 30} onChange={(v) => setP({ ...p, rate_limit_per_min: v })} />
          </div>

          <button onClick={save} disabled={pending} style={{ ...btnPrimary, marginTop: 16 }}>{pending ? "Saving…" : "💾 Save policy"}</button>
        </div>
      )}

      <div style={{ ...panel, marginTop: 14 }}>
        <h2 style={sectionH}>🔇 Active mutes & bans</h2>
        {muted.length === 0 && <div style={{ padding: 16, color: "#8892A4", fontSize: 13 }}>No active mutes or bans.</div>}
        {muted.map((m) => {
          const u = m.users as { name?: string; intern_id?: string; role?: string } | null;
          const isBan = !!m.banned_until;
          return (
            <div key={m.user_id as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{u?.name} <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8892A4" }}>({u?.intern_id})</span></div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>
                  {isBan ? `🚫 Banned until ${new Date(m.banned_until as string).toLocaleDateString()}` : `🔇 Muted until ${new Date(m.muted_until as string).toLocaleString()}`}
                </div>
              </div>
              <button onClick={() => lift(m.user_id as string, isBan ? "ban" : "mute")} disabled={pending} style={btnSmall}>Lift</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div>
        <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{desc}</div>}
      </div>
      <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, cursor: "pointer" }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
        <span style={{ position: "absolute", inset: 0, background: checked ? "#1E88E5" : "rgba(255,255,255,0.12)", borderRadius: 99, transition: "background 0.2s" }} />
        <span style={{ position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s" }} />
      </label>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(parseInt(e.target.value) || 0)} style={{ width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13 }} />
    </div>
  );
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 };
const sectionH: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" };
const btnPrimary: React.CSSProperties = { padding: "10px 20px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnSmall: React.CSSProperties = { padding: "5px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer" };
