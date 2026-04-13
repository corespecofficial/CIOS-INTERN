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

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* Header-only CSS — overrides ALL global rules with high specificity + !important */}
      <style>{`
        .cios-mh { position: sticky; top: 0; z-index: 60;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(10,14,26,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .cios-mh-row {
          max-width: 1200px; margin: 0 auto;
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center; justify-content: space-between;
          padding: 0 16px; height: 60px; gap: 12px;
        }
        .cios-mh-brand {
          display: inline-flex !important; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0; min-width: 0;
          flex-wrap: nowrap !important; white-space: nowrap !important;
        }
        .cios-mh-brand img { border-radius: 10px; flex-shrink: 0; display: block; }
        .cios-mh-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700; font-size: 18px;
          background: linear-gradient(135deg, #fff, #1E88E5);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; color: transparent;
          white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis;
        }
        .cios-mh-title-long { display: inline; }
        .cios-mh-title-short { display: none; }

        /* Desktop nav — visible by default, hidden on mobile */
        .cios-mh-desktop { display: flex !important; align-items: center; gap: 22px; flex-shrink: 0; flex-wrap: nowrap !important; }
        .cios-mh-link { font-size: 14px; color: #8892A4; text-decoration: none; transition: color 0.2s; white-space: nowrap; }
        .cios-mh-link:hover { color: #fff; }
        .cios-mh-signin {
          font-size: 14px; font-weight: 700; padding: 10px 22px; border-radius: 12px;
          background: linear-gradient(135deg, #1E88E5, #1565C0); color: #fff;
          text-decoration: none; box-shadow: 0 4px 20px rgba(30,136,229,0.35);
          white-space: nowrap;
        }

        /* Hamburger button — hidden on desktop */
        .cios-mh-hamburger {
          display: none;
          align-items: center; justify-content: center;
          width: 42px; height: 42px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #E8EDF5; cursor: pointer; flex-shrink: 0; padding: 0;
        }
        .cios-mh-hamburger:hover { background: rgba(30,136,229,0.18); }

        /* ── MOBILE BREAKPOINT ── */
        @media (max-width: 900px) {
          .cios-mh-desktop { display: none !important; }
          .cios-mh-hamburger { display: inline-flex !important; }
          .cios-mh-title-long { display: none; }
          .cios-mh-title-short { display: inline; }
          .cios-mh-title { font-size: 17px; }
        }

        /* Drawer */
        .cios-mh-backdrop {
          position: fixed; inset: 60px 0 0 0;
          background: rgba(0,0,0,0.5); z-index: 55;
          animation: cios-mh-fade 0.2s ease;
        }
        .cios-mh-drawer {
          position: fixed; top: 60px; right: 0; bottom: 0;
          width: min(320px, 85vw); z-index: 56;
          background: #0A0E1A;
          border-left: 1px solid rgba(255,255,255,0.07);
          padding: 24px 20px;
          display: flex; flex-direction: column; gap: 4px;
          overflow-y: auto;
          animation: cios-mh-slide 0.25s ease;
        }
        .cios-mh-drawer-link {
          display: block; padding: 14px 12px; border-radius: 10px;
          font-size: 16px; font-weight: 600; color: #E8EDF5;
          text-decoration: none;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .cios-mh-drawer-link:hover { background: rgba(255,255,255,0.04); }
        .cios-mh-drawer-cta {
          margin-top: 18px; text-align: center;
          padding: 14px 24px; border-radius: 12px;
          background: linear-gradient(135deg, #1E88E5, #1565C0);
          color: #fff; font-size: 15px; font-weight: 700;
          text-decoration: none;
          box-shadow: 0 6px 20px rgba(30,136,229,0.4);
        }
        @keyframes cios-mh-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cios-mh-slide { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>

      <nav className="cios-mh">
        <div className="cios-mh-row">
          {/* Brand */}
          <Link href="/" className="cios-mh-brand">
            <img src={LOGO} alt="CIOS" width={32} height={32} />
            <span className="cios-mh-title">
              <span className="cios-mh-title-long">CIOS Platform</span>
              <span className="cios-mh-title-short">CIOS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="cios-mh-desktop">
            {NAV_LINKS.map((n) => (
              n.anchor
                ? <a key={n.href} href={n.href} className="cios-mh-link">{n.label}</a>
                : <Link key={n.href} href={n.href} className="cios-mh-link">{n.label}</Link>
            ))}
            <Link href="/sign-in" className="cios-mh-signin">Sign In</Link>
          </div>

          {/* Hamburger (mobile only) */}
          <button
            className="cios-mh-hamburger"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6 L18 18 M18 6 L6 18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7 H20 M4 12 H20 M4 17 H20" /></svg>
            )}
          </button>
        </div>
      </nav>

      {/* Drawer */}
      {mobileOpen && (
        <>
          <div className="cios-mh-backdrop" onClick={() => setMobileOpen(false)} />
          <div className="cios-mh-drawer">
            {NAV_LINKS.map((n) => (
              n.anchor
                ? <a key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="cios-mh-drawer-link">{n.label}</a>
                : <Link key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="cios-mh-drawer-link">{n.label}</Link>
            ))}
            <Link href="/sign-in" onClick={() => setMobileOpen(false)} className="cios-mh-drawer-cta">Sign In →</Link>
          </div>
        </>
      )}
    </>
  );
}
