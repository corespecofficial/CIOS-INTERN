/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getFeaturedHackathon } from "@/app/actions/hackathons";

const ACCENT = "#F59E0B";

/**
 * Featured hackathon card for the marketing landing.
 *
 * Server-rendered. Fetches the next featured (or upcoming) hackathon and
 * renders a CTA card inviting visitors to register. Quietly returns null
 * if no eligible hackathon exists, so the landing layout is never affected.
 */
export async function HackathonHeroCard() {
  const res = await getFeaturedHackathon();
  if (!res.ok || !res.data) return null;
  const h = res.data;
  const start = new Date(h.starts_at);
  const end = new Date(h.ends_at);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const cover = h.cover_image_url || h.banner_url;
  const isLive = h.status === "active";

  return (
    <section style={{ padding: "60px 20px", background: "transparent" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 0,
            background: "rgba(15,23,42,0.7)",
            border: `1px solid rgba(245,158,11,0.32)`,
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "0 30px 80px -25px rgba(245,158,11,0.35)",
          }}
          className="hk-landing"
        >
          <div style={{ padding: "36px 36px 32px" }}>
            <div
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 999,
                background: isLive ? "rgba(52,211,153,0.18)" : `rgba(245,158,11,0.16)`,
                border: `1px solid ${isLive ? "rgba(52,211,153,0.4)" : "rgba(245,158,11,0.4)"}`,
                color: isLive ? "#34D399" : ACCENT,
                fontSize: 11,
                letterSpacing: 2,
                fontWeight: 800,
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              {isLive ? "🔴 Live now" : "Featured hackathon"}
            </div>
            <h2
              className="hk-landing-h2"
              style={{
                margin: 0,
                fontSize: 32,
                lineHeight: 1.1,
                letterSpacing: -0.8,
                fontWeight: 900,
                color: "#F8FAFC",
                fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
              }}
            >
              {h.title}
            </h2>
            {(h.hero_blurb || h.theme) && (
              <p style={{ margin: "10px 0 0", fontSize: 15, color: "#94A3B8", lineHeight: 1.55, maxWidth: 480 }}>
                {h.hero_blurb || h.theme}
              </p>
            )}

            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: "#CBD5E1" }}>
              <Fact label="Dates" value={`${start.toLocaleDateString("en-NG", { day: "numeric", month: "short" })} → ${end.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`} />
              <Fact label="Length" value={`${days} day${days === 1 ? "" : "s"}`} />
              {h.prize_pool && <Fact label="Prize" value={h.prize_pool} highlight />}
              <Fact label="Teams" value={`${h.team_count ?? 0}`} />
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link
                href={`/hackathons/${h.id}`}
                style={{
                  padding: "12px 22px",
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${ACCENT}, #D97706)`,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: "none",
                  boxShadow: "0 12px 28px -10px rgba(245,158,11,0.7)",
                }}
              >
                Register now →
              </Link>
              <Link
                href="/hackathons"
                style={{
                  padding: "12px 22px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  color: "#F8FAFC",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Browse all hackathons
              </Link>
            </div>
          </div>

          <div
            className="hk-landing-cover"
            style={{
              minHeight: 280,
              background: cover
                ? `url(${cover}) center/cover no-repeat`
                : `radial-gradient(500px 300px at 30% 20%, rgba(245,158,11,0.4), transparent 60%), radial-gradient(500px 300px at 80% 80%, rgba(239,68,68,0.3), transparent 60%), #1A1205`,
            }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .hk-landing { grid-template-columns: 1fr !important; }
          .hk-landing-cover { min-height: 180px !important; order: -1; }
          .hk-landing-h2 { font-size: 26px !important; }
        }
      `}</style>
    </section>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.2, color: "#64748B", fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: highlight ? ACCENT : "#F8FAFC", marginTop: 2 }}>{value}</div>
    </div>
  );
}
