"use client";

import { useState } from "react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import type { Role } from "@/store/use-app-store";

interface ConversionGateProps {
  /** Children render only when the visitor is signed in with one of these roles. */
  allowedRoles?: Role[];
  /** Short one-liner explaining what they're trying to do ("Apply for this job"). */
  action: string;
  /** Longer benefit-led copy shown in the upsell card. */
  benefit?: string;
  /** What the user becomes when they sign up here. Defaults to public_user. */
  intendedRole?: Role;
  /** Children rendered once the gate passes. */
  children: React.ReactNode;
  /** Visual variant — "inline" for list items, "card" for standalone CTA, "sheet" for a modal-like experience. */
  variant?: "inline" | "card";
}

/**
 * Role-aware conversion wall.
 *
 * The public-portal philosophy is: let anyone browse, prompt sign-up at the
 * moment of action. This component sits between a browse surface and an action
 * (buy, book, apply, post). It:
 *   1. Renders `children` when the visitor is signed in AND has an allowed role.
 *   2. Otherwise renders a branded sign-up prompt naming the action and benefit.
 *
 * Keep the prompt copy tight — conversions here drive the whole public-portal
 * business model (masterplan §3). Don't over-explain; promise the benefit and
 * get out of the way.
 */
export function ConversionGate({
  allowedRoles,
  action,
  benefit,
  intendedRole = "public_user",
  children,
  variant = "card",
}: ConversionGateProps) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [expanded, setExpanded] = useState(false);

  if (!isLoaded) {
    return (
      <div aria-busy="true" style={{ padding: 20, color: "#6B7280", fontSize: 13 }}>
        Checking access…
      </div>
    );
  }

  const role = (user?.publicMetadata?.role as Role | undefined) ?? null;
  const rolesOk = !allowedRoles || allowedRoles.length === 0 || (role && allowedRoles.includes(role));

  if (isSignedIn && rolesOk) return <>{children}</>;

  const needsUpgrade = isSignedIn && !rolesOk;

  // Inline variant — compact single-line prompt used inside lists / rows.
  if (variant === "inline") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(30,136,229,0.08)",
          border: "1px solid rgba(30,136,229,0.22)",
          fontSize: 13,
        }}
      >
        <span style={{ color: "#CBD5E1" }}>
          Sign up to {action.toLowerCase()}
        </span>
        {needsUpgrade ? (
          <a href={`/onboarding/${intendedRole}`} style={ctaStyle}>Continue</a>
        ) : (
          <SignUpButton mode="modal">
            <button style={ctaStyle}>Sign up free</button>
          </SignUpButton>
        )}
      </div>
    );
  }

  // Card variant — default. Benefit-led CTA card.
  return (
    <div
      style={{
        padding: "28px 22px",
        borderRadius: 18,
        background:
          "radial-gradient(1200px 400px at 80% -10%, rgba(30,136,229,0.18), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        border: "1px solid rgba(255,255,255,0.08)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: 10,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          fontWeight: 800,
          color: "#60A5FA",
          background: "rgba(30,136,229,0.14)",
          border: "1px solid rgba(30,136,229,0.3)",
          marginBottom: 12,
        }}
      >
        One-tap sign up
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#F8FAFC", letterSpacing: -0.3 }}>
        {action}
      </h3>
      {benefit && (
        <p style={{ margin: "0 0 18px", color: "#94A3B8", fontSize: 14, lineHeight: 1.5, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
          {benefit}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {needsUpgrade ? (
          <a href={`/onboarding/${intendedRole}`} style={primaryBtn}>
            Continue as {intendedRole.replace("_", " ")}
          </a>
        ) : (
          <>
            <SignUpButton mode="modal">
              <button style={primaryBtn}>Join free</button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button style={secondaryBtn}>I have an account</button>
            </SignInButton>
          </>
        )}
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginTop: 14,
          background: "transparent",
          border: "none",
          color: "#64748B",
          fontSize: 11,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {expanded ? "▲ hide details" : "▼ what happens when I sign up?"}
      </button>
      {expanded && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#94A3B8", lineHeight: 1.6, textAlign: "left", maxWidth: 480, margin: "10px auto 0" }}>
          • Free to join · no card required
          <br />• Your account stays yours — leave any time
          <br />• Uploads by public users auto-delete after 24h unless you upgrade
        </div>
      )}
    </div>
  );
}

const ctaStyle: React.CSSProperties = {
  padding: "7px 14px",
  borderRadius: 8,
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  padding: "11px 22px",
  borderRadius: 12,
  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
  color: "#fff",
  fontSize: 14,
  fontWeight: 800,
  textDecoration: "none",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 8px 22px -8px rgba(30,136,229,0.6)",
};

const secondaryBtn: React.CSSProperties = {
  padding: "11px 22px",
  borderRadius: 12,
  background: "transparent",
  color: "#E8EDF5",
  fontSize: 14,
  fontWeight: 600,
  border: "1px solid rgba(255,255,255,0.14)",
  cursor: "pointer",
};
