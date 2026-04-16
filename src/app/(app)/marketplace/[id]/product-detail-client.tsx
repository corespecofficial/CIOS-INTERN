/* eslint-disable @next/next/no-img-element */
"use client";
import { useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { recordPurchase } from "@/app/actions/marketplace";
import type { Product } from "@/app/actions/marketplace-types";

const ACCENT = "#AB47BC";
const ACCENT_DIM = "rgba(171,71,188,0.15)";
const ACCENT_BORDER = "rgba(171,71,188,0.25)";

export function ProductDetailClient({ product: p }: { product: Product }) {
  const [pending, start] = useTransition();

  const buy = () => {
    start(async () => {
      const r = await recordPurchase(p.id);
      if (r.ok) toast.success("Purchase recorded! Check your purchases in My Products.");
      else toast.error(r.error);
    });
  };

  const stars = "★".repeat(Math.round(p.rating || 0)) + "☆".repeat(5 - Math.round(p.rating || 0));
  const isFree = p.price_ngn === 0;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          .pd-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Back link */}
      <Link href="/marketplace" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#8892A4", fontSize: 13, textDecoration: "none", marginBottom: 24, fontWeight: 600 }}>
        ← Back to Marketplace
      </Link>

      <div className="pd-layout" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>
        {/* Left column: product info */}
        <div>
          {/* Category + tags row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 11, padding: "3px 12px", background: "rgba(171,71,188,0.1)", color: ACCENT, borderRadius: 20, fontWeight: 700 }}>{p.category}</span>
            {p.tags.map((t) => (
              <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 4, color: "#8892A4" }}>{t}</span>
            ))}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#E8EDF5", margin: "0 0 16px", lineHeight: 1.25, fontFamily: "'Space Grotesk', sans-serif" }}>{p.title}</h1>

          {/* Rating + sales */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 16, color: "#FFC107", letterSpacing: 1 }}>{stars}</span>
            <span style={{ fontSize: 13, color: "#8892A4" }}>{p.rating > 0 ? p.rating.toFixed(1) : "No ratings yet"}</span>
            <span style={{ fontSize: 12, color: "#8892A4" }}>·</span>
            <span style={{ fontSize: 13, color: "#8892A4" }}>{p.sales_count} sold</span>
          </div>

          {/* Description */}
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22, marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#8892A4", margin: "0 0 12px", textTransform: "uppercase", letterSpacing: 0.5 }}>Description</h2>
            <p style={{ fontSize: 14, color: "#E8EDF5", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{p.description}</p>
          </div>

          {/* Seller section */}
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#8892A4", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>About the Seller</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {p.seller_avatar
                ? <img src={p.seller_avatar} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${ACCENT_BORDER}` }} />
                : <span style={{ width: 48, height: 48, borderRadius: "50%", background: ACCENT, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{(p.seller_name || "?").charAt(0)}</span>
              }
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{p.seller_name || "Seller"}</div>
                <Link href={`/profile/${p.seller_id}`} style={{ fontSize: 12, color: ACCENT, textDecoration: "none", fontWeight: 600 }}>View Profile →</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: purchase card */}
        <div style={{ position: "sticky", top: 20 }}>
          <div style={{ background: "#111827", border: `1px solid ${ACCENT_BORDER}`, borderRadius: 16, padding: 24 }}>
            {/* Price display */}
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              {isFree ? (
                <span style={{ fontSize: 28, fontWeight: 800, color: "#66BB6A", fontFamily: "'Space Grotesk', sans-serif" }}>FREE</span>
              ) : (
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>₦{p.price_ngn.toLocaleString()}</div>
                  {p.price_usd && (
                    <div style={{ fontSize: 14, color: "#8892A4", marginTop: 4 }}>≈ ${p.price_usd.toFixed(2)} USD</div>
                  )}
                </div>
              )}
            </div>

            {/* Buy button */}
            <button
              onClick={buy}
              disabled={pending}
              style={{
                width: "100%",
                padding: "13px 0",
                background: isFree ? "rgba(102,187,106,0.15)" : ACCENT_DIM,
                color: isFree ? "#66BB6A" : ACCENT,
                border: `1px solid ${isFree ? "rgba(102,187,106,0.25)" : ACCENT_BORDER}`,
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 800,
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.7 : 1,
                fontFamily: "'Nunito', sans-serif",
                marginBottom: 12,
              }}
            >
              {pending ? "Processing…" : isFree ? "🆓 Get for Free" : "💜 Buy Now"}
            </button>

            <div style={{ fontSize: 11, color: "#8892A4", textAlign: "center", lineHeight: 1.6 }}>
              {isFree ? "Free to grab — no payment required." : "Purchase is recorded immediately. Delivery details via message."}
            </div>

            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8892A4", marginBottom: 8 }}>
                <span>Category</span>
                <span style={{ color: "#E8EDF5" }}>{p.category}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8892A4", marginBottom: 8 }}>
                <span>Listed</span>
                <span style={{ color: "#E8EDF5" }}>{new Date(p.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8892A4" }}>
                <span>Sales</span>
                <span style={{ color: "#E8EDF5" }}>{p.sales_count} units</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
