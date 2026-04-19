"use client";

import { useMemo, useState } from "react";
import type { CompanyDoc, CompanyDocCategory } from "@/app/actions/company-library";
import { logCompanyDocView } from "@/app/actions/company-library";

const CATEGORIES: { key: CompanyDocCategory | "all"; label: string; emoji: string }[] = [
  { key: "all", label: "All", emoji: "📚" },
  { key: "investor", label: "Investor", emoji: "💰" },
  { key: "product", label: "Product", emoji: "🛠" },
  { key: "market", label: "Market", emoji: "🌍" },
  { key: "press", label: "Press", emoji: "📰" },
  { key: "technical", label: "Technical", emoji: "⚙️" },
  { key: "growth", label: "Growth", emoji: "📈" },
];

const CAT_COLORS: Record<CompanyDocCategory, string> = {
  investor: "#FFC107",
  product: "#1E88E5",
  market: "#66BB6A",
  press: "#AB47BC",
  technical: "#FF7043",
  growth: "#EC4899",
};

function fmtBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  docs: CompanyDoc[];
}

export default function ResourcesClient({ docs }: Props) {
  const [activeCat, setActiveCat] = useState<CompanyDocCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (activeCat !== "all" && d.category !== activeCat) return false;
      if (query && !d.title.toLowerCase().includes(query.toLowerCase()) && !(d.description ?? "").toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [docs, activeCat, query]);

  const featured = filtered.filter((d) => d.featured);
  const rest = filtered.filter((d) => !d.featured);

  function openDoc(doc: CompanyDoc) {
    logCompanyDocView(doc.id, typeof document !== "undefined" ? document.referrer : undefined).catch(() => {});
    if (typeof window !== "undefined") window.open(doc.file_url, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px 120px", position: "relative" }}>
      <style>{`
        .lib-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .lib-hero-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 40px; }
        .lib-card { background: linear-gradient(160deg, #111827 0%, #0e1422 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 28px; cursor: pointer; transition: all 0.25s; display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden; }
        .lib-card:hover { border-color: rgba(30,136,229,0.45); transform: translateY(-3px); box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .lib-card-featured { padding: 36px; min-height: 280px; }
        .lib-cover { width: 64px; height: 64px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 30px; flex-shrink: 0; }
        .lib-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
        .lib-tab { padding: 9px 18px; border-radius: 100px; font-size: 13px; font-weight: 600; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: #8892A4; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
        .lib-tab.active { background: #1E88E5; border-color: #1E88E5; color: #fff; }
        .lib-search { flex: 1; background: #111827; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: #E8EDF5; font-size: 14px; min-width: 200px; }
        .lib-empty { grid-column: 1 / -1; padding: 60px 20px; text-align: center; color: #8892A4; background: #111827; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; }
        @media (max-width: 900px) { .lib-grid { grid-template-columns: repeat(2, 1fr); } .lib-hero-grid { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .lib-grid { grid-template-columns: 1fr; } .lib-card-featured { padding: 24px; min-height: auto; } }
      `}</style>

      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "inline-block", background: "rgba(30,136,229,0.12)", border: "1px solid rgba(30,136,229,0.3)", padding: "5px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#4DA8FF", marginBottom: 20, textTransform: "uppercase" }}>
          📚 Company Library
        </div>
        <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, letterSpacing: -1.5, margin: 0, lineHeight: 1.05 }}>
          The <span style={{ color: "#4DA8FF" }}>strategic documents</span> behind CPS Intern
        </h1>
        <p style={{ fontSize: 17, color: "#8892A4", marginTop: 18, maxWidth: 640, lineHeight: 1.6 }}>
          Pitch decks, platform blueprints, competitive analysis, product specs, and growth playbooks. Everything an investor, partner, or enterprise buyer needs to understand where we&apos;re going.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 32, flexWrap: "wrap" }}>
        <input
          className="lib-search"
          placeholder="Search documents…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={`lib-tab${activeCat === c.key ? " active" : ""}`}
            onClick={() => setActiveCat(c.key)}
          >
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div className="lib-hero-grid">
          {featured.map((doc) => (
            <div
              key={doc.id}
              className="lib-card lib-card-featured"
              onClick={() => openDoc(doc)}
              style={{
                background: `linear-gradient(160deg, ${doc.cover_color}22 0%, #0e1422 70%)`,
                borderColor: `${doc.cover_color}44`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="lib-cover" style={{ background: `${doc.cover_color}33`, color: doc.cover_color }}>
                  {doc.cover_emoji}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span
                    className="lib-pill"
                    style={{ background: `${CAT_COLORS[doc.category]}22`, color: CAT_COLORS[doc.category], alignSelf: "flex-start" }}
                  >
                    ⭐ Featured · {doc.category}
                  </span>
                </div>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{doc.title}</h2>
              {doc.description && (
                <p style={{ fontSize: 14, color: "#8892A4", margin: 0, lineHeight: 1.6 }}>{doc.description}</p>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: "auto", alignItems: "center", fontSize: 12, color: "#6B7280" }}>
                <span style={{ textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{doc.doc_type}</span>
                {doc.page_count && <span>· {doc.page_count} pages</span>}
                {doc.file_size_bytes && <span>· {fmtBytes(doc.file_size_bytes)}</span>}
                <span style={{ marginLeft: "auto", color: "#4DA8FF", fontWeight: 700 }}>View →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="lib-grid">
        {rest.length === 0 && featured.length === 0 ? (
          <div className="lib-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>No documents yet</div>
            <div>Check back soon — new strategic documents will appear here.</div>
          </div>
        ) : (
          rest.map((doc) => (
            <div
              key={doc.id}
              className="lib-card"
              onClick={() => openDoc(doc)}
            >
              <div className="lib-cover" style={{ background: `${doc.cover_color}22`, color: doc.cover_color }}>
                {doc.cover_emoji}
              </div>
              <div>
                <span className="lib-pill" style={{ background: `${CAT_COLORS[doc.category]}22`, color: CAT_COLORS[doc.category] }}>
                  {doc.category}
                </span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>{doc.title}</h3>
              {doc.description && (
                <p style={{ fontSize: 13, color: "#8892A4", margin: 0, lineHeight: 1.55, flex: 1 }}>
                  {doc.description.length > 120 ? `${doc.description.slice(0, 120)}…` : doc.description}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginTop: "auto" }}>
                <span>{doc.doc_type}</span>
                {doc.page_count && <span>· {doc.page_count}p</span>}
                <span style={{ marginLeft: "auto", color: "#4DA8FF" }}>View →</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 80, padding: "40px 28px", textAlign: "center", background: "linear-gradient(135deg, rgba(30,136,229,0.1), rgba(102,187,106,0.06))", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 20 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
          Want to partner, invest, or pilot CPS Intern?
        </h2>
        <p style={{ color: "#8892A4", margin: "10px 0 20px", fontSize: 15 }}>
          Request investor-only documents (pricing model, growth playbook, financial projections).
        </p>
        <a
          href="/contact"
          style={{ display: "inline-block", padding: "12px 28px", background: "#1E88E5", color: "#fff", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: 14 }}
        >
          Contact the team →
        </a>
      </div>
    </div>
  );
}
