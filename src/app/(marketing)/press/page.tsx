import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Press & Media · CIOS",
  description: "Press resources, brand assets, and media inquiries for the CIOS Platform by COSPRONOS Media.",
};

const STATS = [
  { value: "500+", label: "Graduates" },
  { value: "12", label: "Countries" },
  { value: "80+", label: "Partner companies" },
  { value: "87%", label: "Placement rate" },
  { value: "₦2M+", label: "Paid out in rewards" },
  { value: "6", label: "Tracks available" },
];

const BRAND_COLORS = [
  { name: "CIOS Blue", hex: "#1E88E5", rgb: "30, 136, 229" },
  { name: "Dark Navy", hex: "#0A0E1A", rgb: "10, 14, 26" },
  { name: "Text Primary", hex: "#E8EDF5", rgb: "232, 237, 245" },
  { name: "Success Green", hex: "#66BB6A", rgb: "102, 187, 106" },
  { name: "Warning Amber", hex: "#FFC107", rgb: "255, 193, 7" },
];

export default function PressPage() {
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px 80px" }}>
      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <span style={{ display: "inline-block", padding: "4px 14px", background: "rgba(255,193,7,0.15)", color: "#FFC107", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1.5, marginBottom: 16 }}>PRESS & MEDIA</span>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 800, color: "#E8EDF5", margin: "0 0 14px", lineHeight: 1.1 }}>
          Media resources & press kit
        </h1>
        <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 560, margin: "0 auto 28px", lineHeight: 1.6 }}>
          Everything you need to write about CIOS Platform, COSPRONOS Media, and Africa&apos;s fastest-growing digital internship ecosystem.
        </p>
        <a href="mailto:press@cospronos.com" style={{ display: "inline-block", padding: "11px 24px", borderRadius: 12, background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          Contact Press Team →
        </a>
      </div>

      {/* About section */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>About CIOS Platform</h2>
        <div style={{ padding: "24px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", lineHeight: 1.8 }}>
          <p style={{ color: "#B0BEC5", fontSize: 14, margin: "0 0 14px" }}>
            <strong style={{ color: "#E8EDF5" }}>CIOS (COSPRONOS Internship Operating System)</strong> is a full-stack internship management platform built by COSPRONOS Media × Corespec Engineering. Launched in Lagos, Nigeria in 2026, CIOS is designed as the complete operating system for African digital talent development.
          </p>
          <p style={{ color: "#B0BEC5", fontSize: 14, margin: "0 0 14px" }}>
            The platform combines structured 6-month internship tracks across AI, Design, Marketing, Development, and Business with a gamified performance system — XP points, achievement badges, monetary rewards, and real-time leaderboards. Interns build verified portfolios, connect with vetted recruiters, and get placed in employment upon graduation.
          </p>
          <p style={{ color: "#B0BEC5", fontSize: 14, margin: 0 }}>
            CIOS operates an intern-facing portal, recruiter marketplace, alumni network, mentor program, and AI-powered career tools — all on one platform. The company generates revenue through recruiter subscriptions, placement fees, marketplace commissions, and premium intern tiers.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>Key statistics</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ padding: "20px 16px", textAlign: "center", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 800, background: "linear-gradient(135deg, #1E88E5, #66BB6A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#5A6478", fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#5A6478", marginTop: 12 }}>* All figures as of April 2026. Contact press team for latest verified data.</p>
      </section>

      {/* Brand colors */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>Brand colors</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {BRAND_COLORS.map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", minWidth: 200 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: c.hex, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#5A6478" }}>{c.hex} · rgb({c.rgb})</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>Typography</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ padding: "20px 24px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", flex: "1 1 200px" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>Aa</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>Space Grotesk</div>
            <div style={{ fontSize: 11, color: "#5A6478" }}>Headings, brand text, display</div>
          </div>
          <div style={{ padding: "20px 24px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", flex: "1 1 200px" }}>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 32, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>Aa</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>Nunito</div>
            <div style={{ fontSize: 11, color: "#5A6478" }}>Body text, UI labels, content</div>
          </div>
        </div>
      </section>

      {/* Logo downloads */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>Logo & assets</h2>
        <div style={{ padding: "24px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png" alt="CIOS Logo" width={80} height={80} style={{ borderRadius: 16 }} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ color: "#B0BEC5", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
                Our logo is available in multiple formats. Please do not alter the logo colors, proportions, or spacing. Use on dark backgrounds only unless cleared with press team.
              </p>
              <a href="mailto:press@cospronos.com?subject=Logo Assets Request" style={{ fontSize: 13, color: "#1E88E5", textDecoration: "none", fontWeight: 600 }}>
                Request full asset package →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Media contacts */}
      <section>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>Press contacts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[
            { title: "Media Inquiries", email: "press@cospronos.com", desc: "Interview requests, fact-checking, embargoed releases" },
            { title: "Partnerships", email: "partnerships@cospronos.com", desc: "Brand partnerships, sponsorships, co-marketing" },
            { title: "Investor Relations", email: "investors@cospronos.com", desc: "Funding, traction data, due diligence requests" },
          ].map((c) => (
            <div key={c.title} style={{ padding: "20px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{c.title}</div>
              <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: "#1E88E5", textDecoration: "none", display: "block", marginBottom: 6 }}>{c.email}</a>
              <div style={{ fontSize: 12, color: "#5A6478" }}>{c.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/contact" style={{ fontSize: 14, color: "#8892A4", textDecoration: "none" }}>
            Or use the general contact form →
          </Link>
        </div>
      </section>
    </div>
  );
}
