/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CreativeSpace } from "@/app/actions/creative-spaces-types";
import { SPACE_CATEGORIES } from "@/app/actions/creative-spaces-types";
import { creatorCredibility, TIER_STYLES } from "@/lib/creator-credibility";

const ACCENT = "#26C6DA";       // Creative Spaces teal
const ACCENT_2 = "#0EA5E9";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

export function CreativeSpaceBrowseClient({ spaces }: { spaces: CreativeSpace[] }) {
  const [category, setCategory] = useState<string>("All");
  const [format, setFormat] = useState<"all" | "live" | "recorded" | "hybrid">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"featured" | "rating" | "new" | "popular">("featured");

  const filtered = useMemo(() => {
    let list = [...spaces];
    if (category !== "All") list = list.filter((s) => s.category === category);
    if (format !== "all") list = list.filter((s) => s.format === format);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "new") list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sort === "popular") list.sort((a, b) => b.enrollment_count - a.enrollment_count);
    return list;
  }, [spaces, category, format, search, sort]);

  return (
    <div style={{ width: "100%" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          padding: "56px 20px 48px",
          background:
            "radial-gradient(1000px 400px at 20% 0%, rgba(38,198,218,0.22), transparent 60%), radial-gradient(900px 400px at 90% 10%, rgba(124,58,237,0.14), transparent 60%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(38,198,218,0.14)",
              border: "1px solid rgba(38,198,218,0.34)",
              color: ACCENT,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Cohort-based learning
          </div>
          <h1
            className="cs-hero-h1"
            style={{
              margin: 0,
              fontSize: 44,
              lineHeight: 1.05,
              letterSpacing: -1.4,
              fontWeight: 900,
              color: INK,
              fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
            }}
          >
            Learn from <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #A855F7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>vetted CIOS instructors</span>.
          </h1>
          <p style={{ margin: "14px auto 0", maxWidth: 660, fontSize: 16, color: DIM, lineHeight: 1.55 }}>
            Live and recorded cohorts across web dev, design, marketing, AI and more —
            taught by ranked CIOS instructors, alumni and mentors. No filler courses. Every host is vetted.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#browse"
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: `0 12px 28px -10px rgba(38,198,218,0.7)`,
              }}
            >
              Browse {spaces.length} course{spaces.length === 1 ? "" : "s"}
            </a>
            <Link
              href="/creative-space/apply"
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
              Teach on CIOS →
            </Link>
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
              placeholder="Search topics, instructors, tags…"
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
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} style={selectStyle}>
            <option value="all">All formats</option>
            <option value="live">🔴 Live</option>
            <option value="recorded">▶️ Recorded</option>
            <option value="hybrid">⚡ Hybrid</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={selectStyle}>
            <option value="featured">Featured</option>
            <option value="rating">Top rated</option>
            <option value="new">Newest</option>
            <option value="popular">Most enrolled</option>
          </select>
          <span style={{ fontSize: 12, color: MUTED }}>
            {filtered.length} of {spaces.length}
          </span>
        </div>

        <div className="cs-cat-row" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 22, scrollbarWidth: "none" }}>
          {["All", ...SPACE_CATEGORIES].map((t) => {
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
                  border: `1px solid ${active ? "rgba(38,198,218,0.55)" : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(38,198,218,0.18)" : "rgba(255,255,255,0.02)",
                  color: active ? ACCENT : DIM,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasAny={spaces.length > 0} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, paddingBottom: 60 }}>
            {filtered.map((s) => <SpaceCard key={s.id} space={s} />)}
          </div>
        )}
      </section>

      <style>{`
        .cs-cat-row::-webkit-scrollbar { display: none; }
        @media (max-width: 640px) {
          .cs-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>
    </div>
  );
}

function SpaceCard({ space: s }: { space: CreativeSpace }) {
  const cred = creatorCredibility({
    xp: s.owner_xp,
    level: s.owner_level,
    role: s.owner_role,
    percentile: s.owner_percentile,
  });
  const tierStyle = TIER_STYLES[cred.tier];
  const capacity = s.capacity || 1;
  const pct = Math.min(100, Math.round((s.enrollment_count / capacity) * 100));
  const spotsLeft = Math.max(0, capacity - s.enrollment_count);
  const isFree = s.price_per_student === 0;

  return (
    <Link
      href={`/creative-space/${s.id}`}
      className="cs-card"
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
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "16 / 9",
          background: s.cover_image_url
            ? `url(${s.cover_image_url}) center/cover no-repeat, #0F172A`
            : `linear-gradient(135deg, rgba(38,198,218,0.32), rgba(124,58,237,0.24)), #0F172A`,
        }}
      >
        <div style={{ position: "absolute", top: 10, left: 10, right: 10, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span style={pillStyle("rgba(10,14,26,0.78)", "#E2E8F0", true)}>{s.category}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {s.is_featured && <span style={pillStyle("linear-gradient(135deg,#FBBF24,#F59E0B)", "#1A1205", false, true)}>★ Featured</span>}
            {s.is_live && <span style={pillStyle("#DC2626", "#fff")}>● LIVE</span>}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 10, left: 10, display: "flex", gap: 6 }}>
          <span style={pillStyle("rgba(10,14,26,0.85)", formatColor(s.format), true)}>
            {formatIcon(s.format)} {s.format}
          </span>
          <span style={pillStyle("rgba(10,14,26,0.85)", INK, true)}>
            {s.duration_weeks || 4}w · {s.capacity - s.enrollment_count > 0 ? `${spotsLeft} left` : "Full"}
          </span>
        </div>

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
            }}
          >
            {isFree ? "FREE" : `₦${Number(s.price_per_student).toLocaleString()}`}
          </span>
        </div>
      </div>

      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.2, margin: 0, lineHeight: 1.3 }}>{s.title}</h3>
        <p style={{
          margin: 0, fontSize: 12, color: DIM, lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {s.description}
        </p>

        {/* Instructor row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          {s.owner_avatar ? (
            <img src={s.owner_avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${tierStyle.border}` }} />
          ) : (
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
              {(s.owner_name || "?").charAt(0)}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.owner_name || "Instructor"}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: tierStyle.fg, letterSpacing: 0.3, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cred.badge}
            </div>
          </div>
          {s.rating > 0 && (
            <span style={{ fontSize: 11, color: "#FBBF24", fontWeight: 800, whiteSpace: "nowrap" }}>
              ★ {s.rating.toFixed(1)}{" "}
              <span style={{ color: MUTED, fontWeight: 600 }}>({s.review_count})</span>
            </span>
          )}
        </div>

        {/* Capacity bar */}
        <div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#DC2626" : `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`, transition: "width 160ms ease" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED, marginTop: 4, fontWeight: 700 }}>
            <span>{s.enrollment_count} / {s.capacity} enrolled</span>
            <span>{pct}% full</span>
          </div>
        </div>
      </div>

      <style>{`
        .cs-card:hover { transform: translateY(-2px); border-color: rgba(38,198,218,0.35); background: rgba(255,255,255,0.04); }
      `}</style>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, marginBottom: 60 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🎓</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>
        {hasAny ? "No spaces match your filters." : "The classroom is warming up."}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
        {hasAny ? "Clear search or switch category." : (
          <>
            Be the first instructor —{" "}
            <Link href="/creative-space/apply" style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
              teach on CIOS →
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function pillStyle(bg: string, color: string, withBorder = false, dark = false): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: bg,
    color,
    border: withBorder ? "1px solid rgba(255,255,255,0.08)" : "none",
    borderRadius: 999,
    backdropFilter: dark ? undefined : "blur(6px)",
    whiteSpace: "nowrap",
  };
}

function formatColor(f: string): string {
  return f === "live" ? "#F87171" : f === "recorded" ? "#60A5FA" : "#A855F7";
}

function formatIcon(f: string): string {
  return f === "live" ? "🔴" : f === "recorded" ? "▶" : "⚡";
}

const selectStyle: React.CSSProperties = {
  padding: "11px 14px",
  background: "rgba(255,255,255,0.03)",
  color: INK,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  fontSize: 13,
  outline: "none",
  cursor: "pointer",
};
