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
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}
          aria-label="CIOS home"
        >
          <img src={CIOS_LOGO_URL} alt="CIOS" width={32} height={32} style={{ display: "block" }} />
          <span className="cios-wordmark" style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>
            CIOS
          </span>
        </Link>

        <nav
          className="cios-portal-nav"
          style={{ display: "flex", gap: 4, marginLeft: 12, overflowX: "auto", flex: 1, scrollbarWidth: "none" }}
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

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
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
        @media (max-width: 720px) {
          .cios-wordmark { display: none; }
          .cios-portal-nav { margin-left: 6px; }
        }
        .cios-portal-nav::-webkit-scrollbar { display: none; }
      `}</style>
    </header>
  );
}
