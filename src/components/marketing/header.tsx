"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";

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

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(10,14,26,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    }}>
      <div className="cios-mh-row" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, flexWrap: "nowrap", gap: 8 }}>
        <Link href="/" className="cios-mh-brand" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
          <img src={LOGO} alt="CIOS" width={32} height={32} style={{ borderRadius: 10, flexShrink: 0 }} />
          <span className="cios-mh-title" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, background: "linear-gradient(135deg, #fff, #1E88E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", whiteSpace: "nowrap" }}>CIOS Platform</span>
        </Link>

        {/* Desktop nav */}
        <div className="cios-desktop-nav" style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          {NAV_LINKS.map((n) => (
            n.anchor
              ? <a key={n.href} href={n.href} style={linkStyle}>{n.label}</a>
              : <Link key={n.href} href={n.href} style={linkStyle}>{n.label}</Link>
          ))}
          <Link href="/sign-in" style={{
            fontSize: 14, fontWeight: 700, padding: "10px 24px", borderRadius: 12,
            background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", textDecoration: "none",
            boxShadow: "0 4px 20px rgba(30,136,229,0.35)",
          }}>Sign In</Link>
        </div>

        {/* Mobile menu button */}
        <button className="cios-mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" style={{ background: "transparent", border: "none", color: "#E8EDF5", fontSize: 24, cursor: "pointer", display: "none" }}>
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "18px 24px", background: "rgba(10,14,26,0.96)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {NAV_LINKS.map((n) => (
              n.anchor
                ? <a key={n.href} href={n.href} onClick={() => setMobileOpen(false)} style={{ ...linkStyle, fontSize: 16 }}>{n.label}</a>
                : <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} style={{ ...linkStyle, fontSize: 16 }}>{n.label}</Link>
            ))}
            <Link href="/sign-in" onClick={() => setMobileOpen(false)} style={{
              marginTop: 4, textAlign: "center", fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 12,
              background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", textDecoration: "none",
            }}>Sign In</Link>
          </div>
        </div>
      )}

      <style>{`
        /* Force the brand and outer row never to wrap, regardless of any global flex-wrap rules */
        .cios-mh-row, .cios-mh-brand { flex-wrap: nowrap !important; }
        .cios-mh-title { white-space: nowrap !important; }
        /* Switch to hamburger earlier so 7 nav links never crowd the brand */
        @media (max-width: 1024px) {
          .cios-desktop-nav { display: none !important; }
          .cios-mobile-menu { display: flex !important; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; }
        }
        @media (max-width: 380px) {
          .cios-mh-title { font-size: 15px !important; }
        }
      `}</style>
    </nav>
  );
}

const linkStyle: React.CSSProperties = { fontSize: 14, color: "#8892A4", textDecoration: "none", transition: "color 0.2s" };
