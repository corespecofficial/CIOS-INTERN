"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { createWebhook, listMyWebhooks, deleteWebhook, toggleWebhook, type WebhookEndpoint, type WebhookEvent } from "@/app/actions/webhooks";
import { createApiToken, listMyApiTokens, revokeApiToken, type ApiToken } from "@/app/actions/api-tokens";
import { API_SCOPES as SCOPES } from "@/lib/api-token-scopes";

const EVENTS: WebhookEvent[] = ["announcement.published", "hire.confirmed", "candidate.applied", "user.created", "task.completed", "achievement.earned"];

export default function IntegrationsPage() {
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🔌 Integrations</h1>
      <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 18px 0" }}>Webhooks, API tokens, and external service connections.</p>
      <WebhooksSection />
      <div style={{ height: 24 }} />
      <TokensSection />
      <div style={{ height: 24 }} />
      <CalendarSection />
      <div style={{ height: 24 }} />
      <MeetingSection />
    </div>
  );
}

/* ─── Webhooks ─── */
function WebhooksSection() {
  const [hooks, setHooks] = useState<WebhookEndpoint[]>([]);
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<Set<WebhookEvent>>(new Set());
  const [busy, start] = useTransition();
  const refresh = async () => { const r = await listMyWebhooks(); if (r.ok) setHooks(r.data!); };
  useEffect(() => { refresh(); }, []);

  const submit = () => start(async () => {
    if (!url) { toast.error("URL required"); return; }
    const r = await createWebhook({ url, events: Array.from(picked) });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Webhook created");
    setUrl(""); setPicked(new Set()); refresh();
  });

  return (
    <Section title="Webhooks" subtitle="Get real-time HTTP POSTs when key events happen.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/cios-webhook" style={inp} />
        <button onClick={submit} disabled={busy} style={btnPrimary}>{busy ? "…" : "+ Add"}</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {EVENTS.map((e) => {
          const on = picked.has(e);
          return (
            <button key={e} onClick={() => { const next = new Set(picked); on ? next.delete(e) : next.add(e); setPicked(next); }} style={{ padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", background: on ? "rgba(30,136,229,0.15)" : "transparent", border: `1px solid ${on ? "rgba(30,136,229,0.4)" : "rgba(255,255,255,0.1)"}`, color: on ? "#1E88E5" : "#8892A4" }}>{e}</button>
          );
        })}
      </div>
      {hooks.length === 0 && <Empty>No webhooks yet.</Empty>}
      {hooks.map((h) => (
        <div key={h.id} style={row}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.url}</div>
            <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{h.events.join(", ")} · secret <code style={{ color: "#FFC107" }}>{h.secret.slice(0, 16)}…</code></div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: h.enabled ? "#66BB6A" : "#8892A4" }}>
            <input type="checkbox" checked={h.enabled} onChange={async (e) => { await toggleWebhook(h.id, e.target.checked); refresh(); }} />
            {h.enabled ? "On" : "Off"}
          </label>
          <button onClick={async () => { if (confirm("Delete webhook?")) { await deleteWebhook(h.id); refresh(); } }} style={btnDanger}>Delete</button>
        </div>
      ))}
    </Section>
  );
}

