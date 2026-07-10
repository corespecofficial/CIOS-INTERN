"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  chooseVisitor, chooseIntern, redeemOrgInvite, redeemReferralCode,
  redeemSuperAdminCode, applyForRole, type ApplyRoleInput,
} from "@/app/actions/onboarding-intent";

type Step = "pick" | "code" | "apply";

interface Props {
  me: { id: string; name: string; email: string };
  preset: { ref?: string; invite?: string; code?: string };
}

const ROLES: { id: ApplyRoleInput["role"]; label: string; emoji: string; blurb: string; comingSoon?: boolean }[] = [
  { id: "recruiter", label: "Recruiter", emoji: "💼", blurb: "Hiring talent from CIOS." },
  { id: "mentor", label: "Mentor", emoji: "🎓", blurb: "Coach or advise interns 1:1." },
  { id: "company", label: "Company / Employer", emoji: "🏢", blurb: "Host CIOS interns at your org.", comingSoon: true },
  { id: "institution", label: "Institution / University", emoji: "🏛", blurb: "Bring your campus on board.", comingSoon: true },
  { id: "government", label: "Government / Public sector", emoji: "🏦", blurb: "Run state-level skills programmes.", comingSoon: true },
  { id: "partner_org", label: "Partner organisation", emoji: "🤝", blurb: "NGO / accelerator partnership.", comingSoon: true },
  { id: "investor", label: "Investor", emoji: "💸", blurb: "Look at CIOS-incubated startups." },
  { id: "startup_founder", label: "Startup founder", emoji: "🚀", blurb: "Build a startup with CIOS resources." },
];

export function IntentClient({ me, preset }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("pick");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Auto-redeem a preset invite or referral if the user landed here with one.
  useEffect(() => {
    if (preset.invite) handleInvite(preset.invite, true);
    else if (preset.ref) handleReferral(preset.ref, true);
    else if (preset.code) {
      // We don't auto-submit super-admin codes — those need an explicit click.
      setStep("code");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(redirectTo: string) {
    router.replace(redirectTo);
  }

  function handleInvite(token: string, silent = false) {
    setErr(null);
    start(async () => {
      const r = await redeemOrgInvite(token);
      if (!r.ok) { if (!silent) setErr(r.error); return; }
      go(r.data!.redirectTo);
    });
  }

  function handleReferral(code: string, silent = false) {
    setErr(null);
    start(async () => {
      const r = await redeemReferralCode(code);
      if (!r.ok) { if (!silent) setErr(r.error); return; }
      go(r.data!.redirectTo);
    });
  }

  function handleVisitor() {
    setErr(null);
    start(async () => {
      const r = await chooseVisitor();
      if (!r.ok) { setErr(r.error); return; }
      go(r.data!.redirectTo);
    });
  }

  function handleIntern() {
    setErr(null);
    start(async () => {
      const r = await chooseIntern();
      if (!r.ok) { setErr(r.error); return; }
      go(r.data!.redirectTo);
    });
  }

  function handleCreateOrgSpace() {
    setErr(null);
    router.replace("/onboarding/organization-space");
  }

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: 24, fontFamily: "'Nunito', sans-serif" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px 0" }}>
        Welcome, {me.name.split(" ")[0]} 👋
      </h1>
      <p style={{ color: "#8892A4", fontSize: 14, margin: "0 0 28px 0" }}>
        One quick question — how do you want to use CIOS? You can change later, but it tells us
        which portal to drop you into.
      </p>

      {err && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#3D1F1F", color: "#FF8A80", fontSize: 13, borderRadius: 8 }}>
          {err}
        </div>
      )}

      {step === "pick" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card
            emoji="👀"
            title="I'm just exploring"
            blurb="Browse organisations, opportunities, and programs. Start small, no commitment."
            cta="Continue as visitor"
            onClick={handleVisitor}
            disabled={pending}
            recommended
          />

          <Card
            emoji="🎓"
            title="I'm starting as an intern"
            blurb="I've been admitted to a CIOS program / cohort and want to begin."
            cta="Begin intern onboarding"
            onClick={handleIntern}
            disabled={pending}
          />

          <CodeCard
            emoji="🔑"
            title="I have an invite or referral code"
            blurb="Org invite link, referral code, or affiliate code. Auto-routes you in."
            placeholder="Paste invite token or referral code"
            onSubmit={(v) => {
              // Heuristic: long alphanumeric → invite token; short word/number → referral code.
              const trimmed = v.trim();
              if (trimmed.length >= 24) handleInvite(trimmed);
              else handleReferral(trimmed);
            }}
            disabled={pending}
          />

          <Card
            emoji="🏢"
            title="I want to create an organization space"
            blurb="Provision a private staff portal and intern portal for a company, school, government program, partner, or cohort."
            cta="Create org space â†’"
            onClick={handleCreateOrgSpace}
            disabled={pending}
          />

          <Card
            emoji="ðŸ¢"
            title="I want an individual portal role"
            blurb="Apply as a mentor, recruiter, investor, founder, or partner contact. This does not create an organization space."
            cta="See role applications →"
            onClick={() => { setErr(null); setStep("apply"); }}
            disabled={pending}
          />

          <Card
            emoji="🛠"
            title="I have a super-admin code"
            blurb="One-time staff code from CIOS leadership. Skips the queue."
            cta="Enter staff code →"
            onClick={() => { setErr(null); setStep("code"); }}
            disabled={pending}
            subdued
          />
        </div>
      )}

      {step === "code" && (
        <CodeStep
          presetCode={preset.code}
          onBack={() => { setStep("pick"); setErr(null); }}
          onSubmit={(code) => {
            setErr(null);
            start(async () => {
              const r = await redeemSuperAdminCode(code);
              if (!r.ok) { setErr(r.error); return; }
              go(r.data!.redirectTo);
            });
          }}
          pending={pending}
        />
      )}

      {step === "apply" && (
        <ApplyStep
          onBack={() => { setStep("pick"); setErr(null); }}
          onSubmit={(role, payload) => {
            setErr(null);
            start(async () => {
              const r = await applyForRole({ role, payload });
              if (!r.ok) { setErr(r.error); return; }
              go(r.data!.redirectTo);
            });
          }}
          pending={pending}
        />
      )}
    </div>
  );
}

