"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { updateMyPrivacy, updateMyPreferences, requestAccountDeletion } from "@/app/actions/profile";
import { usePrefs } from "@/lib/use-server-notifications";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SecurityPanel } from "@/components/security-panel";

type Tab = "account" | "privacy" | "notifications" | "appearance" | "security" | "data";

interface Me {
  id: string; name: string; email: string; avatarUrl: string | null; role: string;
  privacy: Record<string, unknown>;
  preferences: Record<string, unknown>;
}

export function SettingsClient({ me }: { me: Me }) {
  const [tab, setTab] = useState<Tab>("account");

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>⚙️ Settings</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Everything saves to the database and syncs across your devices.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "flex-start" }}>
        <style>{`@media (max-width: 820px) { div[data-settings-grid] { grid-template-columns: 1fr !important; } aside[data-settings-nav] { position: static !important; } }`}</style>
        <aside data-settings-nav style={{ position: "sticky", top: 20, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 6 }}>
          {(["account","privacy","notifications","appearance","security","data"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: 8,
              background: tab === t ? "rgba(30,136,229,0.1)" : "transparent",
              color: tab === t ? "#1E88E5" : "#8892A4",
              border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, textTransform: "capitalize",
            }}>
              {iconFor(t)} {t}
            </button>
          ))}
        </aside>

        <div data-settings-grid>
          {tab === "account" && <AccountTab me={me} />}
          {tab === "privacy" && <PrivacyTab initial={me.privacy} />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "appearance" && <AppearanceTab initial={me.preferences} />}
          {tab === "security" && <SecurityTab />}
          {tab === "data" && <DataTab />}
        </div>
      </div>
    </div>
  );
}

function iconFor(t: Tab): string {
  return ({ account: "👤", privacy: "🔒", notifications: "🔔", appearance: "🎨", security: "🛡", data: "💾" } as Record<Tab, string>)[t];
}

function AccountTab({ me }: { me: Me }) {
  return (
    <Card title="Account">
      <Row label="Name" value={me.name} />
      <Row label="Email" value={me.email} />
      <Row label="Role" value={me.role.replace("_", " ")} />
      <div style={{ marginTop: 10 }}>
        <Link href="/profile" style={btnPrimary}>Edit profile details →</Link>
      </div>
      <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.05)", margin: "18px 0" }} />
      <div style={{ fontSize: 13, color: "#8892A4" }}>
        Sign-in, password, and 2FA are managed by your authentication provider. Open the user menu (top-right) → <b style={{ color: "#E8EDF5" }}>Manage account</b> to change password or enable 2FA.
      </div>
    </Card>
  );
}

function PrivacyTab({ initial }: { initial: Record<string, unknown> }) {
  const [visibility, setVisibility] = useState<"public" | "contacts" | "private">((initial.profile_visibility as "public" | "contacts" | "private") || "public");
  const [showOnline, setShowOnline] = useState<boolean>((initial.show_online as boolean) ?? true);
  const [showLastSeen, setShowLastSeen] = useState<boolean>((initial.show_last_seen as boolean) ?? true);
  const [showEmail, setShowEmail] = useState<boolean>((initial.show_email as boolean) ?? false);
  const [showAchievements, setShowAchievements] = useState<boolean>((initial.show_achievements as boolean) ?? true);
  const [messagesFrom, setMessagesFrom] = useState<"everyone" | "contacts" | "org">((initial.messages_from as "everyone" | "contacts" | "org") || "everyone");
  const [searchable, setSearchable] = useState<boolean>((initial.searchable as boolean) ?? true);

  async function save() {
    const r = await updateMyPrivacy({
      profile_visibility: visibility,
      show_online: showOnline, show_last_seen: showLastSeen,
      show_email: showEmail, show_achievements: showAchievements,
      messages_from: messagesFrom, searchable,
    });
    if (!r.ok) toast.error(r.error);
    else toast.success("Privacy settings saved");
  }

  return (
    <Card title="Privacy">
      <FieldGroup label="Profile visibility">
        <PillGroup value={visibility} onChange={setVisibility} options={[
          { val: "public", label: "🌐 Public" }, { val: "contacts", label: "👥 Contacts only" }, { val: "private", label: "🔒 Private" },
        ]} />
      </FieldGroup>
      <FieldGroup label="Who can message you">
        <PillGroup value={messagesFrom} onChange={setMessagesFrom} options={[
          { val: "everyone", label: "Everyone" }, { val: "contacts", label: "Contacts" }, { val: "org", label: "Same org" },
        ]} />
      </FieldGroup>
      <Toggle label="Show online status" checked={showOnline} onChange={setShowOnline} />
      <Toggle label="Show last seen" checked={showLastSeen} onChange={setShowLastSeen} />
      <Toggle label="Show achievements on profile" checked={showAchievements} onChange={setShowAchievements} />
      <Toggle label="Show email address on profile" checked={showEmail} onChange={setShowEmail} />
      <Toggle label="Appear in search" checked={searchable} onChange={setSearchable} />
      <p style={{ fontSize: 11, color: "#5A6478", marginTop: 10 }}>Admins retain visibility where compliance requires.</p>
      <button onClick={save} style={{ ...btnPrimary, marginTop: 12 }}>💾 Save privacy</button>
    </Card>
  );
}

