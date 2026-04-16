"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

interface DropItem { href: string; label: string; desc?: string; icon?: string }
interface NavItem  { label: string; href?: string; dropdown?: DropItem[] }

const NAV: NavItem[] = [
  { label: "Home",         href: "/" },
  {
    label: "Features",
    dropdown: [
      { href: "/#features",       label: "All Features",      icon: "⚡", desc: "Full platform overview" },
      { href: "/#how-it-works",   label: "How It Works",      icon: "🗺️", desc: "The 6-step journey" },
      { href: "/faq",             label: "FAQ",               icon: "❓", desc: "All common questions" },
      { href: "/about",           label: "About CIOS",        icon: "ℹ️",  desc: "Our story and mission" },
      { href: "/success-stories", label: "Success Stories",   icon: "🏆", desc: "Real intern outcomes" },
    ],
  },
  {
    label: "Solutions",
    dropdown: [
      { href: "/solutions/ai-automation",             label: "AI & Automation",           icon: "🤖", desc: "Agents, automation, ML, no-code AI" },
      { href: "/solutions/development",               label: "Development & Engineering",  icon: "💻", desc: "Web, mobile, AI-assisted coding" },
      { href: "/solutions/design-creative",           label: "Design & Creative",          icon: "🎨", desc: "UI/UX, AI art, motion, brand" },
      { href: "/solutions/marketing-growth",          label: "Marketing & Growth",         icon: "📣", desc: "SEO, ads, content, community" },
      { href: "/solutions/data-analytics",            label: "Data & Analytics",           icon: "📊", desc: "SQL, BI, Python, AI analytics" },
      { href: "/solutions/business-entrepreneurship", label: "Business & Entrepreneurship",icon: "💼", desc: "Product, sales, startup, freelance" },
    ],
  },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing",      href: "/pricing" },
  { label: "Book a Demo",  href: "/demo" },
  {
    label: "Portals",
    dropdown: [
      { href: "/portals/creator-admin",    label: "Creator Admin",    icon: "👑", desc: "Super admin & owner dashboard" },
      { href: "/portals/mentor-portal",    label: "Mentor Portal",    icon: "🎓", desc: "Mentor sessions & mentees" },
      { href: "/portals/company-portal",   label: "Company Portal",   icon: "🏢", desc: "Post jobs, find talent" },
      { href: "/portals/recruiter-portal", label: "Recruiter Portal", icon: "🔍", desc: "Search intern profiles" },
      { href: "/portals/marketplace",      label: "Marketplace",      icon: "🛒", desc: "Buy & sell digital products" },
    ],
  },
];

function scrollToAnchor(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SmartLink({ href, className, children, onClick }: {
  href: string; className: string; children: React.ReactNode; onClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const anchor = href.startsWith("/#") ? href.slice(2) : href.includes("#") ? href.split("#")[1] : null;

  function handleClick(e: React.MouseEvent) {
    onClick?.();
    if (!href.includes("#")) return;
    e.preventDefault();
    if (pathname === "/" && anchor) {
      scrollToAnchor(anchor);
    } else {
      router.push(href);
    }
  }

  if (href.includes("#")) {
    return <a href={href} className={className} onClick={handleClick}>{children}</a>;
  }
  return <Link href={href} className={className} onClick={onClick}>{children}</Link>;
}

function DropMenu({ items, onClose }: { items: DropItem[]; onClose: () => void }) {
  return (
    <div className="cios-drop">
      {items.map((item) => (
        <SmartLink key={item.href + item.label} href={item.href} className="cios-drop-row" onClick={onClose}>
          <span className="cios-drop-ico">{item.icon}</span>
          <span>
            <span className="cios-drop-lbl">{item.label}</span>
            {item.desc && <span className="cios-drop-sub">{item.desc}</span>}
          </span>
        </SmartLink>
      ))}
    </div>
  );
}

function DesktopNavItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Determine active state.
  // Anchor links (/#section) are never "active" — they're scroll targets, not pages.
  const isActive = item.href
    ? item.href === "/"
      ? pathname === "/"
      : item.href.includes("#")
        ? false
        : pathname.startsWith(item.href)
    : item.dropdown?.some(d => {
        const base = d.href.split("#")[0];
        return base.length > 1 && pathname.startsWith(base);
      });

  if (!item.dropdown) {
    return (
      <SmartLink href={item.href!} className={`cios-nl${isActive ? " cios-active" : ""}`}>
        {item.label}
      </SmartLink>
    );
  }

  return (
    <div ref={ref} className="cios-ng" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`cios-nl cios-nb${open ? " on" : ""}${isActive ? " cios-active" : ""}`} onClick={() => setOpen(v => !v)}>
        {item.label}
        <svg style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", opacity: .55 }}
          width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && <DropMenu items={item.dropdown} onClose={() => setOpen(false)} />}
    </div>
  );
}

