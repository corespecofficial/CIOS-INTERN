"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/theme-toggle";

const CIOS_LOGO_URL =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

/**
 * Every public portal gets the same top nav.
 * Desktop: inline pill nav centred in a 3-col grid.
 * Mobile: logo+wordmark on the left, theme toggle + hamburger on the right;
 * tapping the hamburger opens a slide-in drawer with all portals & auth CTAs.
 *
 * `match` lists EXTRA path prefixes that should also highlight a nav item as
 * active (e.g. "Startups" tab points at /investors but should also light up on
 * /startups/[id] detail pages).
 */
const PORTALS: { href: string; label: string; match?: string[]; emoji: string; tint: string }[] = [
  { href: "/marketplace",    label: "Marketplace",     emoji: "🛍️", tint: "#A855F7" },
  { href: "/creative-space", label: "Creative Spaces", emoji: "🎨", tint: "#06B6D4" },
  { href: "/opportunities",  label: "Opportunities",   emoji: "💼", tint: "#FB923C" },
  { href: "/hackathons",     label: "Hackathons",      emoji: "⚡", tint: "#F59E0B" },
  { href: "/investors",      label: "Startups",        emoji: "🚀", tint: "#10B981", match: ["/startups"] },
  { href: "/ai-hub",         label: "AI Hub",          emoji: "✨", tint: "#8B5CF6" },
  { href: "/study-buddy",    label: "Study Buddy",     emoji: "🎓", tint: "#60A5FA" },
  { href: "/documents",      label: "Documents",       emoji: "📄", tint: "#EC4899" },
];

function isActive(pathname: string, p: { href: string; match?: string[] }) {
  const candidates = [p.href, ...(p.match ?? [])];
  return candidates.some((c) => pathname === c || pathname.startsWith(c + "/"));
}

