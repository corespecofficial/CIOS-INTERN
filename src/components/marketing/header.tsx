"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface DropItem { href: string; label: string; desc?: string; icon?: string }
interface NavGroup { label: string; href?: string; dropdown?: DropItem[] }

const NAV: NavGroup[] = [
  {
    label: "Features",
    dropdown: [
      { href: "/#features",     label: "All Features",   icon: "⚡", desc: "Full platform overview" },
      { href: "/#how-it-works", label: "How It Works",   icon: "🗺️", desc: "The 6-step journey" },
      { href: "/about",         label: "About CIOS",     icon: "ℹ️",  desc: "Our story and mission" },
      { href: "/#faq",          label: "FAQ",            icon: "❓", desc: "Common questions answered" },
    ],
  },
  {
    label: "Program",
    dropdown: [
      { href: "/success-stories", label: "Success Stories", icon: "🏆", desc: "Graduates who made it" },
      { href: "/demo",            label: "Book a Demo",     icon: "🎯", desc: "See CIOS live, free" },
      { href: "/pricing",         label: "Pricing",         icon: "💰", desc: "Plans and fees" },
    ],
  },
  {
    label: "Recruiters",
    dropdown: [
      { href: "/recruiters",      label: "Recruiter Portal",  icon: "🏢", desc: "Post jobs, find talent" },
      { href: "/talent-showcase", label: "Talent Directory",  icon: "👥", desc: "Browse intern profiles" },
    ],
  },
  {
    label: "Company",
    dropdown: [
      { href: "/press",    label: "Press & Media",  icon: "📰", desc: "Brand assets & contacts" },
      { href: "/careers",  label: "Careers",        icon: "💼", desc: "Join our team" },
      { href: "/contact",  label: "Contact",        icon: "💬", desc: "Get in touch" },
      { href: "/privacy",  label: "Privacy",        icon: "🔒", desc: "How we handle your data" },
      { href: "/terms",    label: "Terms",          icon: "📋", desc: "Program rules" },
    ],
  },
];

function DropdownMenu({ items, onClose }: { items: DropItem[]; onClose: () => void }) {
  return (
    <div className="cios-dropdown">
      {items.map((item) =>
        item.href.startsWith("/#") ? (
          <a key={item.href} href={item.href} className="cios-drop-item" onClick={onClose}>
            <span className="cios-drop-icon">{item.icon}</span>
            <span>
              <span className="cios-drop-label">{item.label}</span>
              {item.desc && <span className="cios-drop-desc">{item.desc}</span>}
            </span>
          </a>
        ) : (
          <Link key={item.href} href={item.href} className="cios-drop-item" onClick={onClose}>
            <span className="cios-drop-icon">{item.icon}</span>
            <span>
              <span className="cios-drop-label">{item.label}</span>
              {item.desc && <span className="cios-drop-desc">{item.desc}</span>}
            </span>
          </Link>
        )
      )}
    </div>
  );
}