export function MarketingHeader() {
  const [mob, setMob] = useState(false);
  const [exp, setExp] = useState<string | null>(null);
  const close = () => setMob(false);

  useEffect(() => {
    document.body.style.overflow = mob ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mob]);

  return (
    <>
      <style>{`
        .cios-hdr {
          position: sticky; top: 0; z-index: 60;
          background: rgba(10,14,26,0.96);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
        }
        .cios-hdr-row {
          max-width: 1280px; margin: 0 auto;
          position: relative;
          display: flex; align-items: center; height: 62px;
          padding: 0 24px;
        }
        /* brand */
        .cios-brand {
          display: inline-flex; align-items: center; gap: 9px;
          text-decoration: none; flex-shrink: 0; margin-right: 16px;
        }
        .cios-brand img { border-radius: 9px; display: block; }
        .cios-brand-lbl {
          font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 16px;
          background: linear-gradient(135deg, #fff 40%, #1E88E5);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; white-space: nowrap;
        }
        /* desktop nav — absolutely centered so it stays in the middle
           regardless of logo/CTA width differences */
        .cios-nav {
          position: absolute; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 2px;
          pointer-events: auto;
        }
        .cios-ng  { position: relative; }
        .cios-nl, .cios-nb {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 7px 11px; border-radius: 8px;
          font-size: 13px; font-weight: 600; color: #8892A4;
          text-decoration: none; background: none; border: none;
          cursor: pointer; white-space: nowrap; font-family: inherit;
          transition: color .15s, background .15s;
        }
        .cios-nl:hover, .cios-nb:hover, .cios-nb.on {
          color: #E8EDF5; background: rgba(255,255,255,0.05);
        }
        .cios-nl[href="/demo"] {
          color: #FFC107; border: 1px solid rgba(255,193,7,0.3);
          border-radius: 8px;
        }
        .cios-nl[href="/demo"]:hover {
          background: rgba(255,193,7,0.1); color: #FFD54F;
          border-color: rgba(255,193,7,0.5);
        }
        /* active page indicator */
        .cios-active {
          color: #E8EDF5 !important;
          position: relative;
        }
        .cios-active::after {
          content: "";
          position: absolute; bottom: -2px; left: 50%;
          transform: translateX(-50%);
          width: 18px; height: 2px; border-radius: 99px;
          background: linear-gradient(135deg, #1E88E5, #42A5F5);
        }
        /* dropdown panel */
        .cios-drop {
          position: absolute; top: calc(100% + 8px); left: 50%;
          transform: translateX(-50%);
          min-width: 240px; background: #0F1424;
          border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
          padding: 8px; z-index: 300;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          animation: dropIn .13s ease;
        }
        @keyframes dropIn {
          from { opacity:0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
        .cios-drop-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 8px 10px; border-radius: 9px;
          text-decoration: none; color: #B0BEC5;
          transition: background .15s, color .15s;
        }
        .cios-drop-row:hover { background: rgba(30,136,229,0.1); color: #E8EDF5; }
        .cios-drop-ico  { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
        .cios-drop-lbl  { display: block; font-size: 13px; font-weight: 700; line-height: 1.3; }
        .cios-drop-sub  { display: block; font-size: 11px; color: #5A6478; margin-top: 1px; }
        .cios-drop-row:hover .cios-drop-sub { color: #8892A4; }
        /* cta */
        .cios-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }
        .cios-btn-in {
          font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 10px;
          color: #8892A4; border: 1px solid rgba(255,255,255,0.1);
          text-decoration: none; background: none; white-space: nowrap;
          transition: background .15s, color .15s;
        }
        .cios-btn-in:hover { background: rgba(255,255,255,0.05); color: #E8EDF5; }
        .cios-btn-join {
          font-size: 13px; font-weight: 700; padding: 8px 18px; border-radius: 10px;
          background: linear-gradient(135deg, #1E88E5, #1565C0); color: #fff;
          text-decoration: none; white-space: nowrap;
          box-shadow: 0 3px 14px rgba(30,136,229,0.38);
          transition: box-shadow .2s, transform .15s;
        }
        .cios-btn-join:hover { box-shadow: 0 6px 24px rgba(30,136,229,0.5); transform: translateY(-1px); }
        /* hamburger */
        .cios-ham {
          display: none; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 10px; margin-left: 8px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          color: #E8EDF5; cursor: pointer; padding: 0; flex-shrink: 0;
        }
        .cios-ham:hover { background: rgba(30,136,229,0.12); }
        /* responsive */
        @media (max-width: 1080px) {
          .cios-nav .cios-nl, .cios-nav .cios-ng { display: none; }
          .cios-nav .cios-ng:nth-child(-n+3), .cios-nav .cios-nl:nth-child(-n+3) { display: inline-flex; }
        }
        @media (max-width: 840px) {
          .cios-nav { display: none !important; }
          .cios-ham { display: inline-flex !important; }
          .cios-btn-in { display: none; }
          /* ensure absolute-positioned nav doesn't bleed through */
          .cios-hdr-row { overflow: visible; }
        }
        @media (max-width: 440px) { .cios-actions { display: none !important; } .cios-ham { margin-left: auto !important; } }
        /* drawer */
        .cios-bkdp { position: fixed; inset: 62px 0 0 0; background: rgba(0,0,0,0.55); z-index: 55; }
        .cios-drw {
          position: fixed; top: 62px; right: 0; bottom: 0;
          width: min(340px, 88vw); z-index: 56;
          background: #0A0E1A; border-left: 1px solid rgba(255,255,255,0.07);
          overflow-y: auto; animation: slideIn .22s ease;
        }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        .cios-drw-sect { border-bottom: 1px solid rgba(255,255,255,0.05); }
        .cios-drw-hd {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; background: none; border: none; cursor: pointer;
          font-size: 14px; font-weight: 700; color: #E8EDF5;
          text-align: left; font-family: inherit; text-decoration: none;
          transition: background .15s;
        }
        .cios-drw-hd:hover { background: rgba(255,255,255,0.03); }
        .cios-drw-subs { padding: 0 12px 10px; }
        .cios-drw-sub {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          text-decoration: none; font-size: 13px; color: #8892A4;
          transition: background .15s, color .15s;
        }
        .cios-drw-sub:hover { background: rgba(255,255,255,0.04); color: #E8EDF5; }
        .cios-drw-cta {
          display: block; margin: 16px 20px; text-align: center;
          padding: 13px; border-radius: 12px;
          background: linear-gradient(135deg, #1E88E5, #1565C0);
          color: #fff; font-size: 15px; font-weight: 700; text-decoration: none;
        }
        .cios-drw-in {
          display: block; margin: 0 20px 24px; text-align: center;
          padding: 11px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          color: #B0BEC5; font-size: 14px; font-weight: 600; text-decoration: none;
        }
      `}</style>

      <header className="cios-hdr">
        <div className="cios-hdr-row">
          {/* Brand */}
          <Link href="/" className="cios-brand">
            <img src={LOGO} alt="CIOS" width={32} height={32} />
            <span className="cios-brand-lbl">CIOS Platform</span>
          </Link>

          {/* Desktop nav */}
          <nav className="cios-nav" aria-label="Main navigation">
            {NAV.map((item) => <DesktopNavItem key={item.label} item={item} />)}
          </nav>

          {/* CTAs */}
          <div className="cios-actions">
            <Link href="/sign-in" className="cios-btn-in">Sign In</Link>
            <Link href="/sign-up" className="cios-btn-join">Join Free →</Link>
          </div>

          {/* Hamburger */}
          <button className="cios-ham" onClick={() => setMob(v => !v)} aria-label="Toggle menu" aria-expanded={mob}>
            {mob
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6L18 18M18 6L6 18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7H20M4 12H20M4 17H20"/></svg>
            }
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mob && (
        <>
          <div className="cios-bkdp" onClick={close} />
          <div className="cios-drw">
            {NAV.map((item) => (
              <div key={item.label} className="cios-drw-sect">
                {item.dropdown ? (
                  <>
                    <button className="cios-drw-hd" onClick={() => setExp(exp === item.label ? null : item.label)}>
                      {item.label}
                      <svg style={{ transform: exp === item.label ? "rotate(180deg)" : "none", transition: "transform .2s" }}
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {exp === item.label && (
                      <div className="cios-drw-subs">
                        {item.dropdown.map((d) => (
                          <SmartLink key={d.href + d.label} href={d.href} className="cios-drw-sub" onClick={close}>
                            {d.icon && <span>{d.icon}</span>}
                            {d.label}
                          </SmartLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <SmartLink href={item.href!} className="cios-drw-hd" onClick={close}>
                    {item.label}
                  </SmartLink>
                )}
              </div>
            ))}
            <Link href="/sign-up" className="cios-drw-cta" onClick={close}>Join Free →</Link>
            <Link href="/sign-in" className="cios-drw-in"  onClick={close}>Sign In</Link>
          </div>
        </>
      )}
    </>
  );
}
