"use client";

import { Component, useState, type ReactNode } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
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
  children: ReactNode;
  /** Visual variant: inline for list items, card for standalone CTA. */
  variant?: "inline" | "card";
}

type ClerkGateState = {
  available: boolean;
  user: ReturnType<typeof useUser>["user"] | null;
  isLoaded: boolean;
  isSignedIn: boolean;
};

class ClerkGateBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Role-aware conversion wall.
 *
 * Public pages should never crash if Clerk is missing or unavailable. The
 * boundary keeps browse pages alive and falls back to normal sign-in links.
 */
export function ConversionGate(props: ConversionGateProps) {
  const fallbackClerk: ClerkGateState = {
    available: false,
    user: null,
    isLoaded: true,
    isSignedIn: false,
  };

  return (
    <ClerkGateBoundary fallback={<ConversionGateContent {...props} clerk={fallbackClerk} />}>
      <ConversionGateWithClerk {...props} />
    </ClerkGateBoundary>
  );
}

function ConversionGateWithClerk(props: ConversionGateProps) {
  const clerk = useUser();

  return (
    <ConversionGateContent
      {...props}
      clerk={{
        available: true,
        user: clerk.user,
        isLoaded: clerk.isLoaded,
        isSignedIn: clerk.isSignedIn,
      }}
    />
  );
}

function ConversionGateContent({
  allowedRoles,
  action,
  benefit,
  intendedRole = "public_user",
  children,
  variant = "card",
  clerk,
}: ConversionGateProps & { clerk: ClerkGateState }) {
  const [expanded, setExpanded] = useState(false);

  if (!clerk.isLoaded) {
    return (
      <div aria-busy="true" style={{ padding: 20, color: "#6B7280", fontSize: 13 }}>
        Checking access...
      </div>
    );
  }

  const role = (clerk.user?.publicMetadata?.role as Role | undefined) ?? null;
  const rolesOk = !allowedRoles || allowedRoles.length === 0 || (role && allowedRoles.includes(role));

  if (clerk.isSignedIn && rolesOk) return <>{children}</>;

  const needsUpgrade = clerk.isSignedIn && !rolesOk;

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
          <Link href={`/onboarding/${intendedRole}`} style={ctaStyle}>Continue</Link>
        ) : clerk.available ? (
          <SignUpButton mode="modal">
            <button style={ctaStyle}>Sign up free</button>
          </SignUpButton>
        ) : (
          <Link href="/sign-up" style={ctaStyle}>Sign up free</Link>
        )}
      </div>
    );
  }

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
          <Link href={`/onboarding/${intendedRole}`} style={primaryBtn}>
            Continue as {intendedRole.replace("_", " ")}
          </Link>
        ) : clerk.available ? (
          <>
            <SignUpButton mode="modal">
              <button style={primaryBtn}>Join free</button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button style={secondaryBtn}>I have an account</button>
            </SignInButton>
          </>
        ) : (
          <>
            <Link href="/sign-up" style={primaryBtn}>Join free</Link>
            <Link href="/sign-in" style={secondaryBtn}>I have an account</Link>
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
        {expanded ? "hide details" : "what happens when I sign up?"}
      </button>
      {expanded && (
        <div style={{ marginTop: 10, fontSize: 12, color: "#94A3B8", lineHeight: 1.6, textAlign: "left", maxWidth: 480, margin: "10px auto 0" }}>
          - Free to join, no card required
          <br />- Your account stays yours, leave any time
          <br />- Uploads by public users auto-delete after 24h unless you upgrade
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
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.14)",
  cursor: "pointer",
};
