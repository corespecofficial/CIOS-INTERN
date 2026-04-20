"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  TOOLS,
  CATEGORIES,
  STATUS_LABEL,
  STATUS_COLOR,
  type DocTool,
  type ToolCategory,
} from "@/lib/document-tools";

// Documents portal accent
const A1 = "#EC4899";
const A2 = "#8B5CF6";

export function HubClient({ firstName }: { firstName: string }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<"all" | ToolCategory>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (activeCat !== "all" && t.category !== activeCat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.blurb.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<ToolCategory, DocTool[]>();
    for (const t of filtered) {
      const list = map.get(t.category) || [];
      list.push(t);
      map.set(t.category, list);
    }
    return map;
  }, [filtered]);

  return (
    <div style={{ width: "100%", fontFamily: "'Nunito', sans-serif" }}>
      {/* HERO — Marketplace spec, pink accent */}
      <section
        style={{
          position: "relative",
          padding: "48px 20px 40px",
          background: `radial-gradient(1000px 400px at 20% 0%, ${A1}33, transparent 60%), radial-gradient(900px 400px at 90% 10%, ${A2}26, transparent 60%)`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div style={eyebrow(A1)}>Documents workspace</div>
          <h1 className="docs-hub-h1" style={heroH1}>
            Hi {firstName},{" "}
            <span style={{ background: `linear-gradient(135deg, ${A1}, ${A2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              what shall we build
            </span>
            ?
          </h1>
          <p style={heroSub}>
            Generate CVs and pitch decks with AI, or grab a PDF tool — merge, split, compress, convert, edit, secure,
            summarise, translate. Everything you need, one workspace.
          </p>

          {/* Search */}
          <div style={{ maxWidth: 640, margin: "22px auto 0", position: "relative" }}>
            <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools — e.g. merge, CV, translate, watermark…"
              style={{
                width: "100%",
                padding: "14px 16px 14px 44px",
                borderRadius: 12,
                border: `1px solid ${A1}55`,
                background: "var(--bg-secondary, rgba(17,24,39,0.7))",
                color: "var(--text-primary, #F8FAFC)",
                fontSize: 14,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                backdropFilter: "blur(8px)",
              }}
            />
          </div>

          {/* Quick nav + library */}
          <div style={{ marginTop: 18, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <CatPill active={activeCat === "all"} label="All tools"           onClick={() => setActiveCat("all")} />
            {CATEGORIES.map((c) => (
              <CatPill key={c.id} active={activeCat === c.id} label={c.label} onClick={() => setActiveCat(c.id)} />
            ))}
            <Link href="/documents/app/library" style={{ ...pillStyle(false), textDecoration: "none" }}>
              📁 My library
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 640px) {
          .docs-hub-h1 { font-size: 30px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>

      {/* SECTIONS */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 20px 80px" }}>
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--text-tertiary, #94A3B8)",
              fontSize: 14,
            }}
          >
            No tools match &ldquo;{query}&rdquo;. Try a different search.
          </div>
        )}

        {CATEGORIES.map((cat) => {
          const tools = grouped.get(cat.id);
          if (!tools || tools.length === 0) return null;
          return (
            <section key={cat.id} style={{ marginBottom: 34 }}>
              <div style={sectionHeaderRow}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: A1, letterSpacing: 2, textTransform: "uppercase" }}>
                    {cat.eyebrow}
                  </div>
                  <h2 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900, color: "var(--text-primary, #F8FAFC)", letterSpacing: -0.2 }}>
                    {cat.label}
                  </h2>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary, #94A3B8)", fontWeight: 700 }}>
                  {tools.length} {tools.length === 1 ? "tool" : "tools"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {tools.map((t) => <ToolCard key={t.id} tool={t} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: DocTool }) {
  const disabled = tool.status === "soon";
  const inner = (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: "var(--bg-secondary, #111827)",
        border: `1px solid ${disabled ? "var(--border-subtle, rgba(255,255,255,0.05))" : "var(--border-default, rgba(255,255,255,0.08))"}`,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        transition: "transform .12s, border-color .15s, background .15s",
        opacity: disabled ? 0.72 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = tool.accent + "66";
        e.currentTarget.style.background = "var(--bg-hover, #131C2E)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.08))";
        e.currentTarget.style.background = "var(--bg-secondary, #111827)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: tool.accent + "22",
            border: `1px solid ${tool.accent}33`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flex: "0 0 auto",
          }}
        >
          {tool.emoji}
        </div>
        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary, #F8FAFC)", lineHeight: 1.2 }}>
          {tool.name}
        </div>
      </div>
      <div style={{ color: "var(--text-tertiary, #94A3B8)", fontSize: 12, lineHeight: 1.5 }}>{tool.blurb}</div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: STATUS_COLOR[tool.status],
            background: STATUS_COLOR[tool.status] + "1A",
            border: `1px solid ${STATUS_COLOR[tool.status]}33`,
            padding: "2px 8px",
            borderRadius: 999,
            letterSpacing: 0.4,
            textTransform: "uppercase",
          }}
        >
          {STATUS_LABEL[tool.status]}
        </span>
        {!disabled && (
          <span style={{ fontSize: 12, color: tool.accent, fontWeight: 800 }}>Open →</span>
        )}
      </div>
    </div>
  );

  if (disabled) return inner;
  const href = tool.customHref || `/documents/app/t/${tool.id}`;
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  );
}

function CatPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={pillStyle(active)}>
      {label}
    </button>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: "7px 14px",
    borderRadius: 999,
    // Active uses the pink accent; inactive uses theme-aware neutral tokens.
    // Explicit vars keep pills from being caught by the generic "card" override
    // that adds a shadow — pills should read flat.
    border: `1px solid ${active ? A1 + "55" : "var(--border-default, rgba(255,255,255,0.1))"}`,
    background: active ? A1 + "22" : "var(--bg-secondary, rgba(255,255,255,0.04))",
    color: active ? A1 : "var(--text-primary, #F8FAFC)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

/* shared hero helpers (same spec as landings) */

const heroH1: React.CSSProperties = {
  margin: 0, fontSize: 40, lineHeight: 1.05, letterSpacing: -1.2, fontWeight: 900,
  color: "var(--text-primary, #F8FAFC)", fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
};
const heroSub: React.CSSProperties = {
  margin: "14px auto 0", maxWidth: 620, fontSize: 15, color: "var(--text-tertiary, #94A3B8)", lineHeight: 1.55,
};
const sectionHeaderRow: React.CSSProperties = {
  display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10,
  paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.06)",
};

function eyebrow(color: string): React.CSSProperties {
  return {
    display: "inline-block", padding: "5px 14px", borderRadius: 999,
    background: hexToRgba(color, 0.14), border: `1px solid ${hexToRgba(color, 0.34)}`,
    color, fontSize: 11, letterSpacing: 2, fontWeight: 800,
    textTransform: "uppercase", marginBottom: 14,
  };
}
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