function NotificationsTab() {
  const [prefs, setPrefs] = usePrefs();

  function setMuted(key: string, muted: boolean) {
    const next = muted ? [...new Set([...prefs.mutedCategories, key])] : prefs.mutedCategories.filter((x) => x !== key);
    setPrefs({ ...prefs, mutedCategories: next });
  }

  return (
    <Card title="Notifications">
      <Toggle label="Toast pop-ups" checked={prefs.toastsOn} onChange={(v) => setPrefs({ ...prefs, toastsOn: v })} />
      <Toggle label="Sound" checked={prefs.soundOn} onChange={(v) => setPrefs({ ...prefs, soundOn: v })} />
      <FieldGroup label="Mute categories">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { k: "message", l: "💬 Messages" }, { k: "task", l: "📋 Tasks" },
            { k: "achievement", l: "🏆 Achievements" }, { k: "info", l: "🔔 Info" },
            { k: "warning", l: "⚠️ Warnings" }, { k: "fine", l: "💸 Fines" },
          ].map((c) => {
            const muted = prefs.mutedCategories.includes(c.k);
            return (
              <button key={c.k} onClick={() => setMuted(c.k, !muted)} style={{
                padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: muted ? "rgba(239,83,80,0.12)" : "rgba(102,187,106,0.1)",
                color: muted ? "#EF5350" : "#66BB6A",
                border: `1px solid ${muted ? "rgba(239,83,80,0.25)" : "rgba(102,187,106,0.25)"}`,
                cursor: "pointer",
              }}>{muted ? "🔇" : "🔊"} {c.l}</button>
            );
          })}
        </div>
      </FieldGroup>
      <FieldGroup label="Quiet hours">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={miniLbl}>From</div>
            <select value={prefs.quietFromHour} onChange={(e) => setPrefs({ ...prefs, quietFromHour: parseInt(e.target.value) })} style={input}>
              {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>)}
            </select>
          </div>
          <div>
            <div style={miniLbl}>Until</div>
            <select value={prefs.quietToHour} onChange={(e) => setPrefs({ ...prefs, quietToHour: parseInt(e.target.value) })} style={input}>
              {Array.from({ length: 24 }).map((_, h) => <option key={h} value={h}>{h.toString().padStart(2, "0")}:00</option>)}
            </select>
          </div>
        </div>
      </FieldGroup>
      <p style={{ fontSize: 11, color: "#5A6478" }}>Saved to your device. Server preferences coming next.</p>
    </Card>
  );
}

