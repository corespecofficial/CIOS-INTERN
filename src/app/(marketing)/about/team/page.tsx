import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Team · CIOS",
  description: "Meet the team building CIOS — the operating system for global talent.",
  alternates: { canonical: "/about/team" },
};

/**
 * /about/team — surface for founder + advisor profiles. Pre-launch we
 * show truthful "anchored by COSPRONOS Media × Corespec Engineering"
 * framing rather than fabricated headshots. Real team blocks slot in
 * as profiles are confirmed.
 *
 * Structured to be investor-friendly: a short mission line up top,
 * the founding entities, an "advisors / leadership coming online"
 * panel, and a clear contact CTA so anyone scouting the team can
 * reach the founders directly.
 */

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  org: string;
  accent: string;
}

// Real entities only — no stock photos, no invented advisors. As real
// team members are confirmed they slot in here.
const FOUNDING: TeamMember[] = [
  {
    name: "COSPRONOS Media",
    role: "Founding studio · product, brand, ecosystem",
    bio: "The founding studio behind CIOS. Cospronos sets the program shape, the host model, and runs the founding cohort engagement.",
    org: "COSPRONOS",
    accent: "#1E88E5",
  },
  {
    name: "Corespec Engineering",
    role: "Founding studio · platform engineering",
    bio: "The engineering studio building and operating the platform. Corespec owns the multi-tenant architecture, realtime fabric, and integrations.",
    org: "CORESPEC",
    accent: "#FFC107",
  },
];

export default function TeamPage() {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 24px 80px", color: "#E8EDF5" }}>
      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: 56 }}>
        <span
          style={{
            display: "inline-block",
            padding: "5px 14px",
            marginBottom: 14,
            borderRadius: 99,
            background: "rgba(38,166,154,0.10)",
            border: "1px solid rgba(38,166,154,0.30)",
            color: "#26A69A",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Who&apos;s building CIOS
        </span>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 800,
            margin: "0 0 14px",
            lineHeight: 1.1,
          }}
        >
          A team building <span style={{ background: "linear-gradient(135deg,#26A69A,#1E88E5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>in public</span>.
        </h1>
        <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 660, margin: "0 auto", lineHeight: 1.7 }}>
          CIOS is being built by two founding studios working as one. We&apos;re early — full team, advisors, and partner organisations are landing through the year. We&apos;ll add real names here as they confirm — never stock photos.
        </p>
      </section>

      {/* Founding studios */}
      <section style={{ marginBottom: 56 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#5A6478",
            letterSpacing: 2,
            textTransform: "uppercase",
            margin: "0 0 18px",
          }}
        >
          Founding studios
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {FOUNDING.map((m) => (
            <div
              key={m.name}
              style={{
                background: "rgba(15,22,38,0.7)",
                border: `1px solid ${m.accent}33`,
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${m.accent}, ${m.accent}aa)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 1,
                  color: "#fff",
                  marginBottom: 14,
                }}
              >
                {m.org}
              </div>
              <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>{m.name}</h3>
              <div style={{ fontSize: 12, color: m.accent, fontWeight: 700, marginBottom: 10 }}>{m.role}</div>
              <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.7, margin: 0 }}>{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Coming online */}
      <section style={{ marginBottom: 56 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#5A6478",
            letterSpacing: 2,
            textTransform: "uppercase",
            margin: "0 0 18px",
          }}
        >
          Coming online
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {[
            { emoji: "👤", title: "Founders", body: "Personal pages with bios, links and direct contact land here as we publish them." },
            { emoji: "🎓", title: "Advisors", body: "Industry advisors helping shape the platform — specifically around employability, AI, and program design." },
            { emoji: "🤝", title: "Partner leads", body: "Single point of contact at each institution / company partner once those engagements are signed." },
            { emoji: "🌍", title: "Country leads", body: "As cohorts open in new countries, the local lead will be listed here so applicants know who they're working with." },
          ].map((c) => (
            <div
              key={c.title}
              style={{
                background: "#111827",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{c.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>{c.title}</div>
              <p style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Investor / partner CTA */}
      <section
        style={{
          background: "linear-gradient(135deg, rgba(30,136,229,0.08), rgba(38,166,154,0.06))",
          border: "1px solid rgba(30,136,229,0.20)",
          borderRadius: 16,
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 22,
            fontWeight: 800,
            color: "#E8EDF5",
            margin: "0 0 8px",
          }}
        >
          Want to talk to the team?
        </h2>
        <p style={{ fontSize: 14, color: "#8892A4", maxWidth: 560, margin: "0 auto 18px", lineHeight: 1.7 }}>
          Investors, partner organisations, and prospective advisors can reach the founders directly. We respond personally to every introduction within one business day.
        </p>
        <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/contact?category=investor"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #1E88E5, #1565C0)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Investor enquiry →
          </Link>
          <Link
            href="/contact?category=partner"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: "transparent",
              color: "#26A69A",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              border: "1px solid rgba(38,166,154,0.30)",
            }}
          >
            Partner enquiry →
          </Link>
          <Link
            href="/contact?category=press"
            style={{
              padding: "12px 24px",
              borderRadius: 12,
              background: "transparent",
              color: "#B0BEC5",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            Press →
          </Link>
        </div>
      </section>
    </div>
  );
}
