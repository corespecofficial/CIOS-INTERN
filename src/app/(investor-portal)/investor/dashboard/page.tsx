import Link from "next/link";
import {
  getInvestorDashboardStats,
  getMyInvestorProfile,
  listInvestorDealflow,
  listMyWatchlist,
} from "@/app/actions/investor";
import { STARTUP_STAGES } from "@/app/actions/startup-types";

export const dynamic = "force-dynamic";

const ACCENT = "#10B981";
const ACCENT_2 = "#059669";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

const ACCRED_LABEL: Record<string, string> = {
  individual: "Individual angel",
  family_office: "Family office",
  angel_syndicate: "Angel syndicate",
  fund: "Venture fund",
  corporate_vc: "Corporate venture",
};

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

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const initials = (profile?.full_name ?? firstName).split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const chequeLine = profile?.cheque_min_usd && profile?.cheque_max_usd
    ? `$${(profile.cheque_min_usd / 1000).toFixed(0)}K – $${(profile.cheque_max_usd / 1000).toFixed(0)}K typical`
    : "Cheque size not set";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* HERO — gradient profile card */}
      <section
        style={{
          position: "relative",
          padding: "26px 28px",
          marginBottom: 22,
          borderRadius: 20,
          background:
            "radial-gradient(900px 280px at 0% 0%, rgba(16,185,129,0.22), transparent 60%), radial-gradient(700px 280px at 100% 0%, rgba(96,165,250,0.18), transparent 60%), rgba(15,23,42,0.65)",
          border: "1px solid rgba(16,185,129,0.28)",
          overflow: "hidden",
        }}
      >
        <div className="iv-hero" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 18, alignItems: "center", minWidth: 0 }}>
            <div
              aria-hidden
              style={{
                width: 64, height: 64, flexShrink: 0,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, fontWeight: 900, color: "#0A0E1A",
                boxShadow: "0 14px 30px -10px rgba(16,185,129,0.55)",
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: ACCENT, fontWeight: 800, textTransform: "uppercase" }}>
                Welcome back
              </div>
              <h1 style={{ margin: "2px 0 4px", fontSize: 30, fontWeight: 900, color: INK, letterSpacing: -0.6, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
                {firstName}
              </h1>
              {profile?.headline && (
                <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.5, maxWidth: 520, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {profile.headline}
                </p>
              )}
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {profile?.accreditation && (
                  <span style={pill(ACCENT)}>{ACCRED_LABEL[profile.accreditation] ?? profile.accreditation}</span>
                )}
                <span style={pill("#60A5FA")}>{chequeLine}</span>
                {profile?.country && <span style={pill(DIM)}>📍 {profile.country}</span>}
              </div>
            </div>
          </div>
          <Link
            href="/investor/dealflow"
            className="iv-hero-cta"
            style={{
              padding: "12px 22px",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 14px 30px -12px rgba(16,185,129,0.7)",
            }}
          >
            Open deal flow →
          </Link>
        </div>

        {/* Thesis chips strip */}
        {(profile?.preferred_categories?.length || profile?.preferred_stages?.length) ? (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, letterSpacing: 1.5, color: MUTED, fontWeight: 800, textTransform: "uppercase" }}>Thesis:</span>
            {[...(profile.preferred_categories ?? []), ...(profile.preferred_stages ?? [])].slice(0, 8).map((tag) => (
              <span key={tag} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, background: "rgba(16,185,129,0.10)", color: ACCENT, fontWeight: 700 }}>
                {STARTUP_STAGES.find((s) => s.value === tag)?.label ?? tag}
              </span>
            ))}
            <Link href="/investor/onboarding?edit=1" style={{ marginLeft: "auto", fontSize: 11, color: DIM, textDecoration: "none", fontWeight: 700 }}>
              Edit thesis →
            </Link>
          </div>
        ) : null}

        <style>{`
          @media (max-width: 720px) {
            .iv-hero { grid-template-columns: 1fr !important; }
            .iv-hero-cta { justify-self: start; }
          }
        `}</style>
      </section>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 26 }}>
        <Stat label="Watchlist" value={stats.watchlist.toString()} color={ACCENT} icon="⭐" href="/investor/watchlist" />
        <Stat label="Active pitches" value={stats.active_pitches.toString()} color="#60A5FA" icon="📈" href="/investor/dealflow" />
        <Stat label="Match your thesis" value={stats.in_my_thesis.toString()} color="#FBBF24" icon="🎯" href="/investor/dealflow" />
        <Stat label="Pitches viewed (7d)" value={stats.recent_views.toString()} color="#A855F7" icon="👀" />
      </div>

      {/* Featured deal flow */}
      <section style={{ marginBottom: 26 }}>
        <SectionHead title="Top of your deal flow" href="/investor/dealflow" />
        {featured.length === 0 ? (
          <Empty
            emoji="🎯"
            title="No matches yet"
            text="Broaden your thesis filters in settings, or open the public board to see every active pitch."
            cta={{ href: "/investor/onboarding?edit=1", label: "Edit thesis →" }}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
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
                category={p.category}
              />
            ))}
          </div>
        )}
      </section>

      {/* Watchlist */}
      <section>
        <SectionHead title="Your watchlist" href="/investor/watchlist" />
        {watching.length === 0 ? (
          <Empty
            emoji="⭐"
            title="Your watchlist is empty"
            text="Star any pitch from a startup detail page — they'll show up here for one-click revisits."
            cta={{ href: "/investor/dealflow", label: "Browse deal flow →" }}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
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
                category={p.category}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function pill(color: string): React.CSSProperties {
  return {
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    background: `${color}1f`,
    color,
    border: `1px solid ${color}55`,
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

function Stat({ label, value, color, icon, href }: { label: string; value: string; color: string; icon: string; href?: string }) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, letterSpacing: 1.5, color: MUTED, fontWeight: 800, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 14 }} aria-hidden>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color, marginTop: 6, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </>
  );
  const cardStyle: React.CSSProperties = {
    display: "block",
    padding: "14px 16px",
    borderRadius: 14,
    background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
    border: `1px solid rgba(255,255,255,0.07)`,
    borderLeft: `3px solid ${color}`,
    textDecoration: "none",
    color: "inherit",
    transition: "transform 120ms ease, border-color 120ms ease",
  };
  return href ? (
    <Link href={href} style={cardStyle}>{inner}</Link>
  ) : (
    <div style={cardStyle}>{inner}</div>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#CBD5E1", letterSpacing: 1.5, textTransform: "uppercase" }}>
        {title}
      </h2>
      <Link href={href} style={{ fontSize: 12, color: ACCENT, textDecoration: "none", fontWeight: 700 }}>See all →</Link>
    </div>
  );
}

