/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { type Product, CATEGORIES } from "@/app/actions/marketplace-types";
import { creatorCredibility, TIER_STYLES } from "@/lib/creator-credibility";

/**
 * Public Marketplace browse.
 *
 * Design intent:
 *   - Hero that signals what CIOS Marketplace IS (not another noisy grid).
 *   - Search + category chips that feel tactile, not bureaucratic.
 *   - Product cards lead with creator credibility (Top %, Level, XP) — that
 *     single differentiator is the whole point of shopping here vs Gumroad.
 *   - Gracefully handles anonymous visitors: the Buy CTA links to the detail
 *     page where <ConversionGate> handles the sign-up flow.
 */

const ACCENT = "#A855F7";        // purple — marketplace primary
const ACCENT_2 = "#8B5CF6";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

export function MarketplaceClient({ products }: { products: Product[] }) {
  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"featured" | "new" | "popular">("featured");

  const filtered = useMemo(() => {
    let list = [...products];
    if (category !== "All") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sort === "new") list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sort === "popular") list.sort((a, b) => b.sales_count - a.sales_count);
    // "featured" keeps server order (is_featured DESC, created_at DESC)
    return list;
  }, [products, category, search, sort]);

  const tabs = ["All", ...CATEGORIES] as const;

  return (
    <div style={{ width: "100%" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          padding: "56px 20px 48px",
          background:
            "radial-gradient(1000px 400px at 20% 0%, rgba(168,85,247,0.22), transparent 60%), radial-gradient(900px 400px at 90% 10%, rgba(30,136,229,0.16), transparent 60%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(168,85,247,0.14)",
              border: "1px solid rgba(168,85,247,0.34)",
              color: ACCENT,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Africa's creator marketplace
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: -1.4,
              fontWeight: 900,
              color: INK,
              fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
            }}
            className="mkt-hero-h1"
          >
            Digital products by <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #60A5FA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>vetted CIOS talent</span>.
          </h1>
          <p style={{ margin: "14px auto 0", maxWidth: 640, fontSize: 16, color: DIM, lineHeight: 1.55 }}>
            Templates, tools, e-books, courses, design kits. Every creator is a ranked
            CIOS intern, mentor or alumnus — so you always know who you're buying from.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/marketplace/sell"
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #A855F7, #7C3AED)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 12px 28px -10px rgba(168,85,247,0.7)",
              }}
            >
              + Sell on CIOS
            </Link>
            <a
              href="#browse"
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                color: INK,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Browse {products.length} product{products.length === 1 ? "" : "s"}
            </a>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section id="browse" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 0" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
            <span aria-hidden style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: MUTED, fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, tags, creators…"
              aria-label="Search marketplace"
              style={{
                width: "100%",
                padding: "12px 16px 12px 40px",
                background: "rgba(255,255,255,0.03)",
                color: INK,
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          </div>
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            style={{
              padding: "11px 14px",
              background: "rgba(255,255,255,0.03)",
              color: INK,
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              fontSize: 13,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="featured">Featured</option>
            <option value="new">Newest</option>
            <option value="popular">Most sold</option>
          </select>
          <span style={{ fontSize: 12, color: MUTED }}>
            {filtered.length} of {products.length}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 22, scrollbarWidth: "none" }} className="mkt-cat-row">
          {tabs.map((t) => {
            const active = category === t;
            return (
              <button
                key={t}
                onClick={() => setCategory(t)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: `1px solid ${active ? "rgba(168,85,247,0.55)" : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.02)",
                  color: active ? ACCENT : DIM,
                  transition: "color 120ms ease, background 120ms ease",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <EmptyState hasAny={products.length > 0} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
              paddingBottom: 60,
            }}
          >
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>

      <style>{`
        .mkt-cat-row::-webkit-scrollbar { display: none; }
        @media (max-width: 640px) {
          .mkt-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>
    </div>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const cred = creatorCredibility({
    xp: p.seller_xp,
    level: p.seller_level,
    role: p.seller_role,
    percentile: p.seller_percentile,
  });
  const tierStyle = TIER_STYLES[cred.tier];
  const isFree = p.price_ngn === 0 && p.pay_min_ngn == null;
  const isPwyw = p.pay_min_ngn != null;

  return (
    <Link
      href={`/marketplace/${p.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 160ms ease, border-color 160ms ease, background 160ms ease",
      }}
      className="mkt-card"
    >
      {/* Cover — falls back to a branded gradient when no image uploaded */}
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 10",
          background: p.cover_image_url
            ? `url(${p.cover_image_url}) center/cover no-repeat, #0F172A`
            : `linear-gradient(135deg, rgba(168,85,247,0.35), rgba(30,136,229,0.22)), #0F172A`,
        }}
      >
        {/* Top row: category + featured badge */}
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span
            style={{
              padding: "4px 10px",
              fontSize: 10,
              letterSpacing: 0.8,
              fontWeight: 800,
              textTransform: "uppercase",
              background: "rgba(10,14,26,0.78)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E2E8F0",
              borderRadius: 999,
              backdropFilter: "blur(6px)",
            }}
          >
            {p.category}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {p.is_featured && (
              <span
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  letterSpacing: 0.8,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                  color: "#1A1205",
                  borderRadius: 999,
                }}
              >
                ★ Featured
              </span>
            )}
            {p.is_verified && (
              <span
                title="CIOS-verified"
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  background: "rgba(30,136,229,0.22)",
                  color: "#93C5FD",
                  border: "1px solid rgba(30,136,229,0.4)",
                  borderRadius: 999,
                  backdropFilter: "blur(6px)",
                }}
              >
                ✓
              </span>
            )}
          </div>
        </div>

        {/* Bottom: price pill */}
        <div style={{ position: "absolute", bottom: 10, right: 10 }}>
          <span
            style={{
              padding: "6px 12px",
              background: "rgba(10,14,26,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 800,
              color: INK,
              fontFamily: "'Space Grotesk', sans-serif",
              backdropFilter: "blur(6px)",
            }}
          >
            {isFree ? "FREE" : isPwyw ? `from ₦${Number(p.pay_min_ngn).toLocaleString()}` : `₦${Number(p.price_ngn).toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.2, margin: 0, lineHeight: 1.3 }}>
          {p.title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: DIM,
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {p.description}
        </p>

        {/* Creator row with credibility badge — the differentiator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          {p.seller_avatar ? (
            <img
              src={p.seller_avatar}
              alt=""
              style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${tierStyle.border}` }}
            />
          ) : (
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 800,
                color: "#fff",
              }}
            >
              {(p.seller_name || "?").charAt(0)}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.seller_name || "Seller"}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: tierStyle.fg, letterSpacing: 0.3, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cred.badge}
            </div>
          </div>
          {p.sales_count > 0 && (
            <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, whiteSpace: "nowrap" }}>
              {p.sales_count} sold
            </span>
          )}
        </div>
      </div>

      <style>{`
        .mkt-card:hover { transform: translateY(-2px); border-color: rgba(168,85,247,0.35); background: rgba(255,255,255,0.04); }
      `}</style>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div
      style={{
        padding: "60px 24px",
        textAlign: "center",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.1)",
        borderRadius: 16,
        marginBottom: 60,
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 10 }}>🛒</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>
        {hasAny ? "No products match your filters." : "The marketplace is warming up."}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
        {hasAny ? "Try clearing the search or switching category." : (
          <>
            Be the first to list something —{" "}
            <Link href="/marketplace/sell" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
              sell on CIOS →
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
