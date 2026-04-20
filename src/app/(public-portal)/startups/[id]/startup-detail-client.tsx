/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { StartupPitch } from "@/app/actions/startup-types";
import { STARTUP_STAGES } from "@/app/actions/startup-types";
import { expressInterest } from "@/app/actions/startup";
import { addToWatchlist } from "@/app/actions/investor";
import { TIER_STYLES, type CreatorCredibility } from "@/lib/creator-credibility";
import { ConversionGate } from "@/components/portal/conversion-gate";

const ACCENT = "#10B981";
const ACCENT_2 = "#059669";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

interface Props {
  pitch: StartupPitch;
  credBadge: string;
  credTier: CreatorCredibility["tier"];
  provenance: string;
}

export function StartupDetailClient({ pitch: p, credBadge, credTier, provenance }: Props) {
  const tier = TIER_STYLES[credTier];
  const stageLabel = STARTUP_STAGES.find((s) => s.value === p.stage)?.label ?? p.stage;
  const [interested, setInterested] = useState(false);
  const [watching, setWatching] = useState(false);
  const [pending, start] = useTransition();

  const onExpressInterest = () => start(async () => {
    const r = await expressInterest(p.id);
    if (r.ok) { setInterested(true); toast.success("Interest sent — founder will see it in their dashboard."); }
    else toast.error(r.error);
  });

  const onWatch = () => start(async () => {
    const r = await addToWatchlist(p.id);
    if (r.ok) { setWatching(true); toast.success("Added to your watchlist"); }
    else toast.error(r.error);
  });

  return (
    <div style={{ width: "100%" }}>
      <div
        className="sd-hero"
        style={{
          position: "relative",
          minHeight: 280,
          padding: "60px 20px 50px",
          background: p.cover_image_url
            ? `linear-gradient(180deg, rgba(10,14,26,0.4), rgba(10,14,26,0.92)), url(${p.cover_image_url}) center/cover no-repeat, #0F172A`
            : `radial-gradient(900px 320px at 25% 0%, rgba(16,185,129,0.28), transparent 60%), radial-gradient(800px 320px at 80% 20%, rgba(96,165,250,0.18), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Link href="/investors" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 999,
            background: "rgba(10,14,26,0.7)", backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)", color: DIM,
            fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 22,
          }}>← All pitches</Link>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={pillSolid(ACCENT)}>{p.category}</span>
            <span style={pill("#60A5FA")}>{stageLabel}</span>
            {p.country && <span style={pill(DIM)}>📍 {p.country}</span>}
            {p.is_featured && <span style={pillGradient()}>★ Featured</span>}
            {p.founded_year && <span style={pill(DIM)}>Founded {p.founded_year}</span>}
            {p.team_size && <span style={pill(DIM)}>{p.team_size} {p.team_size === 1 ? "person" : "people"}</span>}
          </div>

          <h1
            className="sd-title"
            style={{
              margin: 0,
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              fontWeight: 900,
              color: INK,
              fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
              maxWidth: 780,
            }}
          >
            {p.startup_name}
          </h1>
          <p style={{ margin: "10px 0 0", maxWidth: 720, fontSize: 17, color: DIM, lineHeight: 1.5, fontStyle: "italic" }}>
            {p.tagline}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "30px 20px 60px" }}>
        <div className="sd-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 26, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            {/* Description */}
            <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
              <h2 style={sectionHead}>About {p.startup_name}</h2>
              <p style={{ fontSize: 15, color: INK, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{p.description}</p>
            </div>

            {/* Looking for */}
            {p.looking_for.length > 0 && (
              <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
                <h2 style={sectionHead}>Currently looking for</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {p.looking_for.map((l) => (
                    <span key={l} style={pill(ACCENT)}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Founder card */}
            <div style={{ padding: 22, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
              <h2 style={sectionHead}>Founder</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {p.founder_avatar ? (
                  <img src={p.founder_avatar} alt="" style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${tier.border}` }} />
                ) : (
                  <span style={{ width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff" }}>
                    {(p.founder_name || "?").charAt(0)}
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: INK, letterSpacing: -0.2 }}>{p.founder_name || "CIOS Founder"}</div>
                  <div style={{ display: "inline-block", marginTop: 4, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: tier.fg, background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 999 }}>
                    {credBadge}
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{provenance}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky aside — interest + watch + traction */}
          <aside style={{ position: "sticky", top: 84 }} className="sd-aside">
            <div style={{
              padding: 22,
              background: "linear-gradient(180deg, rgba(16,185,129,0.08), rgba(255,255,255,0.02))",
              border: "1px solid rgba(16,185,129,0.28)",
              borderRadius: 20,
              boxShadow: "0 28px 60px -20px rgba(16,185,129,0.35)",
            }}>
              {/* Traction strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
                <Kv label="Stage" value={stageLabel} />
                <Kv label="Views" value={`${p.views ?? 0}`} />
                {p.monthly_revenue_usd && <Kv label="MRR" value={`$${Number(p.monthly_revenue_usd).toLocaleString()}`} highlight />}
                {p.raising_amount_usd && <Kv label="Raising" value={`$${(Number(p.raising_amount_usd) / 1000).toFixed(0)}K`} highlight />}
              </div>

              {/* Express interest CTA */}
              <ConversionGate
                action="Express interest"
                benefit="Sign up free as an investor — your interest signal goes straight to the founder, plus you can watchlist this pitch and DM the founder."
                intendedRole="investor"
                variant="card"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    onClick={onExpressInterest}
                    disabled={pending || interested}
                    style={{
                      width: "100%", padding: "13px 0",
                      background: interested ? "rgba(52,211,153,0.18)" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                      color: interested ? "#34D399" : "#fff",
                      border: interested ? "1px solid rgba(52,211,153,0.4)" : "none",
                      borderRadius: 14, fontSize: 14, fontWeight: 800,
                      cursor: pending || interested ? "default" : "pointer",
                      boxShadow: interested ? "none" : `0 12px 26px -10px rgba(16,185,129,0.55)`,
                    }}
                  >
                    {interested ? "✓ Interest sent" : "✉ Express interest"}
                  </button>
                  <button
                    onClick={onWatch}
                    disabled={pending || watching}
                    style={{
                      width: "100%", padding: "10px 0",
                      background: watching ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.04)",
                      color: watching ? "#FBBF24" : INK,
                      border: `1px solid ${watching ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)"}`,
                      borderRadius: 12, fontSize: 12, fontWeight: 800,
                      cursor: pending || watching ? "default" : "pointer",
                    }}
                  >
                    {watching ? "★ Watching" : "☆ Add to watchlist"}
                  </button>
                </div>
              </ConversionGate>

              {/* Links */}
              {(p.website_url || p.pitch_deck_url) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.website_url && (
                    <a href={p.website_url} target="_blank" rel="noopener noreferrer" style={extLink}>
                      🌐 Website ↗
                    </a>
                  )}
                  {p.pitch_deck_url && (
                    <a href={p.pitch_deck_url} target="_blank" rel="noopener noreferrer" style={extLink}>
                      📊 Pitch deck ↗
                    </a>
                  )}
                </div>
              )}

              <p style={{ marginTop: 14, fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.55 }}>
                Direct messaging unlocks once both sides agree. CIOS never shares your contact details without consent.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .sd-grid { grid-template-columns: 1fr !important; }
          .sd-aside { position: static !important; }
          .sd-hero { min-height: 200px !important; padding: 40px 20px !important; }
          .sd-title { font-size: 28px !important; letter-spacing: -0.6px !important; }
        }
      `}</style>
    </div>
  );
}

function pill(color: string): React.CSSProperties {
  return { padding: "3px 10px", fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", background: `${color}22`, color, border: `1px solid ${color}55`, borderRadius: 999, whiteSpace: "nowrap" };
}
function pillSolid(color: string): React.CSSProperties {
  return { padding: "3px 10px", fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", background: color, color: "#0A0E1A", borderRadius: 999, whiteSpace: "nowrap" };
}
function pillGradient(): React.CSSProperties {
  return { padding: "3px 10px", fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", background: "linear-gradient(135deg, #FBBF24, #F59E0B)", color: "#1A1205", borderRadius: 999, whiteSpace: "nowrap" };
}

function Kv({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: 1.2, color: MUTED, textTransform: "uppercase", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: highlight ? ACCENT : INK, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

const sectionHead: React.CSSProperties = {
  fontSize: 10, letterSpacing: 2, fontWeight: 800, color: MUTED, textTransform: "uppercase", margin: "0 0 12px",
};

const extLink: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  color: INK,
  border: "1px solid rgba(255,255,255,0.07)",
  fontSize: 12,
  fontWeight: 700,
  textDecoration: "none",
  textAlign: "center" as const,
};
