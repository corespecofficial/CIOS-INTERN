import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "60px 24px 40px", marginTop: 80, background: "rgba(10,14,26,0.5)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32 }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 18, background: "linear-gradient(135deg, #fff, #1E88E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>CIOS Platform</div>
          <p style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>
            COSPRONOS Media × Corespec Engineering<br />
            The complete internship operating system.<br />
            Lagos, Nigeria.
          </p>
        </div>
        <FooterCol title="Platform" links={[
          { href: "/about", label: "About" },
          { href: "/recruiters", label: "For recruiters" },
          { href: "/talent-showcase", label: "Talent" },
          { href: "/pricing", label: "Pricing" },
        ]} />
        <FooterCol title="Company" links={[
          { href: "/contact", label: "Contact" },
          { href: "/terms", label: "Terms" },
          { href: "/contact?category=press", label: "Press" },
          { href: "/contact?category=investor", label: "Investors" },
        ]} />
        <FooterCol title="Account" links={[
          { href: "/sign-in", label: "Sign in" },
          { href: "/sign-up", label: "Sign up" },
          { href: "/contact?category=recruiter", label: "Apply as recruiter" },
        ]} />
      </div>
      <div style={{ maxWidth: 1200, margin: "32px auto 0 auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "#5A6478", textAlign: "center" }}>
        © {new Date().getFullYear()} COSPRONOS Media. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      {links.map((l) => (
        <Link key={l.href} href={l.href} style={{ display: "block", fontSize: 12, color: "#B0BEC5", textDecoration: "none", padding: "4px 0", transition: "color 0.2s" }}>{l.label}</Link>
      ))}
    </div>
  );
}
