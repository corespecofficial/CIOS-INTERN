/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { CreativeSpace } from "@/app/actions/creative-spaces-types";
import { TIER_STYLES, type CreatorCredibility } from "@/lib/creator-credibility";

interface Props {
  instructorId: string;
  name: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  role: string;
  bio: string;
  headline: string;
  location: string;
  xp: number;
  level: number;
  streak: number;
  reputation: number;
  joined: string;
  spaces: CreativeSpace[];
  credBadge: string;
  credTier: CreatorCredibility["tier"];
  provenance: string;
}

const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";
const ACCENT = "#26C6DA";
const ACCENT_2 = "#0EA5E9";

export function InstructorProfileClient({
  instructorId, name, avatarUrl, coverUrl, role, bio, headline, location,
  xp, level, streak, reputation, joined, spaces, credBadge, credTier, provenance,
}: Props) {
  const tier = TIER_STYLES[credTier];
  const totalLearners = spaces.reduce((a, s) => a + s.enrollment_count, 0);
  const weightedRating = spaces.length > 0
    ? spaces.reduce((a, s) => a + s.rating * s.review_count, 0) /
      Math.max(1, spaces.reduce((a, s) => a + s.review_count, 0))
    : 0;

  return (
    <div style={{ width: "100%" }}>
      <div
        className="ip-cover"
        style={{
          height: 180,
          position: "relative",
          background: coverUrl
            ? `linear-gradient(180deg, rgba(10,14,26,0.3), rgba(10,14,26,0.9)), url(${coverUrl}) center/cover no-repeat`
            : `radial-gradient(800px 280px at 30% 0%, rgba(38,198,218,0.3), transparent 60%), radial-gradient(700px 280px at 80% 20%, rgba(124,58,237,0.2), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      />

      <div style={{ maxWidth: 1080, margin: "28px auto 0", padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
        <Link
          href="/creative-space"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999,
            background: "rgba(10,14,26,0.7)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)", color: DIM,
            fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 16,
          }}
        >
          ← Creative Spaces
        </Link>

        <div
          className="ip-identity"
          style={{
            padding: 24,
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20,
            display: "flex",
            gap: 20,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: `3px solid ${tier.border}`, flexShrink: 0 }}
            />
          ) : (
            <span
              style={{
                width: 96, height: 96, borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontSize: 36, fontWeight: 900, color: "#fff", flexShrink: 0,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, color: INK, letterSpacing: -0.6, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
              {name}
            </h1>
            {headline && <p style={{ margin: "4px 0 0", fontSize: 14, color: DIM, fontStyle: "italic" }}>{headline}</p>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <span style={{ padding: "3px 10px", fontSize: 11, fontWeight: 800, color: tier.fg, background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 999 }}>
                {credBadge}
              </span>
              <span style={{ padding: "3px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: DIM, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999 }}>
                {role.replace("_", " ")}
              </span>
              {location && <span style={{ padding: "3px 10px", fontSize: 12, color: MUTED }}>📍 {location}</span>}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>{provenance}</div>
          </div>
          <div style={{ fontSize: 12, color: MUTED, textAlign: "right", lineHeight: 1.6 }}>
            Teaching since<br />
            <span style={{ color: INK, fontWeight: 700 }}>
              {new Date(joined).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {bio && (
          <div style={{ padding: 22, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, marginBottom: 22 }}>
            <p style={{ margin: 0, fontSize: 14, color: INK, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{bio}</p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 26,
          }}
        >
          <Stat label="Spaces" value={spaces.length.toString()} />
          <Stat label="Learners" value={totalLearners.toLocaleString()} />
          <Stat label="Avg rating" value={weightedRating > 0 ? weightedRating.toFixed(1) : "—"} />
          <Stat label="XP" value={xp.toLocaleString()} />
          <Stat label="Level" value={level.toString()} />
          <Stat label="Streak" value={`${streak}d`} />
          <Stat label="Reputation" value={reputation.toString()} />
        </div>

        <h2 style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800, color: MUTED, margin: "0 0 14px" }}>
          Active spaces by {name.split(" ")[0] || name}
        </h2>
        {spaces.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: DIM, fontSize: 14 }}>
            No active spaces yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {spaces.map((s) => (
              <Link
                key={s.id}
                href={`/creative-space/${s.id}`}
                style={{
                  display: "block",
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div style={{
                  aspectRatio: "16 / 9",
                  background: s.cover_image_url
                    ? `url(${s.cover_image_url}) center/cover no-repeat, #0F172A`
                    : `linear-gradient(135deg, rgba(38,198,218,0.32), rgba(124,58,237,0.22)), #0F172A`,
                }} />
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>
                    {s.category} · {s.format}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INK, letterSpacing: -0.2, marginBottom: 6 }}>{s.title}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {s.price_per_student === 0 ? "FREE" : `₦${Number(s.price_per_student).toLocaleString()}`}
                    </span>
                    {s.rating > 0 && <span style={{ fontSize: 11, color: "#FBBF24", fontWeight: 700 }}>★ {s.rating.toFixed(1)}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link href={`/community/profile/${instructorId}`} style={{ fontSize: 13, color: ACCENT, textDecoration: "none", fontWeight: 700 }}>
            See full CIOS activity →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .ip-cover { height: 150px !important; }
          .ip-identity { gap: 14px !important; padding: 18px !important; }
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: MUTED, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: INK, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
    </div>
  );
}