/* ─── API tokens ─── */
function TokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<string>>(() => new Set<string>([...SCOPES]));
  const [revealed, setRevealed] = useState<string | null>(null);
  const refresh = async () => { const r = await listMyApiTokens(); if (r.ok) setTokens(r.data!); };
  useEffect(() => { refresh(); }, []);

  const create = async () => {
    if (!name) { toast.error("Token needs a name"); return; }
    const r = await createApiToken({ name, scopes: Array.from(scopes) });
    if (!r.ok) { toast.error(r.error); return; }
    setRevealed(r.data!.token);
    setName(""); refresh();
  };

  return (
    <Section title="API Tokens (Enterprise)" subtitle="Bearer tokens for programmatic access. Hash-stored — visible only once.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 10 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ATS sync, internal automation…" style={inp} />
        <button onClick={create} style={btnPrimary}>+ Generate</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {SCOPES.map((s) => {
          const on = scopes.has(s);
          return (
            <button key={s} onClick={() => { const next = new Set(scopes); on ? next.delete(s) : next.add(s); setScopes(next); }} style={{ padding: "5px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", background: on ? "rgba(102,187,106,0.15)" : "transparent", border: `1px solid ${on ? "rgba(102,187,106,0.4)" : "rgba(255,255,255,0.1)"}`, color: on ? "#66BB6A" : "#8892A4", fontFamily: "ui-monospace, monospace" }}>{s}</button>
          );
        })}
      </div>
      {revealed && (
        <div style={{ background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#FFC107", marginBottom: 6 }}>⚠ Save this token NOW — it will not be shown again</div>
          <code style={{ display: "block", padding: 8, background: "#0A0E1A", borderRadius: 6, fontSize: 11, color: "#E8EDF5", overflowX: "auto", wordBreak: "break-all" }}>{revealed}</code>
          <button onClick={() => { navigator.clipboard.writeText(revealed); toast.success("Copied"); }} style={{ ...btnGhost, marginTop: 8 }}>Copy</button>
          <button onClick={() => setRevealed(null)} style={{ ...btnGhost, marginTop: 8, marginLeft: 6 }}>Dismiss</button>
        </div>
      )}
      {tokens.length === 0 && <Empty>No tokens yet.</Empty>}
      {tokens.map((t) => (
        <div key={t.id} style={row}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 700 }}>{t.name}</div>
            <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2, fontFamily: "ui-monospace, monospace" }}>{t.prefix}…  · scopes: {t.scopes.join(", ") || "—"} · last used {t.last_used_at ? new Date(t.last_used_at).toLocaleDateString() : "never"}</div>
          </div>
          <button onClick={async () => { if (confirm("Revoke token?")) { await revokeApiToken(t.id); refresh(); } }} style={btnDanger}>Revoke</button>
        </div>
      ))}
    </Section>
  );
}

function CalendarSection() {
  return (
    <Section title="Google Calendar 2-way sync" subtitle="Push CIOS classes/deadlines to Google Calendar; pull events back.">
      <div style={{ background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 10, padding: 14, fontSize: 12, color: "#B0BEC5", lineHeight: 1.7 }}>
        ⚠ <strong style={{ color: "#FFC107" }}>OAuth setup required.</strong> To enable, set up a Google Cloud OAuth client (Calendar API scope) and add <code>GOOGLE_CLIENT_ID</code> + <code>GOOGLE_CLIENT_SECRET</code> to your env.
        Once configured, this panel will show "Connect Google Calendar" → consent flow → token storage → background sync.
        <br /><br />Until then, users can subscribe to their CIOS calendar via the <code>.ics</code> export shipped with the calendar feature.
      </div>
    </Section>
  );
}

function MeetingSection() {
  const [zoomUrl, setZoomUrl] = useState("");
  return (
    <Section title="Zoom / Google Meet auto-link" subtitle="One-tap meeting links for classroom sessions and 1:1s.">
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ background: "rgba(38,198,218,0.08)", border: "1px solid rgba(38,198,218,0.25)", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#26C6DA" }}>📹 Google Meet — works now</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>Class hosts spawn a fresh room with <code>https://meet.google.com/new</code>. Auto-link generation is wired in <code>generateMeetingLink({"{ provider: 'meet' }"})</code>.</div>
        </div>
        <div style={{ background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1E88E5" }}>🔵 Zoom — Personal Meeting URL</div>
          <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4, marginBottom: 8 }}>Paste your Zoom Personal Meeting URL. Full Zoom OAuth automation needs a Zoom Marketplace app (<code>ZOOM_CLIENT_ID</code>/<code>SECRET</code>).</div>
          <input value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} placeholder="https://zoom.us/j/123456789?pwd=…" style={inp} />
        </div>
      </div>
    </Section>
  );
}

/* ─── primitives ─── */
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) { return <div style={{ padding: 14, color: "#5A6478", fontSize: 12, textAlign: "center" }}>{children}</div>; }
const inp: React.CSSProperties = { padding: "9px 12px", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#E8EDF5", fontSize: 13, outline: "none", boxSizing: "border-box" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" };
const btnPrimary: React.CSSProperties = { padding: "9px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "6px 12px", background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" };
