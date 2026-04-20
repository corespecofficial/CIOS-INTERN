/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import type { Product } from "@/app/actions/marketplace-types";
import { TIER_STYLES, type CreatorCredibility } from "@/lib/creator-credibility";

interface Props {
  creatorId: string;
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
  products: Product[];
  credBadge: string;
  credTier: CreatorCredibility["tier"];
  provenance: string;
}

const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";
const ACCENT = "#A855F7";

export function CreatorProfileClient({
  creatorId, name, avatarUrl, coverUrl, role, bio, headline, location,
  xp, level, streak, reputation, joined, products, credBadge, credTier, provenance,
}: Props) {
  const tier = TIER_STYLES[credTier];
  const totalSales = products.reduce((a, p) => a + p.sales_count, 0);
  const totalRevenue = products.reduce((a, p) => a + Number(p.price_ngn) * p.sales_count, 0);

  return (
    <div style={{ width: "100%" }}>
      {/* Cover */}
      <div
        style={{
          height: 220,
          position: "relative",
          background: coverUrl
            ? `linear-gradient(180deg, rgba(10,14,26,0.3), rgba(10,14,26,0.9)), url(${coverUrl}) center/cover no-repeat`
            : `radial-gradient(800px 280px at 30% 0%, rgba(168,85,247,0.3), transparent 60%), radial-gradient(700px 280px at 80% 20%, rgba(30,136,229,0.2), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        className="cp-cover"
      />

      <div style={{ maxWidth: 1080, margin: "-90px auto 0", padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
        <Link
          href="/marketplace"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 999,
            background: "rgba(10,14,26,0.7)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: DIM,
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          ← Marketplace
        </Link>

        {/* Identity card */}
        <div
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
          className="cp-identity"
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
                background: "linear-gradient(135deg, #A855F7, #7C3AED)",
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
            {headline && (
              <p style={{ margin: "4px 0 0", fontSize: 14, color: DIM, fontStyle: "italic" }}>{headline}</p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <span
                style={{
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: tier.fg,
                  background: tier.bg,
                  border: `1px solid ${tier.border}`,
                  borderRadius: 999,
                }}
              >
                {credBadge}
              </span>
              <span style={{ padding: "3px 10px", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: DIM, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999 }}>
                {role.replace("_", " ")}
              </span>
              {location && (
                <span style={{ padding: "3px 10px", fontSize: 12, color: MUTED }}>📍 {location}</span>
              )}
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>{provenance}</div>
          </div>
          <div style={{ fontSize: 12, color: MUTED, textAlign: "right", lineHeight: 1.6 }}>
            Joined<br />
            <span style={{ color: INK, fontWeight: 700 }}>
              {new Date(joined).toLocaleDateString("en-NG", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <div style={{ padding: 22, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, marginBottom: 22 }}>
            <p style={{ margin: 0, fontSize: 14, color: INK, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{bio}</p>
          </div>
        )}

        {/* Stat strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
            marginBottom: 26,
          }}
        >
          <Stat label="Products" value={products.length.toString()} />
          <Stat label="Sales" value={totalSales.toLocaleString()} />
          <Stat label="Revenue" value={`₦${totalRevenue.toLocaleString()}`} />
          <Stat label="XP" value={xp.toLocaleString()} />
          <Stat label="Level" value={level.toString()} />
          <Stat label="Streak" value={`${streak}d`} />
          <Stat label="Reputation" value={reputation.toString()} />
        </div>

        {/* Products */}
        <h2 style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 800, color: MUTED, margin: "0 0 14px" }}>
          Products by {name.split(" ")[0] || name}
        </h2>
        {products.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: DIM, fontSize: 14 }}>
            No active products yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {products.map((p) => (
              <Link
                key={p.id}
                href={`/marketplace/${p.id}`}
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
                <div
                  style={{
                    aspectRatio: "16 / 9",
                    background: p.cover_image_url
                      ? `url(${p.cover_image_url}) center/cover no-repeat, #0F172A`
                      : `linear-gradient(135deg, rgba(168,85,247,0.35), rgba(30,136,229,0.22)), #0F172A`,
                  }}
                />
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", color: MUTED, marginBottom: 4 }}>
                    {p.category}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: INK, letterSpacing: -0.2, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {p.price_ngn === 0 && p.pay_min_ngn == null
                      ? "FREE"
                      : p.pay_min_ngn != null
                        ? `from ₦${Number(p.pay_min_ngn).toLocaleString()}`
                        : `₦${Number(p.price_ngn).toLocaleString()}`}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Link to full platform profile */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link
            href={`/community/profile/${creatorId}`}
            style={{ fontSize: 13, color: ACCENT, textDecoration: "none", fontWeight: 700 }}
          >
            See full CIOS activity →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cp-cover { height: 150px !important; }
          .cp-identity { gap: 14px !important; padding: 18px !important; }
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
