/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { Hackathon, HackathonTeam, HackathonSubmission } from "@/app/actions/hackathon-types";
import { ConversionGate } from "@/components/portal/conversion-gate";
import { HackathonDetailClient } from "./hackathon-detail-client";

const ACCENT = "#F59E0B";
const ACCENT_2 = "#D97706";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

interface Props {
  hackathon: Hackathon;
  teams: HackathonTeam[];
  leaderboard: HackathonSubmission[];
  isAnon: boolean;
  userId: string | null;
}

/**
 * Public hackathon detail page.
 *
 * Renders a polished hero (cover image + status / dates / prize / countdown)
 * for everyone, then either:
 *   - the full HackathonDetailClient (overview / teams / submit / leaderboard)
 *     for signed-in users, OR
 *   - a ConversionGate that explains what they get when they sign up.
 */
export function HackathonDetailWrapper({ hackathon: h, teams, leaderboard, isAnon }: Props) {
  const start = new Date(h.starts_at);
  const end = new Date(h.ends_at);
  const cover = h.cover_image_url || h.banner_url;
  const isLive = h.status === "active";
  const isUpcoming = h.status === "upcoming";

  return (
    <div style={{ width: "100%" }}>
      <div
        className="hk-hero"
        style={{
          position: "relative",
          minHeight: 320,
          padding: "60px 20px 50px",
          background: cover
            ? `linear-gradient(180deg, rgba(10,14,26,0.4), rgba(10,14,26,0.92)), url(${cover}) center/cover no-repeat, #0F172A`
            : `radial-gradient(900px 320px at 25% 0%, rgba(245,158,11,0.28), transparent 60%), radial-gradient(800px 320px at 80% 20%, rgba(239,68,68,0.18), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Link
            href="/hackathons"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 999,
              background: "rgba(10,14,26,0.7)", backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)", color: DIM,
              fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 22,
            }}
          >
            ← Hackathons
          </Link>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={pillSolid(isLive ? "#34D399" : isUpcoming ? "#60A5FA" : "#94A3B8")}>
              {isLive ? "🔴 Live now" : isUpcoming ? "📅 Upcoming" : h.status}
            </span>
            {h.is_featured && <span style={pillGradient()}>★ Featured</span>}
            {h.theme && <span style={pill(ACCENT)}>{h.theme}</span>}
            {h.tags.slice(0, 3).map((t) => (
              <span key={t} style={pill(DIM)}>#{t}</span>
            ))}
          </div>

          <h1
            className="hk-hero-h1"
            style={{
              margin: 0,
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              fontWeight: 900,
              color: INK,
              fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
              maxWidth: 800,
            }}
          >
            {h.title}
          </h1>
          {h.hero_blurb && (
            <p style={{ margin: "12px 0 0", maxWidth: 720, fontSize: 16, color: DIM, lineHeight: 1.55 }}>
              {h.hero_blurb}
            </p>
          )}

          {/* Quick facts strip */}
          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, maxWidth: 760 }}>
            <Stat label="Starts" value={start.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} />
            <Stat label="Ends" value={end.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} />
            <Stat label="Team size" value={`${h.min_team_size}–${h.max_team_size}`} />
            <Stat label="Prize" value={h.prize_pool ?? "—"} highlight={!!h.prize_pool} />
            <Stat label="Teams" value={`${h.team_count ?? 0}`} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 20px 60px" }}>
        {isAnon ? (
          <ConversionGate
            action={`Register for "${h.title}"`}
            benefit="Sign up free to form a team, browse other competitors, submit your project, and track the leaderboard. Your CIOS profile is automatically attached to your team page."
            intendedRole="public_user"
            variant="card"
          >
            <button style={{ display: "none" }} />
          </ConversionGate>
        ) : (
          <HackathonDetailClient hackathon={h} teams={teams} leaderboard={leaderboard} />
        )}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hk-hero { min-height: 240px !important; padding: 40px 20px !important; }
          .hk-hero-h1 { font-size: 28px !important; letter-spacing: -0.6px !important; }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(10,14,26,0.6)",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: 1.2, color: MUTED, textTransform: "uppercase", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: highlight ? ACCENT : INK, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

function pill(color: string): React.CSSProperties {
  return {
    padding: "3px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: `${color}22`,
    color,
    border: `1px solid ${color}55`,
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

function pillSolid(color: string): React.CSSProperties {
  return {
    padding: "3px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: color,
    color: "#0A0E1A",
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

function pillGradient(): React.CSSProperties {
  return {
    padding: "3px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
    color: "#1A1205",
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}