function cardEmoji(title: string, fallback: string) {
  if (title.includes("organization space")) return "\u{1F3E2}";
  if (title.includes("individual portal role")) return "\u{1F9ED}";
  return fallback;
}

function cleanCta(label: string) {
  if (label.startsWith("Create org space")) return "Create org space ->";
  if (label.startsWith("See role applications")) return "Apply for role ->";
  if (label.startsWith("Enter staff code")) return "Enter staff code ->";
  return label;
}

function roleEmoji(role: ApplyRoleInput["role"], fallback: string) {
  const emojis: Record<ApplyRoleInput["role"], string> = {
    recruiter: "\u{1F4BC}",
    mentor: "\u{1F393}",
    company: "\u{1F3E2}",
    institution: "\u{1F3DB}",
    government: "\u{1F3E6}",
    partner_org: "\u{1F91D}",
    investor: "\u{1F4B8}",
    startup_founder: "\u{1F680}",
  };

  return emojis[role] ?? fallback;
}

function Card({ emoji, title, blurb, cta, onClick, disabled, recommended, subdued }: { emoji: string; title: string; blurb: string; cta: string; onClick: () => void; disabled?: boolean; recommended?: boolean; subdued?: boolean }) {
  const accent = recommended ? "#1E88E5" : subdued ? "#5A6478" : "#26A69A";
  const displayEmoji = cardEmoji(title, emoji);
  const displayCta = cleanCta(cta);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: "left",
        background: "#111827",
        border: `1px solid ${recommended ? "#1E88E5" : "#1F2937"}`,
        borderRadius: 12,
        padding: 18,
        cursor: disabled ? "wait" : "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        opacity: disabled ? 0.6 : 1,
        color: "#E8EDF5",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{displayEmoji}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, display: "block" }}>{title}</span>
          {recommended && <span style={{ fontSize: 9, color: "#1E88E5", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, padding: "2px 6px", border: "1px solid #1E88E5", borderRadius: 999 }}>recommended</span>}
        </span>
        <span style={{ fontSize: 12, color: "#8892A4", display: "block", marginTop: 2 }}>{blurb}</span>
      </span>
      <span style={{ fontSize: 12, color: accent, fontWeight: 700, flexShrink: 0 }}>{displayCta}</span>
    </button>
  );
}

