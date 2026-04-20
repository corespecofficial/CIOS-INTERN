/**
 * Public Portal shared layout
 * ---------------------------
 * Chrome for every public-facing portal (Marketplace, Creative Spaces,
 * Opportunities, Hackathons, Study Buddy, AI Hub, Documents, Startups).
 *
 * Differences from the intern/admin `(app)` shell:
 *   - No sidebar. Minimal top nav with CIOS logo + portal switcher + sign-in CTA.
 *   - SEO-friendly: server-rendered metadata hooks.
 *   - Public-first: content renders for anonymous visitors; actions gated via
 *     <ConversionGate>. See masterplan §2.
 *
 * Individual portals live under `(public-portal)/<portal>/` (added in later phases).
 */

import type { ReactNode } from "react";
import { PublicPortalHeader } from "@/components/portal/public-portal-header";
import { PublicPortalFooter } from "@/components/portal/public-portal-footer";

export default function PublicPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="public"
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        color: "#E8EDF5",
        fontFamily: "'Nunito', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PublicPortalHeader />
      <main id="main-content" role="main" style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
      <PublicPortalFooter />
    </div>
  );
}