function AppearanceTab({ initial }: { initial: Record<string, unknown> }) {
  const [theme, setTheme] = useState<"dark" | "light" | "system">((initial.theme as "dark" | "light" | "system") || "dark");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">((initial.font_size as "sm" | "md" | "lg") || "md");
  const [reducedMotion, setReducedMotion] = useState<boolean>((initial.reduced_motion as boolean) ?? false);
  const [compact, setCompact] = useState<boolean>((initial.compact_layout as boolean) ?? false);
  const [highContrast, setHighContrast] = useState<boolean>((initial.high_contrast as boolean) ?? false);

  async function save() {
    const r = await updateMyPreferences({
      theme, font_size: fontSize,
      reduced_motion: reducedMotion, compact_layout: compact, high_contrast: highContrast,
    });
    if (!r.ok) toast.error(r.error);
    else toast.success("Appearance saved");
  }

  return (
    <Card title="Appearance">
      <FieldGroup label="Theme">
        <PillGroup value={theme} onChange={setTheme} options={[
          { val: "dark", label: "🌙 Dark" }, { val: "light", label: "☀️ Light" }, { val: "system", label: "🖥 System" },
        ]} />
      </FieldGroup>
      <FieldGroup label="Font size">
        <PillGroup value={fontSize} onChange={setFontSize} options={[
          { val: "sm", label: "A Small" }, { val: "md", label: "A Default" }, { val: "lg", label: "A Large" },
        ]} />
      </FieldGroup>
      <Toggle label="Reduce motion" checked={reducedMotion} onChange={setReducedMotion} />
      <Toggle label="Compact layout" checked={compact} onChange={setCompact} />
      <Toggle label="High contrast" checked={highContrast} onChange={setHighContrast} />
      <p style={{ fontSize: 11, color: "#5A6478", marginTop: 10 }}>Dark/light mode toggle in the header uses this too.</p>
      <button onClick={save} style={{ ...btnPrimary, marginTop: 12 }}>💾 Save appearance</button>
      <div style={{ marginTop: 16 }}>
        <LanguageSwitcher />
      </div>
    </Card>
  );
}

function SecurityTab() {
  return (
    <Card title="Security">
      <SecurityPanel />
      <div style={{ background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 10, padding: 12, marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1E88E5", marginBottom: 4 }}>🔒 Chat lock</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 8 }}>PIN or fingerprint lock for the Messages page.</div>
        <Link href="/messages" style={btnGhost}>Open messages → Lock button</Link>
      </div>
    </Card>
  );
}

function DataTab() {
  const [reason, setReason] = useState("");
  async function requestDelete() {
    if (!confirm("This will log a deletion request with support. Continue?")) return;
    const r = await requestAccountDeletion(reason || "user request");
    if (!r.ok) toast.error(r.error);
    else toast.success("Deletion request logged");
    setReason("");
  }
  async function exportData() {
    const res = await fetch("/api/my-analytics/pdf");
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `CIOS-Export-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    toast.success("Exported");
  }
  function clearLocalCache() {
    try {
      const keysToKeep = ["cios-onboarding"];
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("cios-") && !keysToKeep.includes(k)) localStorage.removeItem(k);
      }
      toast.success("Local cache cleared");
    } catch { toast.error("Couldn't clear cache"); }
  }

  return (
    <Card title="Data & Storage">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={actionRow}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>📄 Export my data</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Download a PDF report with your learning history, XP, quizzes, and courses.</div>
          </div>
          <button onClick={exportData} style={btnPrimary}>Export</button>
        </div>
        <div style={actionRow}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>🗑 Clear local cache</div>
            <div style={{ fontSize: 11, color: "#8892A4" }}>Removes cached messages, polls, notes, and drafts stored on this device. Server data stays intact.</div>
          </div>
          <button onClick={clearLocalCache} style={btnGhost}>Clear</button>
        </div>
        <div style={{ ...actionRow, borderColor: "rgba(239,83,80,0.2)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#EF5350" }}>Request account deletion</div>
            <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 6 }}>We&apos;ll review the request and confirm by email.</div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you leaving? (optional)" style={{ ...input, maxWidth: 380 }} />
          </div>
          <button onClick={requestDelete} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>Request deletion</button>
        </div>
      </div>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 14px 0" }}>{title}</h3>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 12, color: "#8892A4" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: 13, color: "#E8EDF5" }}>{label}</span>
      <span style={{ position: "relative", display: "inline-block", width: 36, height: 20 }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: "absolute", inset: 0, background: checked ? "#1E88E5" : "#3a4050", borderRadius: 10, transition: "0.2s" }}>
          <span style={{ position: "absolute", height: 14, width: 14, left: checked ? 19 : 3, top: 3, background: "#fff", borderRadius: "50%", transition: "0.2s" }} />
        </span>
      </span>
    </label>
  );
}
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 13, color: "#E8EDF5", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}
function PillGroup<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { val: T; label: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={o.val} onClick={() => onChange(o.val)} style={{
          padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: value === o.val ? "#1E88E5" : "transparent",
          color: value === o.val ? "#fff" : "#8892A4",
          border: value === o.val ? "none" : "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
        }}>{o.label}</button>
      ))}
    </div>
  );
}

const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const input: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit" };
const miniLbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const actionRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 12, background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10 };
