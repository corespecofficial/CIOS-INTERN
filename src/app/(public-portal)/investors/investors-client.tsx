/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StartupPitch } from "@/app/actions/startup-types";
import { STARTUP_CATEGORIES, STARTUP_STAGES } from "@/app/actions/startup-types";
import { creatorCredibility, TIER_STYLES } from "@/lib/creator-credibility";

const ACCENT = "#10B981";   // emerald — investors
const ACCENT_2 = "#059669";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

interface Stats { interns: number; alumni: number; placements: number; countries: number; hackathons: number }

export function InvestorsLandingClient({ pitches, stats }: { pitches: StartupPitch[]; stats: Stats }) {
  const [category, setCategory] = useState<string>("All");
  const [stage, setStage] = useState<string>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...pitches];
    if (category !== "All") list = list.filter((p) => p.category === category);
    if (stage !== "All") list = list.filter((p) => p.stage === stage);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.startup_name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.country ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [pitches, category, stage, search]);

  return (
    <div style={{ width: "100%" }}>
      <div style={heroOuter}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(16,185,129,0.14)",
              border: "1px solid rgba(16,185,129,0.34)",
              color: ACCENT,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            CIOS · Africa-first capital
          </div>
          <h1
            className="inv-hero-h1"
            style={{
              margin: 0,
              fontSize: 46,
              lineHeight: 1.05,
              letterSpacing: -1.4,
              fontWeight: 900,
              color: INK,
              fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
            }}
          >
            Back Africa's{" "}
            <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #60A5FA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              vetted founders
            </span>
            .
          </h1>
          <p style={{ margin: "14px auto 0", maxWidth: 660, fontSize: 16, color: DIM, lineHeight: 1.55 }}>
            Every pitch here is from a CIOS-tracked builder — interns, alumni, mentors with verified
            performance data. Filter by your thesis, watchlist what catches your eye, message founders direct.
          </p>
          <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/investor/onboarding"
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: `0 12px 28px -10px rgba(16,185,129,0.7)`,
              }}
            >
              Become an investor →
            </Link>
            <a
              href="#deals"
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
              Browse {pitches.length} pitch{pitches.length === 1 ? "" : "es"}
            </a>
          </div>

          <div className="inv-stats" style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, maxWidth: 720, marginLeft: "auto", marginRight: "auto" }}>
            <Stat label="Active interns" value={stats.interns.toLocaleString()} />
            <Stat label="Alumni" value={stats.alumni.toLocaleString()} />
            <Stat label="Placements" value={stats.placements.toLocaleString()} />
            <Stat label="Countries" value={stats.countries.toString()} />
            <Stat label="Hackathons" value={stats.hackathons.toString()} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .inv-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>

      <section id="deals" style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 60px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <span aria-hidden style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: MUTED, fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search startups, taglines, country…"
              style={inputStyle}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
            <option value="All">All categories</option>
            {STARTUP_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} style={selectStyle}>
            <option value="All">All stages</option>
            {STARTUP_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span style={{ fontSize: 12, color: MUTED }}>{filtered.length} of {pitches.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🚀</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>
              {pitches.length === 0 ? "No public pitches yet" : "No pitches match your filters"}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
              {pitches.length === 0 ? "Founders are getting ready. Check back soon — or sign up to get notified." : "Clear filters or try a different stage."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {filtered.map((p) => <PitchCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function PitchCard({ p }: { p: StartupPitch }) {
  const cred = creatorCredibility({
    xp: p.founder_xp ?? 0,
    level: p.founder_level ?? 1,
    role: p.founder_role ?? "intern",
    percentile: null,
  });
  const tier = TIER_STYLES[cred.tier];
  const stageLabel = STARTUP_STAGES.find((s) => s.value === p.stage)?.label ?? p.stage;
  const cover = p.cover_image_url;

  return (
    <Link
      href={`/startups/${p.id}`}
      className="inv-card"
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
          aspectRatio: "16 / 9",
          background: cover
            ? `url(${cover}) center/cover no-repeat, #0F172A`
            : `linear-gradient(135deg, rgba(16,185,129,0.32), rgba(96,165,250,0.22)), #0F172A`,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          <span style={pillSolid("#0F172A", INK)}>{p.category}</span>
          {p.is_featured && <span style={pillSolid("linear-gradient(135deg, #FBBF24, #F59E0B)", "#1A1205")}>★ Featured</span>}
        </div>
        {p.raising_amount_usd && (
          <div style={{ position: "absolute", bottom: 10, right: 10 }}>
            <span style={{ padding: "5px 12px", background: "rgba(10,14,26,0.85)", border: `1px solid rgba(16,185,129,0.4)`, borderRadius: 10, fontSize: 12, fontWeight: 800, color: ACCENT, fontFamily: "'Space Grotesk', sans-serif" }}>
              💰 Raising ${(Number(p.raising_amount_usd) / 1000).toFixed(0)}K
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: INK, letterSpacing: -0.3, margin: 0, lineHeight: 1.25 }}>{p.startup_name}</h3>
          <span style={{ fontSize: 10, color: MUTED, fontWeight: 700, whiteSpace: "nowrap", marginTop: 4 }}>{stageLabel}</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.tagline}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
          {p.founder_avatar ? (
            <img src={p.founder_avatar} alt="" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", border: `1.5px solid ${tier.border}` }} />
          ) : (
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>
              {(p.founder_name || "?").charAt(0)}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.founder_name || "Founder"}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: tier.fg, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cred.badge}</div>
          </div>
          {p.country && <span style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>📍 {p.country}</span>}
        </div>
      </div>

      <style>{`
        .inv-card:hover { transform: translateY(-2px); border-color: rgba(16,185,129,0.35); background: rgba(255,255,255,0.04); }
      `}</style>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 1.2, color: MUTED, fontWeight: 800, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: ACCENT, marginTop: 2, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
    </div>
  );
}

function pillSolid(bg: string, color: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: bg,
    color,
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

const heroOuter: React.CSSProperties = {
  position: "relative",
  padding: "60px 20px 50px",
  background: "radial-gradient(1000px 400px at 20% 0%, rgba(16,185,129,0.22), transparent 60%), radial-gradient(900px 400px at 90% 10%, rgba(96,165,250,0.16), transparent 60%)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px 12px 40px",
  background: "rgba(255,255,255,0.03)",
  color: INK,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
};
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
