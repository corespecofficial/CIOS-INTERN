"use client";

import { useMemo, useState } from "react";

export interface OnboardingStep<T> {
  id: string;
  title: string;
  description?: string;
  /** Render the step's form. Receive current state + setter. */
  render: (state: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  /** Return an error string to block progression, or null when valid. */
  validate?: (state: T) => string | null;
}

interface PortalOnboardingProps<T extends object> {
  /** Name shown in the header ("Investor onboarding", "Become an instructor"). */
  title: string;
  /** Optional benefit subcopy under the header. */
  subtitle?: string;
  /** Initial form state. */
  initialState: T;
  steps: OnboardingStep<T>[];
  /** Called with the final state when the user hits submit on the last step. */
  onSubmit: (state: T) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Copy for the final submit button. Defaults to "Submit". */
  submitLabel?: string;
  /** Called after a successful submit. */
  onDone?: () => void;
}

/**
 * Reusable onboarding primitive for public-portal roles (investor, instructor,
 * partner_org, etc.). Consumers pass a typed `steps` array plus an
 * `onSubmit` server action. The primitive handles:
 *   - Progress bar + step indicator
 *   - Per-step validation (blocks "Next" with inline error)
 *   - Back/Next/Submit buttons
 *   - Locked submit while the action is in-flight
 *
 * Each portal's onboarding lives under `/onboarding/<role>/` and composes this.
 */
export function PortalOnboarding<T extends object>({
  title,
  subtitle,
  initialState,
  steps,
  onSubmit,
  submitLabel = "Submit",
  onDone,
}: PortalOnboardingProps<T>) {
  const [state, setState] = useState<T>(initialState);
  const [idx, setIdx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const step = steps[idx];
  const isLast = idx === steps.length - 1;
  const percent = useMemo(() => Math.round(((idx + 1) / steps.length) * 100), [idx, steps.length]);

  function update(patch: Partial<T>) {
    setState((s) => ({ ...s, ...patch }));
    if (err) setErr(null);
  }

  async function next() {
    const v = step.validate?.(state) ?? null;
    if (v) { setErr(v); return; }
    if (isLast) {
      setBusy(true);
      const r = await onSubmit(state);
      setBusy(false);
      if (!r.ok) { setErr(r.error); return; }
      onDone?.();
      return;
    }
    setIdx((i) => i + 1);
  }

  function back() {
    if (idx > 0) setIdx((i) => i - 1);
    setErr(null);
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 20px 60px",
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#F8FAFC", letterSpacing: -0.4 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 14, lineHeight: 1.5 }}>{subtitle}</p>
        )}
      </div>

      {/* Progress */}
      <div aria-hidden style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "linear-gradient(90deg, #1E88E5, #60A5FA)",
            transition: "width 240ms ease",
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: "#64748B", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, textAlign: "right" }}>
        Step {idx + 1} of {steps.length}
      </div>

      {/* Step card */}
      <div
        style={{
          marginTop: 18,
          padding: "28px 22px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 18,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#F8FAFC", letterSpacing: -0.3 }}>
            {step.title}
          </h2>
          {step.description && (
            <p style={{ margin: "6px 0 0", color: "#94A3B8", fontSize: 13, lineHeight: 1.6 }}>
              {step.description}
            </p>
          )}
        </div>

        <div>{step.render(state, update)}</div>

        {err && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "rgba(239,83,80,0.1)",
              border: "1px solid rgba(239,83,80,0.35)",
              borderRadius: 10,
              fontSize: 13,
              color: "#FCA5A5",
            }}
          >
            {err}
          </div>
        )}
      </div>

      {/* Footer — Back + Next/Submit */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 18 }}>
        <button
          type="button"
          onClick={back}
          disabled={idx === 0 || busy}
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: "transparent",
            color: "#94A3B8",
            fontSize: 14,
            fontWeight: 600,
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: idx === 0 || busy ? "not-allowed" : "pointer",
            opacity: idx === 0 || busy ? 0.4 : 1,
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={busy}
          style={{
            padding: "12px 26px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #1E88E5, #1565C0)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            border: "none",
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 10px 24px -10px rgba(30,136,229,0.7)",
            minWidth: 160,
          }}
        >
          {busy ? "Submitting…" : isLast ? submitLabel : "Next →"}
        </button>
      </div>
    </div>
  );
}
