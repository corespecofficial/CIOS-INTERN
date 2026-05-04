"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideRoleApplication } from "@/app/actions/onboarding-intent";

interface App {
  id: string;
  user_id: string;
  applied_role: string;
  payload: Record<string, unknown>;
  status: string;
  notes: string | null;
  created_at: string;
  decided_at: string | null;
  user: { id: string; name: string; email: string; avatar_url: string | null; created_at?: string } | null;
}

const ROLE_INFO: Record<string, {
  emoji: string;
  label: string;
  color: string;
  homePath: string;
  promiseOnApprove: string;
}> = {
  recruiter: {
    emoji: "💼",
    label: "Recruiter",
    color: "#FB923C",
    homePath: "/recruiter",
    promiseOnApprove: "Promotes Clerk role to recruiter, opens the recruiter portal at /recruiter, unlocks talent search + opportunity posting.",
  },
  mentor: {
    emoji: "🎓",
    label: "Mentor",
    color: "#26C6DA",
    homePath: "/mentor",
    promiseOnApprove: "Promotes Clerk role to mentor, surfaces them on /mentorship for matchmaking, lets them book sessions with interns.",
  },
  company: {
    emoji: "🏢",
    label: "Company / Employer",
    color: "#0EA5E9",
    homePath: "/company-portal",
    promiseOnApprove: "Promotes Clerk role to partner_org. Company portal lets them post intern placements + supervisor evaluations.",
  },
  partner_org: {
    emoji: "🤝",
    label: "Partner organisation",
    color: "#34D399",
    homePath: "/partner-portal",
    promiseOnApprove: "Promotes Clerk role to partner_org. Partner portal unlocks institution / NGO / accelerator collaboration tools.",
  },
  investor: {
    emoji: "💸",
    label: "Investor",
    color: "#A855F7",
    homePath: "/investor/dashboard",
    promiseOnApprove: "Promotes Clerk role to investor. Unlocks startup deal-flow + private investor dashboard.",
  },
  startup_founder: {
    emoji: "🚀",
    label: "Startup founder",
    color: "#F97316",
    homePath: "/startup",
    promiseOnApprove: "Promotes Clerk role to startup_founder. Unlocks the founder dashboard + investor visibility.",
  },
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFC107",
  approved: "#26A69A",
  rejected: "#FF8A80",
  withdrawn: "#5A6478",
};

