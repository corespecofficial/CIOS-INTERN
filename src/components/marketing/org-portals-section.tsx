/**
 * Marketing landing — "For organizations" section.
 *
 * Surfaces the four organization-tier portals (Institution, Company,
 * Government, Partner Programme) in the public landing space so they
 * have parity with the role-based portals that visitors / interns /
 * mentors already see at the top of the funnel.
 *
 * Each card links to /portals/<slug>, which is the existing marketing
 * info page where we render the "Coming soon" gate + a contact CTA.
 * The actual portal routes (/institution, /company-portal, /gov-portal,
 * /partners) are still admin-only at the route level — public users
 * shouldn't land there yet.
 */

import Link from "next/link";

interface PortalCard {
  slug: string;            // matches src/app/(marketing)/portals/[slug]/page.tsx
  title: string;
  emoji: string;
  blurb: string;
  highlights: string[];    // 3 bullet points the card surfaces
  accent: string;          // primary tint
  badge: string;
}

const PORTALS: PortalCard[] = [
  {
    slug: "institution-portal",
    title: "Institution Portal",
    emoji: "🏛",
    accent: "#26A69A",
    badge: "FOR UNIVERSITIES",
    blurb: "Manage cohorts of students, track performance, and connect your institution's interns to live opportunities.",
    highlights: [
      "Bulk-onboard students from your institution",
      "Live progress + placement analytics",
      "Direct line to recruiter & mentor pools",
    ],
  },
  {
    slug: "company-portal",
    title: "Company Portal",
    emoji: "🏢",
    accent: "#1E88E5",
    badge: "FOR EMPLOYERS",
    blurb: "Post roles, run challenges, and hire from a vetted pipeline of African talent that's already been pressure-tested on real briefs.",
    highlights: [
      "Branded company page + talent pool",
      "Sponsor hackathons and challenges",
      "Pre-vetted candidates with skill scores",
    ],
  },
  {
    slug: "government-portal",
    title: "Government Portal",
    emoji: "🏦",
    accent: "#9C27B0",
    badge: "FOR PUBLIC SECTOR",
    blurb: "Run state-level skills programs, track ROI on training spend, and connect youth employment data to real outcomes.",
    highlights: [
      "Cohort-level KPI dashboard",
      "Compliance-ready reporting export",
      "Federated identity with national systems",
    ],
  },
  {
    slug: "partner-programme",
    title: "Partner Programme",
    emoji: "🤝",
    accent: "#FFC107",
    badge: "FOR PARTNERS",
    blurb: "Co-host events, syndicate content, and build joint programs with us. Revenue share and white-label options available.",
    highlights: [
      "Revenue share on referred placements",
      "White-label deployment options",
      "Joint marketing + cohort co-hosting",
    ],
  },
];

export function OrgPortalsSection() {
  return (
    <section
      id="org-portals"
      style={{
        padding: "80px 24px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        position: "relative",
        zIndex: 1,
        scrollMarginTop: 70,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#26A69A", letterSpacing: 1.5, textTransform: "uppercase" }}>
            For organizations
          </span>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 800,
              margin: "8px 0 12px",
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#E8EDF5",
            }}
          >
            Bring your institution, company, or programme on board
          </h2>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0, maxWidth: 640, marginInline: "auto", lineHeight: 1.6 }}>
            Four dedicated portals for the organizations that hire, fund, train, and partner with us. Each one is being rolled out in waves — register your interest below to get early access.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          {PORTALS.map((p) => (
            <Link
              key={p.slug}
              href={`/portals/${p.slug}`}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: 22,
                background: "rgba(15,22,38,0.7)",
                border: `1px solid ${p.accent}33`,
                borderRadius: 14,
                textDecoration: "none",
                color: "#E8EDF5",
                transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
                position: "relative",
              }}
              className="org-portal-card"
            >
              <div
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#FFC107",
                  background: "rgba(255,193,7,0.12)",
                  padding: "3px 8px",
                  borderRadius: 999,
                  letterSpacing: 0.6,
                }}
              >
                COMING SOON
              </div>
              <div style={{ fontSize: 36, marginBottom: 10 }}>{p.emoji}</div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: p.accent,
                  letterSpacing: 1,
                  marginBottom: 4,
                }}
              >
                {p.badge}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  margin: "0 0 8px",
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "#E8EDF5",
                }}
              >
                {p.title}
              </h3>
              <p style={{ fontSize: 13, color: "#B0BEC5", lineHeight: 1.6, margin: "0 0 14px" }}>
                {p.blurb}
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                {p.highlights.map((h) => (
                  <li key={h} style={{ display: "flex", gap: 8, fontSize: 12, color: "#8892A4", lineHeight: 1.5 }}>
                    <span style={{ color: p.accent, flexShrink: 0 }}>✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <div
                style={{
                  marginTop: "auto",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: p.accent,
                }}
              >
                Learn more <span aria-hidden>→</span>
              </div>
            </Link>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: 28, fontSize: 12, color: "#5A6478" }}>
          Already have an account? <Link href="/onboarding/intent" style={{ color: "#26A69A", textDecoration: "none", fontWeight: 700 }}>Switch your role →</Link>
        </p>
      </div>
    </section>
  );
}
