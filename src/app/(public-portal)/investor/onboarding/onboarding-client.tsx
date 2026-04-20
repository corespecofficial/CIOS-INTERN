"use client";

import { useRouter } from "next/navigation";
import { upsertInvestorProfile, type InvestorProfile } from "@/app/actions/investor";
import { STARTUP_CATEGORIES, STARTUP_STAGES } from "@/app/actions/startup-types";
import { PortalOnboarding, type OnboardingStep } from "@/components/portal/portal-onboarding";

interface State {
  full_name: string;
  headline: string;
  country: string;
  linkedin_url: string;
  accreditation: InvestorProfile["accreditation"];
  org_name: string;
  cheque_min_usd: number | "";
  cheque_max_usd: number | "";
  thesis: string;
  preferred_categories: string[];
  preferred_stages: string[];
  preferred_geos: string[];
  notable_investments: string;
  intro_email_optin: boolean;
  agreed_to_terms: boolean;
}

const ACCRED_OPTIONS: { value: InvestorProfile["accreditation"]; label: string; sub: string }[] = [
  { value: "individual",       label: "Individual angel",   sub: "Personal cheques from your own capital" },
  { value: "family_office",    label: "Family office",      sub: "Investing on behalf of a family pool" },
  { value: "angel_syndicate",  label: "Angel syndicate",    sub: "You lead deals for a group of LPs" },
  { value: "fund",             label: "Venture fund",       sub: "Institutional VC fund (any stage)" },
  { value: "corporate_vc",     label: "Corporate venture",  sub: "Investing on behalf of a corporate" },
];

const GEO_OPTIONS = ["Nigeria", "Ghana", "Kenya", "South Africa", "Egypt", "Cameroon", "Rest of Africa", "Global"];

const ACCENT = "#10B981";

