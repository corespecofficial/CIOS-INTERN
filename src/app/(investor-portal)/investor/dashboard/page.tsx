import Link from "next/link";
import {
  getInvestorDashboardStats,
  getMyInvestorProfile,
  listInvestorDealflow,
  listMyWatchlist,
} from "@/app/actions/investor";

export const dynamic = "force-dynamic";

const ACCENT = "#10B981";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

export default async function InvestorDashboardPage() {
  const [statsRes, profileRes, dealflowRes, watchRes] = await Promise.all([
    getInvestorDashboardStats(),
    getMyInvestorProfile(),
    listInvestorDealflow({ limit: 6 }),
    listMyWatchlist(),
  ]);
  const stats = statsRes.ok && statsRes.data
    ? statsRes.data
    : { watchlist: 0, active_pitches: 0, in_my_thesis: 0, recent_views: 0 };
  const profile = profileRes.ok ? profileRes.data : null;
  const featured = dealflowRes.ok ? dealflowRes.data!.slice(0, 6) : [];
  const watching = watchRes.ok ? watchRes.data!.slice(0, 4) : [];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: INK, letterSpacing: -0.5, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
          Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: DIM }}>
          {profile?.headline || "Your CIOS deal flow at a glance."}
        </p>
      </div>

      {/* Stat strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 26 }}>
        <Stat label="Watchlist" value={stats.watchlist.toString()} color={ACCENT} href="/investor/watchlist" />
        <Stat label="Active pitches" value={stats.active_pitches.toString()} color="#60A5FA" href="/investor/dealflow" />
        <Stat label="Match your thesis" value={stats.in_my_thesis.toString()} color="#FBBF24" href="/investor/dealflow" />
        <Stat label="Pitches viewed (7d)" value={stats.recent_views.toString()} color="#A855F7" />
      </div>

      {/* Featured deal flow */}
      <section style={{ marginBottom: 26 }}>
        <SectionHead title="Top of your deal flow" href="/investor/dealflow" />
        {featured.length === 0 ? (
          <Empty text="No pitches matching your thesis yet — broaden your filters in settings, or browse all pitches on the public board." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {featured.map((p) => (
              <PitchTile
                key={p.id}
                href={`/startups/${p.id}`}
                title={p.startup_name}
                tagline={p.tagline}
                country={p.country}
                stage={p.stage}
                cover={p.cover_image_url}
                raising={p.raising_amount_usd}
              />
            ))}
          </div>
        )}
      </section>

      {/* Watchlist */}
      <section>
        <SectionHead title="Your watchlist" href="/investor/watchlist" />
        {watching.length === 0 ? (
          <Empty text="Add pitches to your watchlist from any startup detail page — they'll show up here for fast revisits." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {watching.map((p) => (
              <PitchTile
                key={p.id}
                href={`/startups/${p.id}`}
                title={p.startup_name}
                tagline={p.tagline}
                country={p.country}
                stage={p.stage}
                cover={p.cover_image_url}
                raising={p.raising_amount_usd}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, color, href }: { label: string; value: string; color: string; href?: string }) {
  const Card = href ? Link : "div";
  return (
    <Card href={href ?? ("" as never)} style={{
      display: "block", padding: 16, borderRadius: 14,
      background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${color}`,
      textDecoration: "none", color: "inherit",
    }}>
      <div style={{ fontSize: 10, letterSpacing: 1.5, color: MUTED, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </Card>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#CBD5E1", letterSpacing: -0.2, textTransform: "uppercase" }}>
        {title}
      </h2>
      <Link href={href} style={{ fontSize: 12, color: ACCENT, textDecoration: "none", fontWeight: 700 }}>See all →</Link>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: 36, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, color: DIM, fontSize: 13, lineHeight: 1.6 }}>
      {text}
    </div>
  );
}

function PitchTile({ href, title, tagline, country, stage, cover, raising }: { href: string; title: string; tagline: string; country: string | null; stage: string; cover: string | null; raising: number | null }) {
  return (
    <Link
      href={href}
      style={{
        display: "block", textDecoration: "none", color: "inherit",
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden",
      }}
    >
      <div style={{
        aspectRatio: "16 / 9",
        background: cover
          ? `url(${cover}) center/cover no-repeat, #0F172A`
          : `linear-gradient(135deg, rgba(16,185,129,0.32), rgba(96,165,250,0.22)), #0F172A`,
      }} />
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: INK, letterSpacing: -0.2, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: DIM, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{tagline}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: MUTED, fontWeight: 700 }}>
          <span>{stage}{country ? ` · ${country}` : ""}</span>
          {raising && <span style={{ color: ACCENT }}>${(Number(raising) / 1000).toFixed(0)}K</span>}
        </div>
      </div>
    </Link>
  );
}
