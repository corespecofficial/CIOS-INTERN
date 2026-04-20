/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Hackathon } from "@/app/actions/hackathon-types";

const ACCENT = "#F59E0B";
const ACCENT_2 = "#D97706";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  active: "Live now",
  judging: "Judging",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  upcoming: "#60A5FA",
  active: "#34D399",
  judging: "#FBBF24",
  completed: "#94A3B8",
  cancelled: "#F87171",
};

export function HackathonsBrowseClient({ hackathons }: { hackathons: Hackathon[] }) {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...hackathons];
    if (status !== "all") list = list.filter((h) => h.status === status);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((h) =>
        h.title.toLowerCase().includes(q) ||
        (h.theme || "").toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [hackathons, status, search]);

  return (
    <div style={{ width: "100%" }}>
      <div style={heroOuter}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(245,158,11,0.14)",
              border: "1px solid rgba(245,158,11,0.34)",
              color: ACCENT,
              fontSize: 11,
              letterSpacing: 2,
              fontWeight: 800,
              textTransform: "uppercase",
              marginBottom: 18,
            }}
          >
            Build · Compete · Win
          </div>
          <h1
            className="hk-hero-h1"
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
            Africa's hackathons,{" "}
            <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #EF4444)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              hosted on CIOS
            </span>
            .
          </h1>
          <p style={{ margin: "14px auto 0", maxWidth: 640, fontSize: 16, color: DIM, lineHeight: 1.55 }}>
            Form teams with vetted CIOS talent, ship in days, win cash prizes and intro
            calls with sponsors. Open to public users — sign up free to register.
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
                boxShadow: `0 12px 28px -10px rgba(245,158,11,0.7)`,
              }}
            >
              Browse {hackathons.length} event{hackathons.length === 1 ? "" : "s"}
            </a>
            <Link
              href="/sign-up"
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
              Join CIOS free →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hk-hero-h1 { font-size: 32px !important; letter-spacing: -0.8px !important; }
        }
      `}</style>

      <section id="browse" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 260px", minWidth: 200 }}>
            <span aria-hidden style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: MUTED, fontSize: 14 }}>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hackathons, themes, tags…"
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
          <span style={{ fontSize: 12, color: MUTED }}>{filtered.length} of {hackathons.length}</span>
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 22, scrollbarWidth: "none" }}>
          {[
            { k: "all", label: "All" },
            { k: "active", label: "🔴 Live now" },
            { k: "upcoming", label: "📅 Upcoming" },
            { k: "judging", label: "⚖ Judging" },
            { k: "completed", label: "✓ Completed" },
          ].map((t) => {
            const active = status === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setStatus(t.k)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  border: `1px solid ${active ? "rgba(245,158,11,0.55)" : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.02)",
                  color: active ? ACCENT : DIM,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasAny={hackathons.length > 0} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
            {filtered.map((h) => <HackathonCard key={h.id} h={h} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function HackathonCard({ h }: { h: Hackathon }) {
  const start = new Date(h.starts_at);
  const end = new Date(h.ends_at);
  const status = STATUS_LABEL[h.status] || h.status;
  const statusColor = STATUS_COLOR[h.status] || DIM;
  const cover = h.cover_image_url || h.banner_url;
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <Link
      href={`/hackathons/${h.id}`}
      className="hk-card"
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
          position: "relative",
          background: cover
            ? `url(${cover}) center/cover no-repeat, #0F172A`
            : `linear-gradient(135deg, rgba(245,158,11,0.32), rgba(239,68,68,0.22)), #0F172A`,
        }}
      >
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 6 }}>
          <span style={pillSolid(statusColor)}>{status}</span>
          {h.is_featured && <span style={pillGradient()}>★ Featured</span>}
        </div>
        {h.prize_pool && (
          <div style={{ position: "absolute", bottom: 10, right: 10 }}>
            <span style={{
              padding: "5px 12px",
              background: "rgba(10,14,26,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              color: ACCENT,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              🏆 {h.prize_pool}
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.2, margin: 0, lineHeight: 1.3 }}>{h.title}</h3>
        {h.theme && (
          <div style={{ fontSize: 11, color: ACCENT, fontWeight: 700 }}>{h.theme}</div>
        )}
        <p style={{ margin: 0, fontSize: 12, color: DIM, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {h.description}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, fontWeight: 700 }}>
          <span>📅 {start.toLocaleDateString("en-NG", { day: "numeric", month: "short" })} → {end.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
          <span>{days}d · {h.team_count ?? 0} team{h.team_count === 1 ? "" : "s"}</span>
        </div>
      </div>

      <style>{`
        .hk-card:hover { transform: translateY(-2px); border-color: rgba(245,158,11,0.35); background: rgba(255,255,255,0.04); }
      `}</style>
    </Link>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16 }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>🏆</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800, color: INK }}>
        {hasAny ? "No hackathons match." : "No active hackathons right now."}
      </h3>
      <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>
        {hasAny ? "Try a different status or clear search." : "Sponsors and admin run hackathons quarterly. Sign up to get notified."}
      </p>
    </div>
  );
}

function pillSolid(color: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: color,
    color: "#0A0E1A",
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

function pillGradient(): React.CSSProperties {
  return {
    padding: "4px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
    color: "#1A1205",
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

const heroOuter: React.CSSProperties = {
  position: "relative",
  padding: "56px 20px 48px",
  background: "radial-gradient(1000px 400px at 20% 0%, rgba(245,158,11,0.22), transparent 60%), radial-gradient(900px 400px at 90% 10%, rgba(239,68,68,0.14), transparent 60%)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