export function InvestorOnboardingClient({ existing, userName, isEditing }: { existing: InvestorProfile | null; userName: string; isEditing?: boolean }) {
  const router = useRouter();

  const initial: State = {
    full_name: existing?.full_name ?? userName,
    headline: existing?.headline ?? "",
    country: existing?.country ?? "",
    linkedin_url: existing?.linkedin_url ?? "",
    accreditation: existing?.accreditation ?? "individual",
    org_name: existing?.org_name ?? "",
    cheque_min_usd: existing?.cheque_min_usd ?? "",
    cheque_max_usd: existing?.cheque_max_usd ?? "",
    thesis: existing?.thesis ?? "",
    preferred_categories: existing?.preferred_categories ?? [],
    preferred_stages: existing?.preferred_stages ?? [],
    preferred_geos: existing?.preferred_geos ?? [],
    notable_investments: existing?.notable_investments ?? "",
    intro_email_optin: existing?.intro_email_optin ?? true,
    agreed_to_terms: existing?.agreed_to_terms ?? false,
  };

  const steps: OnboardingStep<State>[] = [
    {
      id: "profile",
      title: "Tell us who you are",
      description: "These appear on your investor profile and on intros to founders.",
      validate: (s) => (!s.full_name?.trim() ? "Full name is required" : null),
      render: (s, u) => (
        <Stack>
          <Field label="Full name" required>
            <TextInput value={s.full_name} onChange={(v) => u({ full_name: v })} placeholder="Jane Adeleke" />
          </Field>
          <Field label="Headline" hint="Short one-liner under your name on intros.">
            <TextInput value={s.headline} onChange={(v) => u({ headline: v })} placeholder="Angel · Africa fintech & creator economy" />
          </Field>
          <Two>
            <Field label="Country">
              <TextInput value={s.country} onChange={(v) => u({ country: v })} placeholder="Nigeria" />
            </Field>
            <Field label="LinkedIn">
              <TextInput value={s.linkedin_url} onChange={(v) => u({ linkedin_url: v })} placeholder="https://linkedin.com/in/…" />
            </Field>
          </Two>
        </Stack>
      ),
    },
    {
      id: "accreditation",
      title: "How do you invest?",
      description: "Pick the structure that matches you. Determines what founders see when you show interest.",
      render: (s, u) => (
        <Stack>
          <div style={{ display: "grid", gap: 10 }}>
            {ACCRED_OPTIONS.map((o) => {
              const active = s.accreditation === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => u({ accreditation: o.value })}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: active ? "rgba(16,185,129,0.10)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${active ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)"}`,
                    color: "#F8FAFC",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 800 }}>{o.label}</span>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>{o.sub}</span>
                </button>
              );
            })}
          </div>
          {(s.accreditation === "fund" || s.accreditation === "corporate_vc" || s.accreditation === "family_office" || s.accreditation === "angel_syndicate") && (
            <Field label="Organisation name" required>
              <TextInput value={s.org_name} onChange={(v) => u({ org_name: v })} placeholder="Acme Capital" />
            </Field>
          )}
        </Stack>
      ),
      validate: (s) => {
        const orgRequired = s.accreditation !== "individual";
        if (orgRequired && !s.org_name?.trim()) return "Organisation name is required";
        return null;
      },
    },
    {
      id: "cheque",
      title: "What's your typical cheque?",
      description: "Founders see a range, never a precise number. Helps us route the right deals to you.",
      render: (s, u) => (
        <Two>
          <Field label="Minimum (USD)">
            <NumberInput value={s.cheque_min_usd} onChange={(v) => u({ cheque_min_usd: v })} placeholder="2500" />
          </Field>
          <Field label="Maximum (USD)">
            <NumberInput value={s.cheque_max_usd} onChange={(v) => u({ cheque_max_usd: v })} placeholder="50000" />
          </Field>
        </Two>
      ),
      validate: (s) => {
        if (s.cheque_min_usd !== "" && s.cheque_max_usd !== "" && Number(s.cheque_min_usd) > Number(s.cheque_max_usd)) {
          return "Min cheque cannot exceed max";
        }
        return null;
      },
    },
    {
      id: "thesis",
      title: "What's your thesis?",
      description: "We'll filter your deal flow against these. Pick at least one of each.",
      render: (s, u) => (
        <Stack>
          <Field label="Thesis (optional)" hint="Free text — what you're looking for, what you avoid.">
            <Textarea value={s.thesis} onChange={(v) => u({ thesis: v })} placeholder="Africa-first SaaS, B2B AI, fintech rails. Avoid hardware." />
          </Field>
          <Field label="Categories">
            <Chips
              options={[...STARTUP_CATEGORIES]}
              selected={s.preferred_categories}
              onChange={(next) => u({ preferred_categories: next })}
            />
          </Field>
          <Field label="Stages">
            <Chips
              options={STARTUP_STAGES.map((st) => st.value)}
              selected={s.preferred_stages}
              onChange={(next) => u({ preferred_stages: next })}
              labelFn={(v) => STARTUP_STAGES.find((s) => s.value === v)?.label ?? v}
            />
          </Field>
          <Field label="Geographies">
            <Chips options={GEO_OPTIONS} selected={s.preferred_geos} onChange={(next) => u({ preferred_geos: next })} />
          </Field>
        </Stack>
      ),
    },
    {
      id: "portfolio",
      title: "What you've backed",
      description: "Optional — adds credibility to founders weighing your interest.",
      render: (s, u) => (
        <Stack>
          <Field label="Notable investments" hint="Comma-separated. Just names — no equity details required.">
            <Textarea value={s.notable_investments} onChange={(v) => u({ notable_investments: v })} placeholder="Flutterwave, Kuda Bank, Andela, …" />
          </Field>
        </Stack>
      ),
    },
    {
      id: "prefs",
      title: "Almost done",
      description: "Confirm a couple of preferences and you're in.",
      render: (s, u) => (
        <Stack>
          <Toggle
            checked={s.intro_email_optin}
            onChange={(v) => u({ intro_email_optin: v })}
            label="Email me weekly intros that match my thesis"
            sub="Five hand-picked pitches, every Monday morning. Unsubscribe anytime."
          />
          <Toggle
            checked={s.agreed_to_terms}
            onChange={(v) => u({ agreed_to_terms: v })}
            label="I agree to the CIOS investor terms"
            sub="Founder data is shared in confidence. CIOS does not give investment advice."
          />
        </Stack>
      ),
      validate: (s) => (!s.agreed_to_terms ? "You need to agree to the terms to continue" : null),
    },
  ];

  return (
    <PortalOnboarding<State>
      title={isEditing ? "Update your investor profile" : "Become a CIOS investor"}
      subtitle={isEditing ? "Edit anything below. Your changes save when you submit the last step." : "Six steps. Takes about 3 minutes. You can edit any of this later from your investor settings."}
      initialState={initial}
      steps={steps}
      submitLabel={isEditing ? "Save changes →" : "Open my investor portal →"}
      onSubmit={async (s) => {
        const r = await upsertInvestorProfile({
          full_name: s.full_name,
          headline: s.headline || null,
          country: s.country || null,
          linkedin_url: s.linkedin_url || null,
          accreditation: s.accreditation,
          org_name: s.org_name || null,
          cheque_min_usd: s.cheque_min_usd === "" ? null : Number(s.cheque_min_usd),
          cheque_max_usd: s.cheque_max_usd === "" ? null : Number(s.cheque_max_usd),
          thesis: s.thesis || null,
          preferred_categories: s.preferred_categories,
          preferred_stages: s.preferred_stages,
          preferred_geos: s.preferred_geos,
          notable_investments: s.notable_investments || null,
          intro_email_optin: s.intro_email_optin,
          agreed_to_terms: s.agreed_to_terms,
        });
        if (!r.ok) return r;
        return { ok: true };
      }}
      onDone={() => router.push("/investor/dashboard")}
    />
  );
}

/* ─── Tiny form primitives — kept local to avoid a separate stylesheet ── */

function Stack({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}
function Two({ children }: { children: React.ReactNode }) {
  return <div className="iov-two" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}<style>{`@media (max-width: 540px) { .iov-two { grid-template-columns: 1fr !important; } }`}</style></div>;
}
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: "#94A3B8", fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
          {label} {required && <span style={{ color: "#F87171" }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: 11, color: "#64748B" }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
}
function NumberInput({ value, onChange, placeholder }: { value: number | ""; onChange: (v: number | "") => void; placeholder?: string }) {
  return (
    <input
      type="number"
      value={value === "" ? "" : value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}
function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...inputStyle, minHeight: 88, resize: "vertical" }} />;
}
function Chips({ options, selected, onChange, labelFn }: { options: string[]; selected: string[]; onChange: (next: string[]) => void; labelFn?: (v: string) => string }) {
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              border: `1px solid ${on ? "rgba(16,185,129,0.55)" : "rgba(255,255,255,0.1)"}`,
              background: on ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.025)",
              color: on ? ACCENT : "#CBD5E1",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {labelFn ? labelFn(o) : o}
          </button>
        );
      })}
    </div>
  );
}
function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: 14,
        borderRadius: 12,
        background: checked ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${checked ? "rgba(16,185,129,0.32)" : "rgba(255,255,255,0.07)"}`,
        cursor: "pointer",
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 4, accentColor: ACCENT }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#F8FAFC" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sub}</div>}
      </div>
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(0,0,0,0.35)",
  color: "#F8FAFC",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
