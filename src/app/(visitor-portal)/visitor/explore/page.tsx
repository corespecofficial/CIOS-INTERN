import Link from "next/link";

export const dynamic = "force-dynamic";

const TILES = [
  { href: "/creative-space", emoji: "🏫", title: "Creative spaces", blurb: "Cohort-based learning hosted by vetted instructors." },
  { href: "/marketplace", emoji: "🛒", title: "Marketplace", blurb: "Buy and sell digital products from CIOS creators." },
  { href: "/opportunities", emoji: "💼", title: "Opportunities", blurb: "Internships, gigs, and roles." },
  { href: "/hackathons", emoji: "🏆", title: "Hackathons", blurb: "Compete and win." },
  { href: "/mentorship", emoji: "🎓", title: "Mentorship", blurb: "1:1 mentor matchmaking." },
  { href: "/startups", emoji: "🚀", title: "Startups", blurb: "Browse CIOS-incubated startups." },
  { href: "/study-buddy", emoji: "📚", title: "Study buddy", blurb: "Find a study partner or group." },
  { href: "/ai-hub", emoji: "🤖", title: "AI hub", blurb: "Free AI tools to learn faster." },
];

export default function ExplorePage() {
  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px 0" }}>Explore</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px 0" }}>
        Everything CIOS — public and free to browse as a visitor.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18, textDecoration: "none", color: "#E8EDF5" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{t.emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{t.blurb}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
