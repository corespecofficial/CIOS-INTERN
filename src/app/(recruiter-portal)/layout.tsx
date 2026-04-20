/**
 * Recruiter-portal root layout (Phase 3).
 *
 * Minimal — just the page background + theme. The CIOS branding, "Public
 * board ↗" link, and "Upgrade" CTA all live in the sidebar (RecruiterNav)
 * now so the recruiter shell mirrors the intern app shell: a full-height
 * fixed sidebar with content offset by its width.
 *
 * The onboarding gate + sidebar/main split is handled by the inner
 * (recruiter-portal)/recruiter/layout.tsx + RecruiterShell.
 */

import type { ReactNode } from "react";

export default function RecruiterPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="recruiter"
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        color: "#E8EDF5",
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  );
}
