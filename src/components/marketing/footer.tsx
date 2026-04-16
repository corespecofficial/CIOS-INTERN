import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";

/* ── Social icons ── */
const SOCIALS = [
  {
    href: "https://twitter.com/cospronos", label: "Twitter / X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    href: "https://linkedin.com/company/cospronos", label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
  {
    href: "https://instagram.com/cospronos", label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  },
  {
    href: "https://youtube.com/@cospronos", label: "YouTube",
    path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  },
  {
    href: "https://tiktok.com/@cospronos", label: "TikTok",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
];

export function MarketingFooter() {
  return (
    <footer style={{
      borderTop: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(10,14,26,0.98)",
      marginTop: 80,
    }}>
      {/* Newsletter banner */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "40px 24px",
        background: "linear-gradient(135deg, rgba(30,136,229,0.07), rgba(171,71,188,0.04))",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>
              Get the free CIOS Program Guide
            </div>
            <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.5 }}>
              Curriculum, earning potential, success stories — everything in one PDF.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <NewsletterForm />
            <p style={{ fontSize: 10, color: "#3A4256", marginTop: 6, marginBottom: 0 }}>No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </div>

      {/* Main footer grid */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 24px 40px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40 }} className="cios-footer-grid">
        {/* Brand column */}
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, background: "linear-gradient(135deg, #fff, #1E88E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 10 }}>
            CIOS Platform
          </div>
          <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: "0 0 20px", maxWidth: 240 }}>
            The complete internship operating system. Train, perform, earn, and get hired — all in one place.
          </p>

          {/* Social icons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {SOCIALS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#8892A4", transition: "all 0.15s",
                  flexShrink: 0,
                }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#5A6478", lineHeight: 1.6 }}>
            COSPRONOS Media × Corespec Engineering<br />
            Lagos, Nigeria
          </div>
        </div>

        <FooterCol title="Platform" links={[
          { href: "/about",           label: "About CIOS" },
          { href: "/recruiters",      label: "For Recruiters" },
          { href: "/talent-showcase", label: "Talent Showcase" },
          { href: "/pricing",         label: "Pricing" },
          { href: "/demo",            label: "Book a Demo" },
          { href: "/success-stories", label: "Success Stories" },
        ]} />

        <FooterCol title="Company" links={[
          { href: "/contact",  label: "Contact Us" },
          { href: "/careers",  label: "Careers" },
          { href: "/press",    label: "Press Kit" },
          { href: "/terms",    label: "Terms of Service" },
          { href: "/privacy",  label: "Privacy Policy" },
          { href: "/faq",      label: "FAQ" },
        ]} />

        <FooterCol title="Get Started" links={[
          { href: "/sign-in",                      label: "Sign In" },
          { href: "/sign-up",                      label: "Join Free" },
          { href: "/contact?category=recruiter",   label: "Apply as Recruiter" },
          { href: "/contact?category=mentor",      label: "Become a Mentor" },
          { href: "/contact?category=investor",    label: "Investor Inquiry" },
          { href: "/verify",                       label: "Verify Certificate" },
        ]} />
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#5A6478" }}>
            © {new Date().getFullYear()} COSPRONOS Media. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { href: "/terms",   label: "Terms" },
              { href: "/privacy", label: "Privacy" },
              { href: "/press",   label: "Press" },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ fontSize: 11, color: "#5A6478", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .cios-footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 540px) {
          .cios-footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#5A6478", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>{title}</div>
      {links.map((l) => (
        <Link key={l.href} href={l.href} style={{ display: "block", fontSize: 13, color: "#8892A4", textDecoration: "none", padding: "4px 0", transition: "color 0.15s", lineHeight: 1.6 }}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