export function PublicPortalHeader() {
  const pathname = usePathname() || "";
  const { isSignedIn, isLoaded } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal target is document.body — only available after mount.
  useEffect(() => { setMounted(true); }, []);

  // Close on route change + lock body scroll while open + ESC to close.
  useEffect(() => { setDrawerOpen(false); }, [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <header
      data-public-portal-header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--portal-header-bg, rgba(10,14,26,0.88))",
        backdropFilter: "saturate(140%) blur(14px)",
        borderBottom: "1px solid var(--border-default, rgba(255,255,255,0.06))",
      }}
    >
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
          className="cios-portal-logo"
          style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "var(--text-primary, #fff)", justifySelf: "start" }}
          aria-label="CIOS home"
        >
          <img src={CIOS_LOGO_URL} alt="CIOS" width={32} height={32} style={{ display: "block" }} />
          <span className="cios-wordmark" style={{ fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>
            CIOS
          </span>
        </Link>

        {/* Desktop inline nav — hidden on mobile via CSS */}
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
            const active = isActive(pathname, p);
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
                  color: active ? "var(--portal-nav-active, #fff)" : "var(--portal-nav-idle, #94A3B8)",
                  background: active ? "var(--portal-nav-active-bg, rgba(30,136,229,0.14))" : "transparent",
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

        <div
          className="cios-portal-actions"
          style={{ display: "flex", gap: 8, alignItems: "center", justifySelf: "end", flexShrink: 0 }}
        >
          <ThemeToggle compact />

          {/* Desktop auth CTAs — hidden on mobile (moved into drawer). */}
          <div className="cios-portal-auth-desktop" style={{ display: "flex", gap: 8 }}>
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
                      border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
                      color: "var(--text-primary, #E8EDF5)",
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

          {/* Hamburger — shown only on mobile */}
          <button
            className="cios-portal-hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="cios-portal-drawer"
            style={{
              display: "none",          // CSS flips to flex on mobile
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
              background: "var(--bg-secondary, rgba(255,255,255,0.04))",
              color: "var(--text-primary, #F8FAFC)",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              fontFamily: "inherit",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer — portaled to document.body so it escapes the header's
          backdrop-filter containing block (which would otherwise anchor
          position:fixed children to the header, not the viewport). */}
      {mounted && drawerOpen && createPortal(
        <MobileDrawer
          pathname={pathname}
          isSignedIn={!!isSignedIn}
          isLoaded={isLoaded}
          onClose={() => setDrawerOpen(false)}
        />,
        document.body,
      )}

      <style>{`
        .cios-portal-nav::-webkit-scrollbar { display: none; }

        /* Mobile: wordmark stays visible, inline nav + desktop auth CTAs hide,
           hamburger flips from display:none → flex. */
        @media (max-width: 760px) {
          .cios-portal-header-row {
            grid-template-columns: auto 1fr !important;
            gap: 10px !important;
          }
          .cios-portal-nav { display: none !important; }
          .cios-portal-auth-desktop { display: none !important; }
          .cios-portal-hamburger { display: inline-flex !important; }
        }
      `}</style>
    </header>
  );
}

/* ──────────────────────── Mobile drawer ──────────────────────── */

function MobileDrawer({
  pathname,
  isSignedIn,
  isLoaded,
  onClose,
}: {
  pathname: string;
  isSignedIn: boolean;
  isLoaded: boolean;
  onClose: () => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, fontFamily: "'Nunito', system-ui, sans-serif" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8,12,24,0.55)",
          backdropFilter: "blur(6px)",
          animation: "ciosDrawerFade 200ms ease both",
        }}
      />

      {/* Sidebar — className-based theme styling so nothing can leak through */}
      <aside
        id="cios-portal-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="cios-drawer-aside"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(340px, 86vw)",
          boxShadow: "-24px 0 60px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          animation: "ciosDrawerSlide 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        {/* Header strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px",
            borderBottom: "1px solid var(--border-default, rgba(255,255,255,0.06))",
            background: "linear-gradient(180deg, rgba(139,92,246,0.12), transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={CIOS_LOGO_URL}
              alt=""
              width={32}
              height={32}
              style={{ display: "block", borderRadius: 8 }}
            />
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 1, color: "var(--text-primary, #F8FAFC)" }}>
                CIOS
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary, #94A3B8)", letterSpacing: 0.3, marginTop: 1 }}>
                Portals & spaces
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: "1px solid var(--border-default, rgba(255,255,255,0.10))",
              background: "var(--bg-tertiary, rgba(255,255,255,0.04))",
              color: "var(--text-primary, #F8FAFC)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Nav list */}
        <nav
          aria-label="Public portals"
          style={{ flex: 1, overflowY: "auto", padding: "12px 12px 18px" }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 2,
              color: "var(--text-muted, #94A3B8)",
              textTransform: "uppercase",
              padding: "10px 10px 8px",
            }}
          >
            Portals
          </div>
          <div style={{ display: "grid", gap: 2 }}>
            {PORTALS.map((p) => {
              const active = isActive(pathname, p);
              return (
                <Link
                  key={p.href}
                  href={p.href}
                  onClick={onClose}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 12px",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: active ? 800 : 600,
                    color: active ? "var(--text-primary, #F8FAFC)" : "var(--text-secondary, #CBD5E1)",
                    background: active
                      ? `linear-gradient(135deg, ${p.tint}22, ${p.tint}0A)`
                      : "transparent",
                    border: `1px solid ${active ? `${p.tint}44` : "transparent"}`,
                    textDecoration: "none",
                    transition: "background 160ms ease, border-color 160ms ease",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: `${p.tint}1A`,
                      border: `1px solid ${p.tint}33`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      flex: "0 0 auto",
                    }}
                  >
                    {p.emoji}
                  </span>
                  <span style={{ flex: 1 }}>{p.label}</span>
                  {active && (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: p.tint,
                        boxShadow: `0 0 0 3px ${p.tint}22`,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer — auth CTAs */}
        <div
          style={{
            padding: "14px 16px 18px",
            borderTop: "1px solid var(--border-default, rgba(255,255,255,0.06))",
            display: "grid",
            gap: 8,
            background: "linear-gradient(0deg, rgba(30,136,229,0.06), transparent)",
          }}
        >
          {isLoaded && isSignedIn ? (
            <Link
              href="/post-auth"
              onClick={onClose}
              style={{
                padding: "13px 16px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                textAlign: "center",
                boxShadow: "0 8px 20px -8px rgba(30,136,229,0.6)",
              }}
            >
              My portal →
            </Link>
          ) : (
            <>
              <SignInButton mode="modal">
                <button
                  onClick={onClose}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "transparent",
                    border: "1px solid var(--border-default, rgba(255,255,255,0.14))",
                    color: "var(--text-primary, #F8FAFC)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                    width: "100%",
                    fontFamily: "inherit",
                  }}
                >
                  Sign in
                </button>
              </SignInButton>
              <Link
                href="/sign-up"
                onClick={onClose}
                style={{
                  padding: "13px 16px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: "none",
                  textAlign: "center",
                  boxShadow: "0 8px 20px -8px rgba(30,136,229,0.6)",
                }}
              >
                Join CIOS free →
              </Link>
            </>
          )}
        </div>
      </aside>

      <style>{`
        @keyframes ciosDrawerFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ciosDrawerSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        /* Drawer surface — explicit, opaque, theme-aware. Uses !important so
           no global attribute-selector rule can accidentally re-introduce
           translucency. */
        .cios-drawer-aside {
          background-color: #FFFFFF !important;
          color: #0F172A;
          border-left: 1px solid rgba(15,23,42,0.08);
        }
        [data-theme="dark"] .cios-drawer-aside {
          background-color: #0B1022 !important;
          color: #F8FAFC;
          border-left: 1px solid rgba(255,255,255,0.06);
        }
        /* Inner dividers & sub-sections — also theme-aware */
        [data-theme="dark"] .cios-drawer-aside hr,
        [data-theme="dark"] .cios-drawer-aside [data-drawer-divider] {
          border-color: rgba(255,255,255,0.06);
        }
      `}</style>
    </div>
  );
}