function Empty({ emoji, title, text, cta }: { emoji: string; title: string; text: string; cta?: { href: string; label: string } }) {
  return (
    <div style={{ padding: "36px 28px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{emoji}</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: INK }}>{title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: DIM, lineHeight: 1.6, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>{text}</p>
      {cta && (
        <Link href={cta.href} style={{ fontSize: 12, fontWeight: 800, color: ACCENT, textDecoration: "none" }}>
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function PitchTile({ href, title, tagline, country, stage, cover, raising, category }: { href: string; title: string; tagline: string; country: string | null; stage: string; cover: string | null; raising: number | null; category: string }) {
  const stageLabel = STARTUP_STAGES.find((s) => s.value === stage)?.label ?? stage;
  return (
    <Link
      href={href}
      className="iv-pitch"
      style={{
        display: "block", textDecoration: "none", color: "inherit",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14, overflow: "hidden",
        transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease",
      }}
    >
      <div style={{
        aspectRatio: "16 / 9",
        position: "relative",
        background: cover
          ? `url(${cover}) center/cover no-repeat, #0F172A`
          : `linear-gradient(135deg, rgba(16,185,129,0.32), rgba(96,165,250,0.22)), #0F172A`,
      }}>
        <div style={{ position: "absolute", top: 8, left: 8 }}>
          <span style={{ padding: "3px 9px", fontSize: 10, fontWeight: 800, background: "rgba(10,14,26,0.78)", color: INK, borderRadius: 999, letterSpacing: 0.4 }}>
            {category}
          </span>
        </div>
        {raising && (
          <div style={{ position: "absolute", bottom: 8, right: 8 }}>
            <span style={{ padding: "4px 10px", fontSize: 11, fontWeight: 800, background: "rgba(10,14,26,0.85)", color: ACCENT, border: `1px solid ${ACCENT}55`, borderRadius: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
              ${(Number(raising) / 1000).toFixed(0)}K
            </span>
          </div>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.2, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: DIM, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.5 }}>{tagline}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: MUTED, fontWeight: 700 }}>
          <span>{stageLabel}</span>
          {country && <span>📍 {country}</span>}
        </div>
      </div>
      <style>{`
        .iv-pitch:hover { transform: translateY(-2px); border-color: rgba(16,185,129,0.4); background: rgba(255,255,255,0.04); }
      `}</style>
    </Link>
  );
}
