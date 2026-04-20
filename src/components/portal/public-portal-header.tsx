"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";

const CIOS_LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

/**
 * Every public portal gets the same top nav. Keep this surface intentionally
 * minimal — each portal provides its own hero/sub-nav below. The goal is
 * recognisable CIOS chrome without stealing focus from the portal content.
 */
const PORTALS: { href: string; label: string }[] = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/creative-space", label: "Creative Spaces" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/hackathons", label: "Hackathons" },
  { href: "/startups", label: "Startups" },
  { href: "/ai-hub", label: "AI Hub" },
  { href: "/study-buddy", label: "Study Buddy" },
  { href: "/documents", label: "Documents" },
];

export function PublicPortalHeader() {
  const pathname = usePathname() || "";
  const { isSignedIn, isLoaded } = useUser();

  return (
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
      {/*
        Header layout uses a three-column grid so the nav is TRULY centred:
          [logo (1fr)]   [centered nav (auto)]   [actions (1fr, end-aligned)]
        Flex with `flex: 1` on the nav (old approach) left-aligned the nav
        because the actions only took as much space as their content.
      */}
      <div
        className="cios-portal-header-row"
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "12px 20px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff", justifySelf: "start" }}
          aria-label="CIOS home"
        >
          <img src={CIOS_LOGO_URL} alt="CIOS" width={32} height={32} style={{ display: "block" }} />
          <span className="cios-wordmark" style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>
            CIOS
          </span>
        </Link>

        <nav
          className="cios-portal-nav"
          style={{
            display: "flex",
            gap: 4,
            overflowX: "auto",
            scrollbarWidth: "none",
            justifyContent: "center",
            maxWidth: "100%",
          }}
          aria-label="Public portals"
        >
          {PORTALS.map((p) => {
            const active = pathname === p.href || pathname.startsWith(p.href + "/");
            return (
              <Link
                key={p.href}
                href={p.href}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  color: active ? "#fff" : "#94A3B8",
                  background: active ? "rgba(30,136,229,0.14)" : "transparent",
                  border: `1px solid ${active ? "rgba(30,136,229,0.35)" : "transparent"}`,
                  textDecoration: "none",
                  transition: "color 120ms ease, background 120ms ease",
                }}
              >
                {p.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", gap: 8, alignItems: "center", justifySelf: "end", flexShrink: 0 }}>
          {isLoaded && isSignedIn ? (
            <Link
              href="/post-auth"
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              My portal →
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <button
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#E8EDF5",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Sign in
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Join CIOS
              </Link>
            </>
          )}
        </div>
      </div>

      <style>{`
        /* Mobile: drop the wordmark and the 3-col grid would let the nav
           squeeze, so collapse to a stacked layout where the scrollable
           nav lives on its own row under the logo/action strip. */
        @media (max-width: 760px) {
          .cios-wordmark { display: none; }
          .cios-portal-header-row {
            grid-template-columns: auto 1fr !important;
            grid-template-areas: "logo actions" "nav nav" !important;
            row-gap: 8px;
          }
          .cios-portal-header-row > a:first-child { grid-area: logo; }
          .cios-portal-header-row > nav { grid-area: nav; justify-content: flex-start !important; }
          .cios-portal-header-row > div:last-child { grid-area: actions; }
        }
        .cios-portal-nav::-webkit-scrollbar { display: none; }
      `}</style>
    </header>
  );
}
