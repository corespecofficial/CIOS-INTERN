"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/app/actions/marketplace";
import { type Product, type Purchase, CATEGORIES } from "@/app/actions/marketplace-types";

const ACCENT = "#AB47BC";
const ACCENT_DIM = "rgba(171,71,188,0.15)";
const ACCENT_BORDER = "rgba(171,71,188,0.25)";

interface Props {
  products: Product[];
  purchases: Purchase[];
}

const DEFAULT_FORM = {
  title: "",
  description: "",
  category: CATEGORIES[0] as string,
  price_ngn: 0,
  price_usd: "",
  tags: "",
};

export function SellerDashboardClient({ products: initialProducts, purchases }: Props) {
  const [tab, setTab] = useState<"listings" | "purchases">("listings");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pending, start] = useTransition();
  const [editingStatus, setEditingStatus] = useState<Record<string, boolean>>({});

  const totalSales = products.reduce((acc, p) => acc + p.sales_count, 0);
  const estEarnings = products.reduce((acc, p) => acc + p.price_ngn * p.sales_count, 0);

  const handleCreate = () => {
    start(async () => {
      const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const r = await createProduct({
        title: form.title,
        description: form.description,
        category: form.category,
        price_ngn: Number(form.price_ngn),
        price_usd: form.price_usd ? Number(form.price_usd) : undefined,
        tags,
      });
      if (r.ok) {
        toast.success("Product listed successfully!");
        setForm(DEFAULT_FORM);
        setShowForm(false);
        // Optimistically add a placeholder until next page load
        const newProduct: Product = {
          id: r.data?.id || crypto.randomUUID(),
          seller_id: "",
          seller_name: null,
          seller_avatar: null,
          title: form.title,
          description: form.description,
          category: form.category,
          price_ngn: Number(form.price_ngn),
          price_usd: form.price_usd ? Number(form.price_usd) : null,
          tags,
          status: "active",
          sales_count: 0,
          rating: 0,
          created_at: new Date().toISOString(),
        };
        setProducts((prev) => [newProduct, ...prev]);
      } else {
        toast.error(r.error);
      }
    });
  };

  const handleToggleStatus = (p: Product) => {
    const newStatus = p.status === "active" ? "draft" : "active";
    start(async () => {
      const r = await updateProduct(p.id, { status: newStatus });
      if (r.ok) {
        toast.success(`Product set to ${newStatus}`);
        setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: newStatus } : x));
        setEditingStatus((prev) => ({ ...prev, [p.id]: false }));
      } else {
        toast.error(r.error);
      }
    });
  };

  const handleDelete = (p: Product) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    start(async () => {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        toast.success("Product deleted.");
        setProducts((prev) => prev.filter((x) => x.id !== p.id));
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @media (max-width: 600px) {
          .sd-stats-grid { grid-template-columns: 1fr !important; }
          .sd-form-2col { grid-template-columns: 1fr !important; }
          .sd-purchases-row { grid-template-columns: 1fr auto !important; }
          .sd-purchases-hide { display: none !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>SELLER DASHBOARD</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "4px 0 0", fontFamily: "'Space Grotesk', sans-serif" }}>🏪 My Marketplace</h1>
        </div>
        <Link href="/marketplace" style={{ padding: "8px 18px", background: "rgba(255,255,255,0.04)", color: "#8892A4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>← Browse Marketplace</Link>
      </div>

      {/* Stat cards */}
      <div className="sd-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {[
          { label: "My Products", value: products.length, suffix: "" },
          { label: "Total Sales", value: totalSales, suffix: " units" },
          { label: "Est. Earnings", value: `₦${estEarnings.toLocaleString()}`, suffix: "" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}<span style={{ fontSize: 13, color: "#8892A4", fontWeight: 400 }}>{s.suffix}</span></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0 }}>
        {(["listings", "purchases"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", background: "none", border: "none", borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent", color: tab === t ? ACCENT : "#8892A4", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Nunito', sans-serif", marginBottom: -1 }}>
            {t === "listings" ? "My Listings" : "My Purchases"}
          </button>
        ))}
      </div>

      {/* My Listings tab */}
      {tab === "listings" && (
        <div>
          {/* New Product toggle */}
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowForm((v) => !v)}
              style={{ padding: "10px 22px", background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              {showForm ? "✕ Cancel" : "+ List New Product"}
            </button>
          </div>

          {/* Form panel */}
          {showForm && (
            <div style={{ background: "#111827", border: `1px solid ${ACCENT_BORDER}`, borderRadius: 14, padding: 24, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", margin: "0 0 18px", fontFamily: "'Space Grotesk', sans-serif" }}>New Product</h3>
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 6, fontWeight: 600 }}>Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Figma Dashboard Template"
                    required
                    style={{ width: "100%", padding: "9px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 6, fontWeight: 600 }}>Description * (min 20 chars)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe your product in detail…"
                    rows={4}
                    required
                    style={{ width: "100%", padding: "9px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <div className="sd-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 6, fontWeight: 600 }}>Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      style={{ width: "100%", padding: "9px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, outline: "none" }}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 6, fontWeight: 600 }}>Price ₦ (0 = Free)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.price_ngn}
                      onChange={(e) => setForm((f) => ({ ...f, price_ngn: Number(e.target.value) }))}
                      style={{ width: "100%", padding: "9px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div className="sd-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 6, fontWeight: 600 }}>USD Price (optional)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price_usd}
                      onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))}
                      placeholder="e.g. 4.99"
                      style={{ width: "100%", padding: "9px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#8892A4", marginBottom: 6, fontWeight: 600 }}>Tags (comma-separated)</label>
                    <input
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="e.g. figma, template"
                      style={{ width: "100%", padding: "9px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={pending || !form.title || !form.description}
                  style={{ padding: "11px 28px", background: ACCENT, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1, alignSelf: "flex-start" }}
                >
                  {pending ? "Listing…" : "🚀 Publish Product"}
                </button>
              </div>
            </div>
          )}

          {/* Products list */}
          {products.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
              You haven&apos;t listed any products yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map((p) => (
                <div key={p.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{p.title}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", background: "rgba(171,71,188,0.1)", color: ACCENT, borderRadius: 10, fontWeight: 700 }}>{p.category}</span>
                      <span style={{ fontSize: 12, color: "#E8EDF5", fontWeight: 700 }}>{p.price_ngn === 0 ? "FREE" : `₦${p.price_ngn.toLocaleString()}`}</span>
                      <span style={{ fontSize: 11, color: "#8892A4" }}>{p.sales_count} sold</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10, padding: "3px 10px", borderRadius: 10, fontWeight: 700,
                      background: p.status === "active" ? "rgba(102,187,106,0.1)" : "rgba(255,193,7,0.1)",
                      color: p.status === "active" ? "#66BB6A" : "#FFC107",
                    }}>{p.status}</span>
                    <button
                      onClick={() => handleToggleStatus(p)}
                      disabled={pending}
                      style={{ padding: "5px 12px", background: "rgba(255,255,255,0.04)", color: "#8892A4", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      {p.status === "active" ? "Set Draft" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={pending}
                      style={{ padding: "5px 12px", background: "rgba(239,83,80,0.08)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.2)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Purchases tab */}
      {tab === "purchases" && (
        <div>
          {purchases.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
              You haven&apos;t purchased anything yet.{" "}
              <Link href="/marketplace" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>Browse the marketplace →</Link>
            </div>
          ) : (
            <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 0 }}>
                {/* Header row */}
                <div style={{ padding: "12px 18px", fontSize: 11, color: "#8892A4", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>PRODUCT</div>
                <div style={{ padding: "12px 18px", fontSize: 11, color: "#8892A4", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)", textAlign: "right", whiteSpace: "nowrap" }}>AMOUNT PAID</div>
                <div style={{ padding: "12px 18px", fontSize: 11, color: "#8892A4", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.07)", textAlign: "right", whiteSpace: "nowrap" }}>DATE</div>
                {/* Data rows */}
                {purchases.map((pur, i) => (
                  <>
                    <div key={`title-${pur.id}`} style={{ padding: "13px 18px", fontSize: 13, color: "#E8EDF5", fontWeight: 600, borderBottom: i < purchases.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <Link href={`/marketplace/${pur.product_id}`} style={{ color: "#E8EDF5", textDecoration: "none" }}>{pur.product_title}</Link>
                    </div>
                    <div key={`amount-${pur.id}`} style={{ padding: "13px 18px", fontSize: 13, color: "#66BB6A", fontWeight: 700, textAlign: "right", borderBottom: i < purchases.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", whiteSpace: "nowrap" }}>
                      {pur.amount_paid === 0 ? "FREE" : `₦${Number(pur.amount_paid).toLocaleString()}`}
                    </div>
                    <div key={`date-${pur.id}`} style={{ padding: "13px 18px", fontSize: 12, color: "#8892A4", textAlign: "right", borderBottom: i < purchases.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", whiteSpace: "nowrap" }}>
                      {new Date(pur.purchased_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