function CodeCard({ emoji, title, blurb, placeholder, onSubmit, disabled }: { emoji: string; title: string; blurb: string; placeholder: string; onSubmit: (v: string) => void; disabled?: boolean }) {
  const [v, setV] = useState("");
  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, display: "flex", alignItems: "flex-start", gap: 14 }}>
      <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2, marginBottom: 10 }}>{blurb}</div>
        <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v); }} style={{ display: "flex", gap: 8 }}>
          <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} style={{ flex: 1, padding: "8px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 6, color: "#E8EDF5", fontSize: 13 }} />
          <button type="submit" disabled={disabled || !v.trim()} style={{ padding: "8px 16px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Redeem
          </button>
        </form>
      </div>
    </div>
  );
}

function CodeStep({ presetCode, onBack, onSubmit, pending }: { presetCode?: string; onBack: () => void; onSubmit: (code: string) => void; pending: boolean }) {
  const [code, setCode] = useState(presetCode || "");
  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 24 }}>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: "#5A6478", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>← Back</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>Enter your super-admin code</h2>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 16px 0" }}>One-time codes grant a staff role instantly.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) onSubmit(code); }}>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. CIOS-A1B2-XYZ" style={{ width: "100%", padding: "12px 14px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 8, color: "#E8EDF5", fontSize: 16, fontFamily: "ui-monospace, monospace", letterSpacing: 1 }} />
        <button type="submit" disabled={pending || !code.trim()} style={{ marginTop: 14, padding: "12px 24px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {pending ? "Verifying…" : "Redeem code"}
        </button>
      </form>
    </div>
  );
}

function ApplyStep({ onBack, onSubmit, pending }: { onBack: () => void; onSubmit: (role: ApplyRoleInput["role"], payload: Record<string, unknown>) => void; pending: boolean }) {
  const [picked, setPicked] = useState<ApplyRoleInput["role"] | null>(null);
  const [orgName, setOrgName] = useState("");
  const [why, setWhy] = useState("");
  const [linkedin, setLinkedin] = useState("");

  if (!picked) {
    return (
      <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 24 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: "#5A6478", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>Apply for a role</h2>
        <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 16px 0" }}>Pick what you&apos;re applying as. Super-admin reviews each one.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setPicked(r.id)}
              style={{
                textAlign: "left",
                background: "#0A0E1A",
                border: r.comingSoon ? "1px solid rgba(255,193,7,0.30)" : "1px solid #1F2937",
                borderRadius: 10,
                padding: 14,
                cursor: "pointer",
                color: "#E8EDF5",
                fontFamily: "inherit",
                position: "relative",
              }}
            >
              {r.comingSoon && (
                <span style={{ position: "absolute", top: 8, right: 8, fontSize: 8, fontWeight: 800, color: "#FFC107", background: "rgba(255,193,7,0.12)", padding: "2px 6px", borderRadius: 999, letterSpacing: 0.5 }}>
                  WAITLIST
                </span>
              )}
              <div style={{ fontSize: 22, marginBottom: 4 }}>{roleEmoji(r.id, r.emoji)}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>{r.blurb}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = ROLES.find((x) => x.id === picked)!;

  return (
    <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 24 }}>
      <button onClick={() => setPicked(null)} style={{ background: "transparent", border: "none", color: "#5A6478", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12 }}>← Different role</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>Apply as {meta.label}</h2>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 16px 0" }}>Tell us a bit about you. This goes to super-admin review.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (why.trim().length < 30) return;
          onSubmit(picked, {
            organization_name: orgName.trim() || null,
            why: why.trim(),
            linkedin: linkedin.trim() || null,
          });
        }}
      >
        <Field label="Organization / company (optional)">
          <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Inc." style={inputStyle} />
        </Field>
        <Field label="Why CIOS? (min 30 chars)">
          <textarea value={why} onChange={(e) => setWhy(e.target.value)} rows={5} placeholder="What do you want to do here?" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ fontSize: 11, color: why.trim().length < 30 ? "#FF8A80" : "#5A6478", marginTop: 4 }}>
            {why.trim().length} / 30
          </div>
        </Field>
        <Field label="LinkedIn / website (optional)">
          <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://…" style={inputStyle} />
        </Field>
        <button type="submit" disabled={pending || why.trim().length < 30} style={{ marginTop: 8, padding: "12px 24px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#0A0E1A",
  border: "1px solid #1F2937",
  borderRadius: 6,
  color: "#E8EDF5",
  fontSize: 13,
};