function NavItem({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!group.dropdown) {
    return group.href?.startsWith("/#")
      ? <a href={group.href} className="cios-nav-link">{group.label}</a>
      : <Link href={group.href!} className="cios-nav-link">{group.label}</Link>;
  }

  return (
    <div
      ref={ref}
      className="cios-nav-group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={`cios-nav-link cios-nav-btn${open ? " active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {group.label}
        <svg
          className="cios-chevron"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.8"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && <DropdownMenu items={group.dropdown} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const close = () => setMobileOpen(false);

  return (
    <>
      <style>{`
        .cios-mh {
          position: sticky; top: 0; z-index: 60;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(10,14,26,0.95);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
        }
        .cios-mh-row {
          max-width: 1240px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px; height: 62px; gap: 8px;
        }
        .cios-mh-brand {
          display: inline-flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0; white-space: nowrap;
        }
        .cios-mh-brand img { border-radius: 10px; display: block; }
        .cios-brand-title {
          font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 17px;
          background: linear-gradient(135deg, #fff, #1E88E5);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; white-space: nowrap;
        }
        .cios-mh-desktop {
          display: flex; align-items: center; gap: 2px;
          flex: 1; justify-content: center;
        }
        .cios-nav-group { position: relative; }
        .cios-nav-link, .cios-nav-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13.5px; font-weight: 600; color: #8892A4;
          text-decoration: none; padding: 8px 12px; border-radius: 8px;
          background: none; border: none; cursor: pointer;
          transition: color 0.15s, background 0.15s;
          white-space: nowrap; font-family: inherit;
        }
        .cios-nav-link:hover, .cios-nav-btn:hover, .cios-nav-btn.active {
          color: #E8EDF5; background: rgba(255,255,255,0.05);
        }
        .cios-chevron { transition: transform 0.2s; opacity: 0.55; flex-shrink: 0; }
        .cios-dropdown {
          position: absolute; top: calc(100% + 8px); left: 50%;
          transform: translateX(-50%);
          min-width: 230px; background: #0F1424;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 14px; padding: 8px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.6);
          z-index: 200;
          animation: dropIn 0.14s ease;
        }
        @keyframes dropIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .cios-drop-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 9px 10px; border-radius: 9px;
          text-decoration: none; color: #B0BEC5;
          transition: background 0.15s, color 0.15s;
        }
        .cios-drop-item:hover { background: rgba(30,136,229,0.1); color: #E8EDF5; }
        .cios-drop-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
        .cios-drop-label { display: block; font-size: 13px; font-weight: 700; color: inherit; line-height: 1.3; }
        .cios-drop-desc  { display: block; font-size: 11px; color: #5A6478; margin-top: 2px; }
        .cios-drop-item:hover .cios-drop-desc { color: #8892A4; }
        .cios-mh-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .cios-btn-signin {
          font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 10px;
          background: transparent; color: #8892A4;
          border: 1px solid rgba(255,255,255,0.1);
          text-decoration: none; white-space: nowrap;
          transition: background 0.15s, color 0.15s;
        }
        .cios-btn-signin:hover { background: rgba(255,255,255,0.05); color: #E8EDF5; }
        .cios-btn-join {
          font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 10px;
          background: linear-gradient(135deg, #1E88E5, #1565C0); color: #fff;
          text-decoration: none; white-space: nowrap;
          box-shadow: 0 3px 16px rgba(30,136,229,0.35);
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .cios-btn-join:hover { box-shadow: 0 6px 24px rgba(30,136,229,0.5); transform: translateY(-1px); }
        .cios-hamburger {
          display: none; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #E8EDF5; cursor: pointer; padding: 0; flex-shrink: 0;
        }
        .cios-hamburger:hover { background: rgba(30,136,229,0.12); }
        @media (max-width: 960px) {
          .cios-mh-desktop { display: none !important; }
          .cios-hamburger  { display: inline-flex !important; }
          .cios-btn-signin { display: none; }
        }
        @media (max-width: 460px) {
          .cios-mh-actions { display: none !important; }
        }
        .cios-backdrop {
          position: fixed; inset: 62px 0 0 0;
          background: rgba(0,0,0,0.55); z-index: 55;
        }
        .cios-drawer {
          position: fixed; top: 62px; right: 0; bottom: 0;
          width: min(340px, 88vw); z-index: 56;
          background: #0A0E1A;
          border-left: 1px solid rgba(255,255,255,0.07);
          overflow-y: auto;
          animation: slideIn 0.22s ease;
        }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .cios-drawer-sect { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .cios-drawer-head {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; background: none; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700; color: #E8EDF5;
          text-align: left; font-family: inherit; text-decoration: none;
        }
        .cios-drawer-head:hover { background: rgba(255,255,255,0.03); }
        .cios-drawer-chev { transition: transform 0.2s; flex-shrink: 0; }
        .cios-drawer-subs { padding: 0 12px 10px; }
        .cios-drawer-sub {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          text-decoration: none; font-size: 13px; color: #8892A4;
          transition: background 0.15s, color 0.15s;
        }
        .cios-drawer-sub:hover { background: rgba(255,255,255,0.04); color: #E8EDF5; }
        .cios-drawer-cta {
          display: block; margin: 16px 20px; text-align: center;
          padding: 13px; border-radius: 12px;
          background: linear-gradient(135deg, #1E88E5, #1565C0);
          color: #fff; font-size: 15px; font-weight: 700; text-decoration: none;
        }
        .cios-drawer-login {
          display: block; margin: 0 20px 24px; text-align: center;
          padding: 11px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          color: #B0BEC5; font-size: 14px; font-weight: 600; text-decoration: none;
        }
      `}</style>

      <nav className="cios-mh" role="navigation" aria-label="Main navigation">
        <div className="cios-mh-row">
          <Link href="/" className="cios-mh-brand">
            <img src={LOGO} alt="CIOS" width={32} height={32} />
            <span className="cios-brand-title">CIOS Platform</span>
          </Link>

          <div className="cios-mh-desktop">
            {NAV.map((g) => <NavItem key={g.label} group={g} />)}
          </div>

          <div className="cios-mh-actions">
            <Link href="/sign-in" className="cios-btn-signin">Sign In</Link>
            <Link href="/sign-up" className="cios-btn-join">Join Free →</Link>
          </div>

          <button
            className="cios-hamburger"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6L18 18M18 6L6 18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7H20M4 12H20M4 17H20"/></svg>
            }
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <>
          <div className="cios-backdrop" onClick={close} />
          <div className="cios-drawer">
            {NAV.map((g) => (
              <div key={g.label} className="cios-drawer-sect">
                {g.dropdown ? (
                  <>
                    <button
                      className="cios-drawer-head"
                      onClick={() => setExpanded(expanded === g.label ? null : g.label)}
                    >
                      {g.label}
                      <svg
                        className="cios-drawer-chev"
                        style={{ transform: expanded === g.label ? "rotate(180deg)" : "none" }}
                        width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {expanded === g.label && (
                      <div className="cios-drawer-subs">
                        {g.dropdown.map((item) =>
                          item.href.startsWith("/#") ? (
                            <a key={item.href} href={item.href} className="cios-drawer-sub" onClick={close}>
                              <span>{item.icon}</span>{item.label}
                            </a>
                          ) : (
                            <Link key={item.href} href={item.href} className="cios-drawer-sub" onClick={close}>
                              <span>{item.icon}</span>{item.label}
                            </Link>
                          )
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  g.href?.startsWith("/#") ? (
                    <a href={g.href} className="cios-drawer-head" style={{ display: "flex" }} onClick={close}>{g.label}</a>
                  ) : (
                    <Link href={g.href!} className="cios-drawer-head" onClick={close}>{g.label}</Link>
                  )
                )}
              </div>
            ))}
            <Link href="/sign-up" className="cios-drawer-cta" onClick={close}>Join Free →</Link>
            <Link href="/sign-in" className="cios-drawer-login" onClick={close}>Sign In</Link>
          </div>
        </>
      )}
    </>
  );
}
