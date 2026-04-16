"use client";

import { useState } from "react";
import Link from "next/link";
import type { Hackathon } from "@/app/actions/hackathon-types";

const ACCENT = "#FF7043";

const STATUS_FILTERS = ["All", "upcoming", "active", "judging", "completed"] as const;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    upcoming: { bg: "rgba(30,136,229,0.15)", color: "#1E88E5", label: "Upcoming" },
    active: { bg: "rgba(102,187,106,0.15)", color: "#66BB6A", label: "Active" },
    judging: { bg: "rgba(255,112,67,0.15)", color: "#FF7043", label: "Judging" },
    completed: { bg: "rgba(136,146,164,0.15)", color: "#8892A4", label: "Completed" },
    cancelled: { bg: "rgba(239,83,80,0.15)", color: "#EF5350", label: "Cancelled" },
  };
  const s = styles[status] || styles.upcoming;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      {status === "active" && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: "#66BB6A",
          boxShadow: "0 0 0 2px rgba(102,187,106,0.4)",
          animation: "pulse 1.5s infinite",
        }} />
      )}
      {s.label}
    </span>
  );
}

export function HackathonsClient({ hackathons }: { hackathons: Hackathon[] }) {
  const [filter, setFilter] = useState<string>("All");

  const filtered = filter === "All" ? hackathons : hackathons.filter((h) => h.status === filter);

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        .hack-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(255,112,67,0.12) !important; }
        .hack-card { transition: transform 0.2s, box-shadow 0.2s; }
        .filter-tab:hover { background: rgba(255,112,67,0.1) !important; color: #FF7043 !important; }
        @media (max-width: 600px) {
          .hack-hero-title { font-size: 26px !important; }
          .hack-cards-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,112,67,0.1) 0%, rgba(10,14,26,0) 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "48px 32px 40px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div className="hack-hero-title" style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
            🏆 Hackathons &amp; Competitions
          </div>
          <div style={{ fontSize: 16, color: "#8892A4", maxWidth: 560 }}>
            Build, compete, and win. Join CIOS hackathons, form teams, and submit your projects to earn recognition and prizes.
          </div>
          <div style={{ marginTop: 16, width: 48, height: 3, background: ACCENT, borderRadius: 2 }} />
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className="filter-tab"
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 18px", borderRadius: 99,
                border: `1px solid ${filter === f ? ACCENT : "rgba(255,255,255,0.1)"}`,
                background: filter === f ? `rgba(255,112,67,0.15)` : "transparent",
                color: filter === f ? ACCENT : "#8892A4",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
                textTransform: "capitalize",
              }}
            >
              {f === "All" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "80px 20px",
            border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#E8EDF5", marginBottom: 8 }}>No hackathons found</div>
            <div style={{ color: "#8892A4" }}>Check back soon for upcoming competitions.</div>
          </div>
        ) : (
          <div className="hack-cards-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}>
            {filtered.map((h) => (
              <div
                key={h.id}
                className="hack-card"
                style={{
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <StatusBadge status={h.status} />
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>{h.title}</div>
                  {h.theme && (
                    <div style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>Theme: {h.theme}</div>
                  )}
                </div>

                {/* Dates */}
                <div style={{ fontSize: 12, color: "#8892A4", display: "flex", flexDirection: "column", gap: 3 }}>
                  <div>📅 {formatDate(h.starts_at)} → {formatDate(h.ends_at)}</div>
                  {h.registration_deadline && (
                    <div>⏰ Registration deadline: {formatDate(h.registration_deadline)}</div>
                  )}
                </div>

                {/* Meta */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {h.prize_pool && (
                    <div style={{
                      padding: "4px 10px", borderRadius: 8,
                      background: "rgba(255,193,7,0.1)", color: "#FFC107",
                      fontSize: 12, fontWeight: 600,
                    }}>
                      🏅 {h.prize_pool}
                    </div>
                  )}
                  <div style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.05)", color: "#8892A4",
                    fontSize: 12,
                  }}>
                    👥 {h.min_team_size}–{h.max_team_size} members
                  </div>
                  <div style={{
                    padding: "4px 10px", borderRadius: 8,
                    background: "rgba(255,255,255,0.05)", color: "#8892A4",
                    fontSize: 12,
                  }}>
                    🏆 {h.team_count || 0} teams
                  </div>
                </div>

                {/* Tags */}
                {h.tags && h.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {h.tags.map((tag) => (
                      <span key={tag} style={{
                        padding: "2px 8px", borderRadius: 6,
                        background: "rgba(255,112,67,0.1)", color: ACCENT,
                        fontSize: 11, fontWeight: 600,
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <Link
                  href={`/hackathons/${h.id}`}
                  style={{
                    display: "block", textAlign: "center",
                    padding: "10px 0", borderRadius: 10,
                    background: `rgba(255,112,67,0.15)`,
                    border: `1px solid rgba(255,112,67,0.3)`,
                    color: ACCENT, fontSize: 13, fontWeight: 700,
                    textDecoration: "none", marginTop: "auto",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,67,0.25)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,112,67,0.15)"; }}
                >
                  View &amp; Register →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