export function ApplicationRow({ app }: { app: App }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(app.notes ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [decided, setDecided] = useState<{ approved: boolean; at: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const info = ROLE_INFO[app.applied_role] || {
    emoji: "📋",
    label: app.applied_role,
    color: "#8892A4",
    homePath: "/dashboard",
    promiseOnApprove: `Promotes Clerk role to ${app.applied_role}.`,
  };

  // Pull the well-known fields applyForRole captures, then anything else
  // for visibility in case future flows store extra payload keys.
  const orgName = (app.payload?.organization_name as string) || null;
  const why = (app.payload?.why as string) || null;
  const linkedin = (app.payload?.linkedin as string) || null;
  const knownKeys = new Set(["organization_name", "why", "linkedin"]);
  const extra = Object.entries(app.payload || {}).filter(([k, v]) => !knownKeys.has(k) && v != null && v !== "");

  function decide(approve: boolean) {
    setErr(null);
    start(async () => {
      const r = await decideRoleApplication(app.id, approve, notes);
      if (!r.ok) { setErr(r.error); return; }
      setDecided({ approved: approve, at: new Date().toISOString() });
      router.refresh();
    });
  }

  const statusColor = STATUS_COLORS[app.status] || "#8892A4";

  return (
    <article style={{ background: "#111827", border: `1px solid ${app.status === "pending" ? `${info.color}33` : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden" }}>
      {/* Color band by role */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${info.color}, transparent)` }} />

      <div style={{ padding: 18 }}>
        {/* Top row: avatar + name + role badge + status */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1E2937", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#8892A4", overflow: "hidden", flexShrink: 0 }}>
            {app.user?.avatar_url ? <img src={app.user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (app.user?.name?.[0]?.toUpperCase() ?? "?")}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>{app.user?.name || "Unknown"}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: `${info.color}22`, color: info.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {info.emoji} {info.label}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5, background: `${statusColor}22`, color: statusColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {app.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#5A6478" }}>
              {app.user?.email}
              {" · Applied "}{new Date(app.created_at).toLocaleString()}
              {app.user?.created_at && <> · Joined {new Date(app.user.created_at).toLocaleDateString()}</>}
            </div>
          </div>

          <button type="button" onClick={() => setOpen(!open)} style={{ padding: "6px 12px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 600, flexShrink: 0 }}>
            {open ? "Close" : "Review"}
          </button>
        </div>

        {/* Inline summary chips when collapsed */}
        {!open && (orgName || linkedin) && (
          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "#8892A4", flexWrap: "wrap" }}>
            {orgName && <span>🏢 {orgName}</span>}
            {linkedin && <a href={linkedin} target="_blank" rel="noreferrer" style={{ color: "#1E88E5", textDecoration: "none" }}>↗ {linkedin.replace(/^https?:\/\//, "").slice(0, 40)}</a>}
          </div>
        )}

        {/* Expanded body */}
        {open && (
          <div style={{ marginTop: 16, padding: 16, background: "#0A0E1A", borderRadius: 10 }}>
            {/* Quick facts */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
              {orgName && <Fact label="Organization">{orgName}</Fact>}
              {linkedin && <Fact label="Link"><a href={linkedin} target="_blank" rel="noreferrer" style={{ color: "#1E88E5", textDecoration: "none" }}>↗ Open</a></Fact>}
              <Fact label="Email">{app.user?.email || "—"}</Fact>
              <Fact label="Submitted">{new Date(app.created_at).toLocaleDateString()}</Fact>
            </div>

            {/* Why */}
            {why && (
              <Section title="Why CIOS / what they want to do">
                <p style={{ fontSize: 13, color: "#C7CFD8", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{why}</p>
              </Section>
            )}

            {/* Extra payload */}
            {extra.length > 0 && (
              <Section title="Additional answers">
                <dl style={{ margin: 0, fontSize: 12, color: "#C7CFD8" }}>
                  {extra.map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 12, padding: "4px 0" }}>
                      <dt style={{ minWidth: 140, color: "#5A6478", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</dt>
                      <dd style={{ margin: 0 }}>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            {/* On approve callout */}
            {app.status === "pending" && (
              <div style={{ marginTop: 16, padding: "12px 14px", background: `${info.color}11`, border: `1px dashed ${info.color}55`, borderRadius: 8, fontSize: 12, color: info.color, lineHeight: 1.5 }}>
                <strong>On approve:</strong> {info.promiseOnApprove}
                {" Their next sign-in routes them to "}<code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4, color: "#E8EDF5", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>{info.homePath}</code>
                {". Notes you write below are sent to the applicant."}
              </div>
            )}

            {/* Decision area (pending only) */}
            {app.status === "pending" && !decided && (
              <>
                <div style={{ marginTop: 14 }}>
                  <label htmlFor={`app-notes-${app.id}`} style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6, fontWeight: 700 }}>Notes (optional, sent to applicant)</label>
                  <textarea
                    id={`app-notes-${app.id}`}
                    aria-label="Reviewer notes"
                    title="Reviewer notes (sent to applicant)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder={app.applied_role === "recruiter" ? "e.g. 'Approved — please complete your company profile at /recruiter/onboarding.'" : "e.g. 'Welcome aboard. Set up your profile and you'll be visible on /mentorship.'"}
                    style={{ width: "100%", padding: "10px 12px", background: "#111827", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, color: "#E8EDF5", fontSize: 13, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                  />
                </div>
                {err && <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(239,83,80,0.12)", color: "#FF8A80", fontSize: 12, borderRadius: 6 }}>{err}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => decide(true)} disabled={pending} style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`, color: "#0A0E1A", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: pending ? "not-allowed" : "pointer" }}>
                    {pending ? "Promoting…" : `✓ Approve & promote to ${info.label}`}
                  </button>
                  <button type="button" onClick={() => { if (!confirm(`Reject ${app.user?.name || "this applicant"}?`)) return; decide(false); }} disabled={pending} style={{ padding: "10px 20px", background: "transparent", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.40)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer" }}>
                    Reject
                  </button>
                </div>
              </>
            )}

            {/* Just-decided banner */}
            {decided && (
              <div style={{ marginTop: 14, padding: 14, background: decided.approved ? "rgba(38,166,154,0.12)" : "rgba(239,83,80,0.10)", border: `1px solid ${decided.approved ? "rgba(38,166,154,0.40)" : "rgba(239,83,80,0.30)"}`, borderRadius: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: decided.approved ? "#26A69A" : "#FF8A80", marginBottom: 4 }}>
                  {decided.approved ? "✅ Approved" : "Rejected"}
                </div>
                <div style={{ fontSize: 12, color: "#C7CFD8" }}>
                  {decided.approved
                    ? <>Clerk role promoted to <strong>{app.applied_role}</strong>. Applicant has been notified and will land at <code style={{ fontFamily: "ui-monospace, monospace", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: 4, color: "#E8EDF5", fontSize: 11 }}>{info.homePath}</code> on next sign-in.</>
                    : "The applicant has been notified with your reviewer notes."}
                </div>
              </div>
            )}

            {/* Decided history (non-pending) */}
            {app.status !== "pending" && !decided && (
              <div style={{ marginTop: 14, padding: 12, background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 12, color: "#8892A4" }}>
                <div>Decided {app.decided_at ? new Date(app.decided_at).toLocaleString() : "—"}</div>
                {app.notes && <div style={{ marginTop: 6, color: "#C7CFD8", whiteSpace: "pre-wrap" }}><strong style={{ color: "#5A6478", fontWeight: 700 }}>Notes:</strong> {app.notes}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#E8EDF5", fontWeight: 600, wordBreak: "break-word" }}>{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, fontWeight: 700 }}>{title}</div>
      {children}
    </div>
  );
}
