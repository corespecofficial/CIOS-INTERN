/* eslint-disable @next/next/no-img-element */
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
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";

const ACCENT = "#A855F7";
const ACCENT_2 = "#7C3AED";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

interface Props {
  products: Product[];
  purchases: Purchase[];
}

interface FormState {
  title: string;
  description: string;
  category: string;
  price_ngn: number;
  price_usd: string;
  tags: string;
  cover_image_url: string;
  pwyw_enabled: boolean;
  pay_min_ngn: number;
}

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  category: CATEGORIES[0],
  price_ngn: 0,
  price_usd: "",
  tags: "",
  cover_image_url: "",
  pwyw_enabled: false,
  pay_min_ngn: 0,
};

export function SellerDashboardClient({ products: initialProducts, purchases }: Props) {
  const [tab, setTab] = useState<"listings" | "purchases">("listings");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const totalSales = products.reduce((acc, p) => acc + p.sales_count, 0);
  const estEarnings = products.reduce((acc, p) => acc + Number(p.price_ngn) * p.sales_count * 0.85, 0);

  async function onCoverChange(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const compressed = await compressImage(files[0], { maxBytes: 1.5 * 1024 * 1024, maxDim: 1600 });
      const up = await uploadToCloudinary(compressed, { folder: "marketplace/covers", resourceType: "image" });
      setForm((f) => ({ ...f, cover_image_url: up.secureUrl }));
      toast.success("Cover uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

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
        cover_image_url: form.cover_image_url || undefined,
        pay_min_ngn: form.pwyw_enabled ? Number(form.pay_min_ngn) : null,
      });
      if (r.ok) {
        toast.success("Product listed");
        setForm(DEFAULT_FORM);
        setShowForm(false);
        // Optimistic row — will be replaced on next fetch
        const optimistic: Product = {
          id: r.data?.id || crypto.randomUUID(),
          seller_id: "",
          seller_name: null,
          seller_avatar: null,
          seller_xp: 0,
          seller_level: 1,
          seller_role: "intern",
          seller_percentile: null,
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
          cover_image_url: form.cover_image_url || null,
          pay_min_ngn: form.pwyw_enabled ? Number(form.pay_min_ngn) : null,
          is_verified: false,
          is_featured: false,
          built_at_cios: true,
          slug: null,
        };
        setProducts((prev) => [optimistic, ...prev]);
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
        toast.success(`Set to ${newStatus}`);
        setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: newStatus } : x)));
      } else toast.error(r.error);
    });
  };

  const handleDelete = (p: Product) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    start(async () => {
      const r = await deleteProduct(p.id);
      if (r.ok) {
        toast.success("Deleted");
        setProducts((prev) => prev.filter((x) => x.id !== p.id));
      } else toast.error(r.error);
    });
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: ACCENT, fontWeight: 800, textTransform: "uppercase" }}>
            Seller dashboard
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: INK, margin: "4px 0 0", letterSpacing: -0.6, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
            My creator shop
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: DIM }}>
            You keep 85% of every sale — the 15% cut funds the next CIOS cohort.
          </p>
        </div>
        <Link
          href="/marketplace"
          style={{
            padding: "9px 18px",
            background: "rgba(255,255,255,0.04)",
            color: DIM,
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          ← Back to marketplace
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 26 }}>
        <StatCard label="My products" value={products.length.toString()} color={ACCENT} />
        <StatCard label="Sales" value={`${totalSales} units`} color="#34D399" />
        <StatCard label="Earnings (est.)" value={`₦${Math.round(estEarnings).toLocaleString()}`} color="#FBBF24" note="after 15% fee" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {(["listings", "purchases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "11px 20px",
              background: "transparent",
              border: "none",
              borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent",
              color: tab === t ? ACCENT : DIM,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              marginBottom: -1,
            }}
          >
            {t === "listings" ? "My listings" : "My purchases"}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <button
              onClick={() => setShowForm((v) => !v)}
              style={{
                padding: "11px 22px",
                background: showForm ? "rgba(255,255,255,0.04)" : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                color: showForm ? DIM : "#fff",
                border: showForm ? "1px solid rgba(255,255,255,0.1)" : "none",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: showForm ? "none" : `0 12px 28px -10px rgba(168,85,247,0.6)`,
              }}
            >
              {showForm ? "✕ Cancel" : "+ List a new product"}
            </button>
          </div>

          {showForm && (
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(168,85,247,0.28)`,
                borderRadius: 18,
                padding: 24,
                marginBottom: 24,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 800, color: INK, margin: "0 0 18px", letterSpacing: -0.3 }}>
                New product
              </h3>
              <div style={{ display: "grid", gap: 14 }}>
                <Field label="Title" required>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Notion portfolio OS for designers"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Description" required note="min 20 chars — tell the story, not just features">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What problem does this solve? Who is it for? What's inside?"
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 110 }}
                  />
                </Field>

                {/* Cover image */}
                <Field label="Cover image (optional — recommended)">
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {form.cover_image_url ? (
                      <img
                        src={form.cover_image_url}
                        alt=""
                        style={{ width: 120, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 120,
                          height: 72,
                          borderRadius: 8,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px dashed rgba(255,255,255,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: MUTED,
                          fontSize: 11,
                        }}
                      >
                        no cover
                      </div>
                    )}
                    <label
                      style={{
                        padding: "9px 16px",
                        background: "rgba(168,85,247,0.14)",
                        color: ACCENT,
                        border: `1px solid rgba(168,85,247,0.32)`,
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: uploading ? "wait" : "pointer",
                      }}
                    >
                      {uploading ? "Uploading…" : "Choose image"}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => onCoverChange(e.target.files)}
                        disabled={uploading}
                      />
                    </label>
                    {form.cover_image_url && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                        style={{ background: "transparent", border: "none", color: MUTED, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
                      >
                        remove
                      </button>
                    )}
                  </div>
                </Field>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sd-2col">
                  <Field label="Category">
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      style={inputStyle}
                    >
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label={form.pwyw_enabled ? "Suggested price ₦" : "Price ₦ (0 = free)"}>
                    <input
                      type="number"
                      min={0}
                      value={form.price_ngn}
                      onChange={(e) => setForm((f) => ({ ...f, price_ngn: Number(e.target.value) }))}
                      style={inputStyle}
                    />
                  </Field>
                </div>

                {/* Pay-what-you-want toggle */}
                <div
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: form.pwyw_enabled ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.025)",
                    border: `1px solid ${form.pwyw_enabled ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.07)"}`,
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.pwyw_enabled}
                      onChange={(e) => setForm((f) => ({ ...f, pwyw_enabled: e.target.checked }))}
                      style={{ accentColor: "#34D399" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>Enable pay-what-you-want</div>
                      <div style={{ fontSize: 11, color: DIM, marginTop: 2 }}>
                        Buyers pick their own price above your minimum. Great for early traction + tips.
                      </div>
                    </div>
                  </label>
                  {form.pwyw_enabled && (
                    <div style={{ marginTop: 12 }}>
                      <Field label="Minimum ₦ (floor)">
                        <input
                          type="number"
                          min={0}
                          value={form.pay_min_ngn}
                          onChange={(e) => setForm((f) => ({ ...f, pay_min_ngn: Number(e.target.value) }))}
                          style={inputStyle}
                        />
                      </Field>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sd-2col">
                  <Field label="USD price (optional)">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price_usd}
                      onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))}
                      placeholder="e.g. 9.99"
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Tags (comma-separated)">
                    <input
                      value={form.tags}
                      onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                      placeholder="notion, templates, design"
                      style={inputStyle}
                    />
                  </Field>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={pending || !form.title || form.description.length < 20}
                  style={{
                    padding: "13px 24px",
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                    color: "#fff",
                    border: "none",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: pending ? "wait" : "pointer",
                    alignSelf: "flex-start",
                    opacity: pending || !form.title || form.description.length < 20 ? 0.55 : 1,
                    boxShadow: "0 12px 28px -10px rgba(168,85,247,0.55)",
                  }}
                >
                  {pending ? "Listing…" : "🚀 Publish product"}
                </button>
              </div>

              <style>{`
                @media (max-width: 600px) {
                  .sd-2col { grid-template-columns: 1fr !important; }
                }
              `}</style>
            </div>
          )}

          {products.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: DIM }}>
              You haven't listed anything yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {products.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14,
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt="" style={{ width: 56, height: 40, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 40, borderRadius: 6, background: `linear-gradient(135deg, rgba(168,85,247,0.3), rgba(30,136,229,0.2))`, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: INK, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 12 }}>
                      <span style={{ padding: "2px 8px", background: "rgba(168,85,247,0.12)", color: ACCENT, borderRadius: 999, fontWeight: 700 }}>{p.category}</span>
                      <span style={{ color: INK, fontWeight: 700 }}>
                        {p.price_ngn === 0 && p.pay_min_ngn == null ? "FREE" : p.pay_min_ngn != null ? `PWYW ≥ ₦${Number(p.pay_min_ngn).toLocaleString()}` : `₦${Number(p.price_ngn).toLocaleString()}`}
                      </span>
                      <span style={{ color: MUTED }}>· {p.sales_count} sold</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "3px 10px",
                        borderRadius: 999,
                        fontWeight: 800,
                        background: p.status === "active" ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.14)",
                        color: p.status === "active" ? "#34D399" : "#FBBF24",
                      }}
                    >
                      {p.status}
                    </span>
                    <Link
                      href={`/marketplace/${p.id}`}
                      style={{ padding: "6px 12px", background: "rgba(255,255,255,0.04)", color: INK, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: "none" }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(p)}
                      disabled={pending}
                      style={{ padding: "6px 12px", background: "rgba(255,255,255,0.04)", color: DIM, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      {p.status === "active" ? "Unlist" : "Publish"}
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      disabled={pending}
                      style={{ padding: "6px 12px", background: "rgba(239,83,80,0.1)", color: "#F87171", border: "1px solid rgba(239,83,80,0.3)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
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

      {tab === "purchases" && (
        <div>
          {purchases.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: DIM }}>
              You haven't purchased anything yet.{" "}
              <Link href="/marketplace" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>Browse →</Link>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto" }}>
                <HeadCell>Product</HeadCell>
                <HeadCell align="right">Paid</HeadCell>
                <HeadCell align="right">Date</HeadCell>
                {purchases.map((pur, i) => (
                  <Row
                    key={pur.id}
                    last={i === purchases.length - 1}
                    product={<Link href={`/marketplace/${pur.product_id}`} style={{ color: INK, textDecoration: "none", fontWeight: 700 }}>{pur.product_title}</Link>}
                    amount={pur.amount_paid === 0 ? "FREE" : `₦${Number(pur.amount_paid).toLocaleString()}`}
                    date={new Date(pur.purchased_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, note }: { label: string; value: string; color: string; note?: string }) {
  return (
    <div style={{ padding: "16px 18px", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, borderLeft: `3px solid ${color}`, borderRadius: 14 }}>
      <div style={{ fontSize: 10, letterSpacing: 1, color: MUTED, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      {note && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function Field({ label, required, note, children }: { label: string; required?: boolean; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 12, color: DIM, fontWeight: 700 }}>
          {label} {required && <span style={{ color: "#F87171" }}>*</span>}
        </label>
        {note && <span style={{ fontSize: 11, color: MUTED }}>{note}</span>}
      </div>
      {children}
    </div>
  );
}

function HeadCell({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <div style={{ padding: "12px 18px", fontSize: 10, color: MUTED, fontWeight: 800, borderBottom: "1px solid rgba(255,255,255,0.07)", textTransform: "uppercase", letterSpacing: 1, textAlign: align || "left" }}>
      {children}
    </div>
  );
}

function Row({ last, product, amount, date }: { last: boolean; product: React.ReactNode; amount: string; date: string }) {
  const cell: React.CSSProperties = {
    padding: "13px 18px",
    fontSize: 13,
    borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };
  return (
    <>
      <div style={cell}>{product}</div>
      <div style={{ ...cell, color: "#34D399", fontWeight: 800, textAlign: "right" }}>{amount}</div>
      <div style={{ ...cell, color: DIM, textAlign: "right" }}>{date}</div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  background: "rgba(0,0,0,0.35)",
  color: INK,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
