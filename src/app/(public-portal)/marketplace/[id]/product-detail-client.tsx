/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { recordPurchase } from "@/app/actions/marketplace";
import type { Product } from "@/app/actions/marketplace-types";
import { TIER_STYLES } from "@/lib/creator-credibility";
import { ConversionGate } from "@/components/portal/conversion-gate";

interface Props {
  product: Product;
  credBadge: string;
  credTier: keyof typeof TIER_STYLES;
  provenance: string;
}

const ACCENT = "#A855F7";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

export function ProductDetailClient({ product: p, credBadge, credTier, provenance }: Props) {
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState<number>(p.pay_min_ngn != null ? Number(p.pay_min_ngn) : Number(p.price_ngn));
  const tierStyle = TIER_STYLES[credTier];

  const isFree = p.price_ngn === 0 && p.pay_min_ngn == null;
  const isPwyw = p.pay_min_ngn != null;
  const minPay = Number(p.pay_min_ngn ?? 0);
  const suggested = Number(p.price_ngn);

  const doBuy = () => {
    start(async () => {
      const r = await recordPurchase(
        isPwyw
          ? { productId: p.id, amount: Math.max(minPay, Math.round(amount)) }
          : { productId: p.id }
      );
      if (r.ok) toast.success("Purchase recorded — check your wallet + purchases.");
      else toast.error(r.error);
    });
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Hero/cover strip */}
      <div
        style={{
          position: "relative",
          height: 280,
          background: p.cover_image_url
            ? `linear-gradient(180deg, rgba(10,14,26,0.25), rgba(10,14,26,0.85)), url(${p.cover_image_url}) center/cover no-repeat, #0F172A`
            : `radial-gradient(800px 300px at 30% 0%, rgba(168,85,247,0.3), transparent 60%), radial-gradient(700px 300px at 80% 20%, rgba(30,136,229,0.2), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        className="pd-hero"
      />

      <div style={{ maxWidth: 1080, margin: "-100px auto 0", padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
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

        <div
          className="pd-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 340px",
            gap: 26,
            alignItems: "start",
          }}
        >
          {/* LEFT — product narrative */}
          <div style={{ minWidth: 0 }}>
            {/* Title block */}
            <div
              style={{
                padding: 28,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={badgeStyle(ACCENT)}>{p.category}</span>
                {p.is_featured && <span style={badgeStyle("#F59E0B", true)}>★ Featured</span>}
                {p.is_verified && <span style={badgeStyle("#60A5FA")}>✓ CIOS-verified</span>}
                {p.built_at_cios && <span style={badgeStyle("#34D399")}>Built on CIOS</span>}
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 34,
                  lineHeight: 1.1,
                  letterSpacing: -1,
                  fontWeight: 900,
                  color: INK,
                  fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
                }}
                className="pd-title"
              >
                {p.title}
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED, fontWeight: 600 }}>
                {provenance} · listed {new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </p>

              {p.tags.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {p.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, color: DIM }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div
              style={{
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
                marginBottom: 20,
              }}
            >
              <h2 style={sectionHead}>About this product</h2>
              <p style={{ fontSize: 15, color: INK, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>
                {p.description}
              </p>
            </div>

            {/* Creator card */}
            <div
              style={{
                padding: 22,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 20,
              }}
            >
              <h2 style={sectionHead}>About the creator</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                {p.seller_avatar ? (
                  <img
                    src={p.seller_avatar}
                    alt=""
                    style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${tierStyle.border}`, flexShrink: 0 }}
                  />
                ) : (
                  <span
                    style={{
                      width: 58, height: 58, borderRadius: "50%",
                      background: "linear-gradient(135deg, #A855F7, #7C3AED)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 900, color: "#fff", flexShrink: 0,
                    }}
                  >
                    {(p.seller_name || "?").charAt(0)}
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: INK, letterSpacing: -0.2 }}>
                    {p.seller_name || "CIOS Creator"}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 800,
                      color: tierStyle.fg,
                      background: tierStyle.bg,
                      border: `1px solid ${tierStyle.border}`,
                      borderRadius: 999,
                    }}
                  >
                    {credBadge}
                  </div>
                </div>
                <Link
                  href={`/marketplace/creator/${p.seller_id}`}
                  style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textDecoration: "none", whiteSpace: "nowrap" }}
                >
                  View shop →
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT — sticky buy card */}
          <aside style={{ position: "sticky", top: 84 }} className="pd-aside">
            <div
              style={{
                padding: 22,
                background: "linear-gradient(180deg, rgba(168,85,247,0.08), rgba(255,255,255,0.02))",
                border: "1px solid rgba(168,85,247,0.28)",
                borderRadius: 20,
                boxShadow: "0 28px 60px -20px rgba(168,85,247,0.35)",
              }}
            >
              {/* Price */}
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                {isFree ? (
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#34D399", fontFamily: "'Space Grotesk', sans-serif" }}>FREE</div>
                ) : isPwyw ? (
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, color: DIM, fontWeight: 800, textTransform: "uppercase" }}>
                      Pay what you want · min ₦{minPay.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 34, fontWeight: 900, color: INK, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
                      ₦{Math.max(minPay, Math.round(amount)).toLocaleString()}
                    </div>
                    <input
                      type="range"
                      aria-label="Choose your price"
                      min={minPay}
                      max={Math.max(suggested * 3, minPay + 5000)}
                      step={100}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      style={{ width: "100%", marginTop: 12, accentColor: ACCENT }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4, fontWeight: 700 }}>
                      <span>₦{minPay.toLocaleString()}</span>
                      <span>suggested ₦{suggested.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 34, fontWeight: 900, color: INK, fontFamily: "'Space Grotesk', sans-serif" }}>
                      ₦{suggested.toLocaleString()}
                    </div>
                    {p.price_usd && (
                      <div style={{ fontSize: 13, color: DIM, marginTop: 2 }}>≈ ${Number(p.price_usd).toFixed(2)} USD</div>
                    )}
                  </>
                )}
              </div>

              {/* CTA — gated via ConversionGate for anon users */}
              <ConversionGate
                action={isFree ? "Grab this free product" : `Buy “${p.title}”`}
                benefit="Join free as a public user. Your wallet funds purchases instantly; sellers get paid the same day."
                intendedRole="public_user"
                variant="card"
              >
                <button
                  onClick={doBuy}
                  disabled={pending}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    background: isFree ? "linear-gradient(135deg, #34D399, #059669)" : "linear-gradient(135deg, #A855F7, #7C3AED)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: pending ? "wait" : "pointer",
                    letterSpacing: 0.2,
                    boxShadow: "0 14px 28px -10px rgba(168,85,247,0.55)",
                  }}
                >
                  {pending ? "Processing…" : isFree ? "Get for free" : isPwyw ? `Pay ₦${Math.max(minPay, Math.round(amount)).toLocaleString()}` : "Buy now"}
                </button>
              </ConversionGate>

              <p style={{ fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.55, margin: "10px 0 0" }}>
                Payment splits 85% to the creator, 15% to the CIOS pool that funds the next cohort.
              </p>

              {/* Fact strip */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                <Kv label="Category" value={p.category} />
                <Kv label="Sales" value={`${p.sales_count}`} />
                <Kv label="Rating" value={p.rating > 0 ? p.rating.toFixed(1) : "—"} />
                <Kv label="Listed" value={new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })} />
              </div>
            </div>

            {/* Share block */}
            <div style={{ marginTop: 14, padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, fontSize: 12, color: DIM }}>
              Shareable link —{" "}
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copied");
                  } catch {
                    toast.error("Copy failed");
                  }
                }}
                style={{ background: "transparent", border: "none", color: ACCENT, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12 }}
              >
                copy
              </button>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .pd-grid { grid-template-columns: 1fr !important; }
          .pd-aside { position: static !important; }
          .pd-hero { height: 180px !important; }
          .pd-title { font-size: 26px !important; letter-spacing: -0.6px !important; }
        }
      `}</style>
    </div>
  );
}

function badgeStyle(color: string, strong = false): React.CSSProperties {
  return {
    padding: "3px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: strong ? "linear-gradient(135deg, #FBBF24, #F59E0B)" : `${color}22`,
    color: strong ? "#1A1205" : color,
    border: strong ? "none" : `1px solid ${color}55`,
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

const sectionHead: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  fontWeight: 800,
  color: MUTED,
  textTransform: "uppercase",
  margin: "0 0 12px",
};

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: MUTED, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginTop: 2 }}>{value}</div>
    </div>
  );
}
