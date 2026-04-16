/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { recordPurchase } from "@/app/actions/marketplace";
import { type Product, CATEGORIES } from "@/app/actions/marketplace-types";

const ACCENT = "#AB47BC";
const ACCENT_DIM = "rgba(171,71,188,0.15)";
const ACCENT_BORDER = "rgba(171,71,188,0.25)";

export function MarketplaceClient({ products }: { products: Product[] }) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = products;
    if (category !== "All") list = list.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  }, [products, category, search]);

  const tabs = ["All", ...CATEGORIES];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${ACCENT_DIM}, rgba(171,71,188,0.05))`, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 20, padding: 28, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>DIGITAL MARKETPLACE</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "4px 0 6px", fontFamily: "'Space Grotesk', sans-serif" }}>🛒 CIOS Marketplace</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Buy and sell digital products — templates, tools, and more — created by the CIOS community.</p>
        </div>
        <Link href="/marketplace/sell" style={{ padding: "10px 22px", background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>+ Sell a Product</Link>
      </div>

      {/* Search + stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ flex: "1 1 200px", padding: "9px 14px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, outline: "none" }} />
        <span style={{ fontSize: 12, color: "#8892A4" }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setCategory(t)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: category === t ? ACCENT_DIM : "rgba(255,255,255,0.04)", color: category === t ? ACCENT : "#8892A4", transition: "all 0.15s" }}>{t}</button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          {products.length === 0 ? "No products yet. Be the first to sell something! 🚀" : "No products match your search."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product: p }: { product: Product }) {
  const [pending, start] = useTransition();

  const buy = () => {
    if (p.price_ngn === 0) { toast("This product is free — grab it from the details page!"); return; }
    start(async () => {
      const r = await recordPurchase(p.id);
      if (r.ok) toast.success("Purchase recorded! Check your purchases in My Products.");
      else toast.error(r.error);
    });
  };

  const stars = "★".repeat(Math.round(p.rating || 0)) + "☆".repeat(5 - Math.round(p.rating || 0));

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 18, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 10, padding: "3px 10px", background: "rgba(171,71,188,0.1)", color: "#AB47BC", borderRadius: 20, fontWeight: 700, letterSpacing: 0.5 }}>{p.category}</span>
          {p.price_ngn === 0
            ? <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(102,187,106,0.1)", color: "#66BB6A", borderRadius: 20, fontWeight: 700 }}>FREE</span>
            : <span style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>₦{p.price_ngn.toLocaleString()}</span>
          }
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: "0 0 6px", lineHeight: 1.3 }}>{p.title}</h3>
        <p style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {p.seller_avatar
            ? <img src={p.seller_avatar} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
            : <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#AB47BC", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{(p.seller_name || "?").charAt(0)}</span>
          }
          <span style={{ fontSize: 11, color: "#8892A4" }}>{p.seller_name || "Seller"}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#FFC107" }}>{stars}</span>
          <span style={{ fontSize: 10, color: "#8892A4" }}>{p.sales_count} sold</span>
        </div>
        {p.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {p.tags.slice(0, 3).map((t) => <span key={t} style={{ fontSize: 9, padding: "2px 7px", background: "rgba(255,255,255,0.04)", borderRadius: 4, color: "#8892A4" }}>{t}</span>)}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
        <Link href={`/marketplace/${p.id}`} style={{ flex: 1, padding: "8px 0", textAlign: "center", background: "rgba(255,255,255,0.04)", color: "#E8EDF5", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>View Details</Link>
        <button onClick={buy} disabled={pending} style={{ flex: 1, padding: "8px 0", background: "rgba(171,71,188,0.15)", color: "#AB47BC", border: "1px solid rgba(171,71,188,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {pending ? "…" : p.price_ngn === 0 ? "🆓 Get Free" : "💜 Buy Now"}
        </button>
      </div>
    </div>
  );
}
