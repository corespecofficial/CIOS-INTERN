"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOrg,
  inviteEmployee,
  createProgram,
  type CorporateOrg,
  type CorporateEmployee,
  type CorporateProgram,
} from "@/app/actions/corporate";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  card2: "#161D2E",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#1E88E5",
  green: "#66BB6A",
  red: "#EF5350",
  gold: "#FFC107",
};

interface Props {
  org: CorporateOrg | null;
  initialEmployees: CorporateEmployee[];
  initialPrograms: CorporateProgram[];
}

export default function CorporateClient({ org, initialEmployees, initialPrograms }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!org) return <CreateOrgFlow onCreated={() => router.refresh()} pending={pending} startTransition={startTransition} err={err} setErr={setErr} />;

  return <OrgDashboard org={org} initialEmployees={initialEmployees} initialPrograms={initialPrograms} />;
}

function CreateOrgFlow({
  onCreated,
  pending,
  startTransition,
  err,
  setErr,
}: {
  onCreated: () => void;
  pending: boolean;
  startTransition: (cb: () => void) => void;
  err: string | null;
  setErr: (e: string | null) => void;
}) {
  const [form, setForm] = useState({ name: "", industry: "", size_range: "1-10" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim()) {
      setErr("Company name is required");
      return;
    }
    startTransition(async () => {
      const res = await createOrg(form);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onCreated();
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "40px 20px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "inline-block", background: "rgba(30,136,229,0.12)", border: "1px solid rgba(30,136,229,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#4DA8FF", marginBottom: 14, textTransform: "uppercase" }}>
        🏢 Corporate Training
      </div>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Train your team on CIOS.</h1>
      <p style={{ margin: "8px 0 24px", color: C.dim, fontSize: 14, lineHeight: 1.6 }}>
        Same platform that trains 1,000s of African interns — now for your company&apos;s onboarding, compliance, and continuing education. <strong style={{ color: C.text }}>14-day free trial</strong>. $199/mo after.
      </p>

      <form onSubmit={submit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>Create your company workspace</h2>

        <Field label="Company name">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Acme Inc."
            style={inputStyle}
          />
        </Field>

        <Field label="Industry (optional)">
          <input
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            placeholder="Fintech, Healthcare, Education…"
            style={inputStyle}
          />
        </Field>

        <Field label="Team size">
          <select value={form.size_range} onChange={(e) => setForm((f) => ({ ...f, size_range: e.target.value }))} style={inputStyle}>
            <option value="1-10">1–10</option>
            <option value="11-50">11–50</option>
            <option value="51-200">51–200</option>
            <option value="201+">201+</option>
          </select>
        </Field>

        {err && (
          <div style={{ color: C.red, fontSize: 13, margin: "10px 0", padding: "8px 12px", background: `${C.red}11`, border: `1px solid ${C.red}44`, borderRadius: 8 }}>
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ width: "100%", marginTop: 18, padding: "12px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
        >
          {pending ? "Creating…" : "Start 14-Day Free Trial →"}
        </button>

        <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(102,187,106,0.08)", border: "1px solid rgba(102,187,106,0.25)", borderRadius: 8, fontSize: 12, color: C.dim, lineHeight: 1.6 }}>
          ✓ 10 employee seats included · ✓ Unlimited courses · ✓ Progress tracking · ✓ Cancel anytime
        </div>
      </form>
    </div>
  );
}

function OrgDashboard({
  org,
  initialEmployees,
  initialPrograms,
}: {
  org: CorporateOrg;
  initialEmployees: CorporateEmployee[];
  initialPrograms: CorporateProgram[];
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [programs, setPrograms] = useState(initialPrograms);
  const [tab, setTab] = useState<"overview" | "employees" | "programs">("overview");
  const [pending, startTransition] = useTransition();
  const [showInvite, setShowInvite] = useState(false);
  const [showProgram, setShowProgram] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeCount = employees.filter((e) => e.status === "active").length;
  const invitedCount = employees.filter((e) => e.status === "invited").length;
  const trialDaysLeft = org.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  function handleInvite(email: string, fullName: string, department: string) {
    setErr(null);
    startTransition(async () => {
      const res = await inviteEmployee(org.id, { email, full_name: fullName || undefined, department: department || undefined });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      if (res.data) setEmployees((prev) => [res.data!, ...prev]);
      setShowInvite(false);
    });
  }

  function handleProgram(title: string, description: string) {
    setErr(null);
    startTransition(async () => {
      const res = await createProgram(org.id, { title, description: description || undefined, course_ids: [] });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      if (res.data) setPrograms((prev) => [res.data!, ...prev]);
      setShowProgram(false);
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .corp-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        @media (max-width: 700px) { .corp-stats { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: `${C.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          🏢
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{org.name}</h1>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 3 }}>
            {org.industry ?? "—"} · {org.size_range ?? "—"} · <span style={{ color: org.subscription_status === "trialing" ? C.gold : C.green, fontWeight: 700 }}>{org.subscription_status}</span>
          </div>
        </div>
        {trialDaysLeft !== null && (
          <div style={{ marginLeft: "auto", padding: "8px 14px", background: `${C.gold}22`, border: `1px solid ${C.gold}44`, borderRadius: 10, fontSize: 12, color: C.gold, fontWeight: 700 }}>
            ⏳ {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left in trial
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="corp-stats">
        <Stat label="Seats" value={`${employees.length}/${org.seat_limit}`} accent={C.accent} />
        <Stat label="Active" value={String(activeCount)} accent={C.green} />
        <Stat label="Pending" value={String(invitedCount)} accent={C.gold} />
        <Stat label="Programs" value={String(programs.length)} accent="#AB47BC" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {[
          { k: "overview" as const, label: "Overview" },
          { k: "employees" as const, label: `Employees (${employees.length})` },
          { k: "programs" as const, label: `Programs (${programs.length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: tab === t.k ? C.accent : "transparent",
              color: tab === t.k ? "#fff" : C.dim,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div style={{ color: C.red, fontSize: 13, marginBottom: 12, padding: "8px 12px", background: `${C.red}11`, border: `1px solid ${C.red}44`, borderRadius: 8 }}>
          {err}
        </div>
      )}

      {tab === "overview" && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22, lineHeight: 1.7 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Getting started</h3>
          <ol style={{ margin: 0, paddingLeft: 20, color: C.dim, fontSize: 14 }}>
            <li>Invite your employees via email — they get a signup link.</li>
            <li>Create a training program and assign courses.</li>
            <li>Track completion, scores, and certificates in real-time.</li>
            <li>Upgrade before your trial ends to keep training running.</li>
          </ol>
          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button onClick={() => { setTab("employees"); setShowInvite(true); }} style={btnPrimary}>+ Invite Employee</button>
            <button onClick={() => { setTab("programs"); setShowProgram(true); }} style={btnGhost}>+ New Program</button>
          </div>
        </div>
      )}

      {tab === "employees" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setShowInvite(true)} style={btnPrimary}>+ Invite Employee</button>
          </div>
          {showInvite && <InviteForm onSubmit={handleInvite} onClose={() => setShowInvite(false)} pending={pending} />}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {employees.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No employees yet. Invite your first one above.</div>
            ) : (
              employees.map((e, i) => (
                <div key={e.id} style={{ padding: "14px 18px", borderBottom: i < employees.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.full_name || e.email}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{e.email} · {e.department || "—"}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: e.status === "active" ? `${C.green}22` : e.status === "invited" ? `${C.gold}22` : `${C.dim}22`, color: e.status === "active" ? C.green : e.status === "invited" ? C.gold : C.dim, fontWeight: 700, textTransform: "uppercase" }}>
                    {e.status}
                  </span>
                  <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: `${C.accent}22`, color: C.accent, fontWeight: 700, textTransform: "uppercase" }}>
                    {e.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "programs" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button onClick={() => setShowProgram(true)} style={btnPrimary}>+ New Program</button>
          </div>
          {showProgram && <ProgramForm onSubmit={handleProgram} onClose={() => setShowProgram(false)} pending={pending} />}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            {programs.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.dim }}>No programs yet. Create your first training program above.</div>
            ) : (
              programs.map((p, i) => (
                <div key={p.id} style={{ padding: "16px 18px", borderBottom: i < programs.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                      {p.description && <div style={{ fontSize: 12, color: C.dim, marginTop: 4, lineHeight: 1.5 }}>{p.description}</div>}
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 6 }}>
                        {p.course_ids.length} course{p.course_ids.length === 1 ? "" : "s"} · {p.is_mandatory ? "Mandatory" : "Optional"}
                      </div>
                    </div>
                    {p.is_mandatory && (
                      <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 999, background: `${C.red}22`, color: C.red, fontWeight: 700, textTransform: "uppercase" }}>
                        Required
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function InviteForm({ onSubmit, onClose, pending }: { onSubmit: (email: string, name: string, dept: string) => void; onClose: () => void; pending: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [dept, setDept] = useState("");
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Invite Employee</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" style={inputStyle} type="email" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (optional)" style={inputStyle} />
      </div>
      <input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Department (optional)" style={{ ...inputStyle, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={btnGhost} disabled={pending}>Cancel</button>
        <button onClick={() => email && onSubmit(email, name, dept)} style={btnPrimary} disabled={pending || !email}>
          {pending ? "Inviting…" : "Send Invite"}
        </button>
      </div>
    </div>
  );
}

function ProgramForm({ onSubmit, onClose, pending }: { onSubmit: (title: string, desc: string) => void; onClose: () => void; pending: boolean }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>New Training Program</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Program title" style={{ ...inputStyle, marginBottom: 10 }} />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={btnGhost} disabled={pending}>Cancel</button>
        <button onClick={() => title && onSubmit(title, desc)} style={btnPrimary} disabled={pending || !title}>
          {pending ? "Creating…" : "Create Program"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, color: C.dim, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 16px",
  background: C.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  color: C.dim,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
