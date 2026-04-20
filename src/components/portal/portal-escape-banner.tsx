"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * Portal escape hatch.
 *
 * Some intern-only pages (notably /messages, the Ably inbox) are still
 * rendered in the intern (app) shell. When a recruiter / instructor /
 * investor / mentor / alumni navigates there, they'd previously get
 * stuck in the intern sidebar with no obvious path back to their own
 * portal. This sticky banner appears for those roles and offers a
 * one-click return to their home portal.
 *
 * Hidden when the user is already on a route that belongs to their
 * portal (so it doesn't show on /recruiter for a recruiter, etc.) and
 * for intern/team_lead/admin/super_admin (their home is `/dashboard`
 * already in the same shell, so no escape is needed).
 */

const PORTAL_HOME: Record<string, { href: string; label: string; tint: string }> = {
  recruiter:        { href: "/recruiter",       label: "Recruiter Portal",   tint: "#FB923C" },
  instructor:       { href: "/instructor",      label: "Instructor Portal",  tint: "#A855F7" },
  mentor:           { href: "/mentor",          label: "Mentor Hub",         tint: "#26C6DA" },
  alumni:           { href: "/alumni",          label: "Alumni Hub",         tint: "#FBBF24" },
  investor:         { href: "/investor/dashboard", label: "Investor Portal", tint: "#34D399" },
  startup_founder:  { href: "/startup",         label: "Startup Portal",     tint: "#F97316" },
  partner_org:      { href: "/partner-portal",  label: "Partner Portal",     tint: "#0EA5E9" },
};

export function PortalEscapeBanner() {
  const { user, isLoaded } = useUser();
  const pathname = usePathname() || "";

  if (!isLoaded || !user) return null;
  const role = (user.publicMetadata?.role as string | undefined) ?? "intern";
  const dest = PORTAL_HOME[role];
  if (!dest) return null;

  // Already in the user's own portal? Hide.
  if (pathname.startsWith(dest.href)) return null;

  return (
    <div
      role="region"
      aria-label="Return to your portal"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 60,
        padding: "10px 18px",
        background: `linear-gradient(180deg, ${dest.tint}22, ${dest.tint}11)`,
        borderBottom: `1px solid ${dest.tint}55`,
        backdropFilter: "saturate(140%) blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 12, color: "#E2E8F0", fontWeight: 600, lineHeight: 1.45 }}>
        You're viewing the shared platform area —{" "}
        <span style={{ color: dest.tint, fontWeight: 800 }}>{dest.label}</span> is your home.
      </span>
      <Link
        href={dest.href}
        style={{
          padding: "7px 14px",
          borderRadius: 999,
          background: dest.tint,
          color: "#0A0E1A",
          fontSize: 12,
          fontWeight: 800,
          textDecoration: "none",
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
          boxShadow: `0 8px 18px -8px ${dest.tint}aa`,
        }}
      >
        ← Back to {dest.label}
      </Link>
    </div>
  );
}
