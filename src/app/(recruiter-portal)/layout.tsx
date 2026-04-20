/**
 * Recruiter-portal root layout (Phase 3).
 *
 * This shell wraps every recruiter + talent route with its own chrome —
 * no intern sidebar, no intern bottom nav, no learner announcements. The
 * existing (app)/recruiter/layout.tsx inner layout (onboarding gate +
 * RecruiterNav) still applies underneath.
 */

/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import Link from "next/link";

const CIOS_LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

export default function RecruiterPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-portal="recruiter"
      style={{
        minHeight: "100dvh",
        background: "#0A0E1A",
        color: "#E8EDF5",
        fontFamily: "'Nunito', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,14,26,0.88)",
          backdropFilter: "saturate(140%) blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "11px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Link
            href="/recruiter"
            style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}
          >
            <img src={CIOS_LOGO_URL} alt="CIOS" width={30} height={30} style={{ display: "block" }} />
            <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.5 }}>
              CIOS <span style={{ color: "#FB923C", fontWeight: 700 }}>· Recruiter</span>
            </span>
          </Link>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <Link
              href="/opportunities"
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                background: "transparent",
                color: "#94A3B8",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Public board ↗
            </Link>
            <Link
              href="/recruiter/billing"
              style={{
                padding: "7px 14px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #FB923C, #F97316)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 8px 22px -8px rgba(251,146,60,0.6)",
              }}
            >
              Upgrade
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, padding: "20px 0" }}>
        {children}
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "20px",
          fontSize: 11,
          color: "#64748B",
          textAlign: "center",
        }}
      >
        CIOS Recruiter · vetted Africa-first talent · <Link href="/privacy" style={{ color: "#94A3B8", textDecoration: "none" }}>Privacy</Link>
      </footer>
    </div>
  );
}
