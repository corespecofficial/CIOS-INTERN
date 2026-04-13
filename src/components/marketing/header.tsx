"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const NAV_LINKS: { href: string; label: string; anchor?: boolean }[] = [
  { href: "/#features", label: "Features", anchor: true },
  { href: "/about", label: "About" },
  { href: "/recruiters", label: "For Recruiters" },
  { href: "/talent-showcase", label: "Talent" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/#faq", label: "FAQ", anchor: true },
];

const MOBILE_BREAKPOINT = 900;

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 60,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(10,14,26,0.92)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", height: 60,
        gap: 12,
      }}>
        {/* Brand */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          textDecoration: "none", flexShrink: 0,
          minWidth: 0,
        }}>
          <img src={LOGO} alt="CIOS" width={32} height={32} style={{ borderRadius: 10, flexShrink: 0, display: "block" }} />
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700, fontSize: isMobile ? 16 : 18,
            background: "linear-gradient(135deg, #fff, #1E88E5)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            CIOS{isMobile ? "" : " Platform"}
          </span>
        </Link>

        {/* Right side — desktop nav OR mobile hamburger only */}
        {!isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexShrink: 0 }}>
            {NAV_LINKS.map((n) => (
              n.anchor
                ? <a key={n.href} href={n.href} style={linkStyle}>{n.label}</a>
                : <Link key={n.href} href={n.href} style={linkStyle}>{n.label}</Link>
            ))}
            <Link href="/sign-in" style={{
              fontSize: 14, fontWeight: 700, padding: "10px 22px", borderRadius: 12,
              background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
              textDecoration: "none", boxShadow: "0 4px 20px rgba(30,136,229,0.35)",
              whiteSpace: "nowrap",
            }}>Sign In</Link>
          </div>
        ) : (
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 42, height: 42, borderRadius: 10,
              background: mobileOpen ? "rgba(30,136,229,0.18)" : "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E8EDF5", cursor: "pointer", flexShrink: 0,
              padding: 0,
            }}
          >
            {/* Hamburger / close icon — pure SVG so no emoji rendering surprises */}
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7 H20 M4 12 H20 M4 17 H20" /></svg>
            )}
          </button>
        )}
      </div>

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: "fixed", inset: "60px 0 0 0",
              background: "rgba(0,0,0,0.5)", zIndex: 55,
              animation: "cios-fade 0.2s ease",
            }}
          />
          {/* Slide panel */}
          <div style={{
            position: "fixed", top: 60, right: 0, bottom: 0,
            width: "min(320px, 85vw)", zIndex: 56,
            background: "#0A0E1A",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            padding: "24px 20px",
            display: "flex", flexDirection: "column", gap: 4,
            overflowY: "auto",
            animation: "cios-slide 0.25s ease",
          }}>
            {NAV_LINKS.map((n) => {
              const C = n.anchor ? "a" : Link;
              return (
                // @ts-expect-error - dynamic component selection
                <C
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: "block",
                    padding: "14px 12px",
                    borderRadius: 10,
                    fontSize: 16, fontWeight: 600,
                    color: "#E8EDF5",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  {n.label}
                </C>
              );
            })}
            <Link
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              style={{
                marginTop: 18, textAlign: "center",
                padding: "14px 24px", borderRadius: 12,
                background: "linear-gradient(135deg, #1E88E5, #1565C0)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 6px 20px rgba(30,136,229,0.4)",
              }}
            >
              Sign In →
            </Link>
          </div>

          <style>{`
            @keyframes cios-fade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes cios-slide { from { transform: translateX(100%) } to { transform: translateX(0) } }
          `}</style>
        </>
      )}
    </nav>
  );
}

const linkStyle: React.CSSProperties = {
  fontSize: 14, color: "#8892A4", textDecoration: "none",
  transition: "color 0.2s", whiteSpace: "nowrap",
};
