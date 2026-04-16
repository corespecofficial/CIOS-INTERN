/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import type { StartupPitch } from "@/app/actions/startup-types";
import { STARTUP_CATEGORIES, STARTUP_STAGES } from "@/app/actions/startup-types";
import { expressInterest } from "@/app/actions/startup";

const ACCENT = "#7C4DFF";

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      padding: "12px 20px", borderRadius: 10,
      background: ok ? "rgba(102,187,106,0.15)" : "rgba(239,83,80,0.15)",
      border: `1px solid ${ok ? "#66BB6A" : "#EF5350"}`,
      color: ok ? "#66BB6A" : "#EF5350",
      fontSize: 14, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      maxWidth: 360,
    }}>
      {msg}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    idea: { bg: "rgba(255,193,7,0.12)", color: "#FFC107" },
    prototype: { bg: "rgba(30,136,229,0.12)", color: "#1E88E5" },
    mvp: { bg: "rgba(102,187,106,0.12)", color: "#66BB6A" },
    revenue: { bg: "rgba(124,77,255,0.12)", color: "#7C4DFF" },
    scaling: { bg: "rgba(255,112,67,0.12)", color: "#FF7043" },
  };
  const c = colors[stage] || colors.idea;
  const found = STARTUP_STAGES.find((s) => s.value === stage);
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99,
      background: c.bg, color: c.color,
      fontSize: 11, fontWeight: 700,
    }}>
      {found?.label || stage}
    </span>
  );
}

function AnimatedCount({ target }: { target: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count.toLocaleString()}</>;
}

export function InvestorsClient({
  pitches,
  stats,
  isLoggedIn = false,
}: {
  pitches: StartupPitch[];
  stats: { interns: number; alumni: number; placements: number; countries: number; hackathons: number };
  isLoggedIn?: boolean;
}) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleInterest(pitchId: string) {
    startTransition(async () => {
      const res = await expressInterest(pitchId);
      if (res.ok) {
        showToast("Interest expressed! The founder will be notified.", true);
        setInterestedIds((prev) => new Set([...prev, pitchId]));
      } else {
        showToast(res.error, false);
      }
    });
  }

  const filtered = pitches.filter((p) => {
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (stageFilter !== "All" && p.stage !== stageFilter) return false;
    return true;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        .pitch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(124,77,255,0.12) !important; }
        .pitch-card { transition: transform 0.2s, box-shadow 0.2s; }
        .interest-btn:hover:not(:disabled) { background: rgba(124,77,255,0.3) !important; }
        @media (max-width: 600px) {
          .inv-nav { padding: 0 16px !important; }
          .inv-nav-logo span { display: none; }
          .inv-hero-title { font-size: 28px !important; line-height: 1.2 !important; }
          .inv-hero-sub { font-size: 14px !important; }
          .inv-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .inv-why-grid { grid-template-columns: 1fr !important; }
          .inv-pitches-grid { grid-template-columns: 1fr !important; }
          .inv-hero-pad { padding: 40px 16px 32px !important; }
          .inv-section-pad { padding: 32px 16px !important; }
        }
      `}</style>

      {/* PUBLIC NAV */}
      <nav className="inv-nav" style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,14,26,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 32px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: "#fff",
          }}>C</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>CIOS</span>
        </a>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isLoggedIn ? (
            <a href="/dashboard" style={{
              padding: "8px 18px", borderRadius: 8,
              background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`,
              color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
            }}>
              Go to Dashboard →
            </a>
          ) : (
            <>
              <a href="/sign-in" style={{
                padding: "8px 16px", borderRadius: 8,
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "#E8EDF5", fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}>
                Login
              </a>
              <a href="/sign-up" style={{
                padding: "8px 18px", borderRadius: 8,
                background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`,
                color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Register Free
              </a>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div className="inv-hero-pad" style={{
        background: "linear-gradient(135deg, rgba(124,77,255,0.15) 0%, rgba(30,136,229,0.08) 50%, rgba(10,14,26,0) 80%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "64px 32px 56px", textAlign: "center",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>
            CIOS ECOSYSTEM
          </div>
          <h1 className="inv-hero-title" style={{ fontSize: 42, fontWeight: 900, margin: "0 0 16px", lineHeight: 1.1 }}>
            🚀 Invest in Africa&apos;s<br />
            <span style={{ background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Digital Future
            </span>
          </h1>
          <p className="inv-hero-sub" style={{ fontSize: 17, color: "#8892A4", margin: "0 0 28px", lineHeight: 1.6 }}>
            Discover vetted talent, invest in intern-led startups, and access Africa&apos;s fastest-growing tech pipeline.
          </p>
          <div style={{ width: 60, height: 3, background: `linear-gradient(90deg, ${ACCENT}, #1E88E5)`, borderRadius: 2, margin: "0 auto" }} />
        </div>
      </div>

      {/* LIVE STATS */}
      <div style={{
        background: "#111827",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "32px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>
            Live Platform Stats
          </div>
          <div className="inv-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            {[
              { label: "Active Interns", value: stats.interns, color: "#1E88E5", icon: "👩‍💻" },
              { label: "Graduates", value: stats.alumni, color: "#66BB6A", icon: "🎓" },
              { label: "Confirmed Placements", value: stats.placements, color: ACCENT, icon: "💼" },
              { label: "Countries Reached", value: stats.countries, color: "#FF7043", icon: "🌍" },
              { label: "Hackathons Hosted", value: stats.hackathons, color: "#FFC107", icon: "🏆" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  textAlign: "center", padding: "20px 16px",
                  background: "rgba(255,255,255,0.03)", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>
                  <AnimatedCount target={s.value} />
                </div>
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WHY CIOS */}
      <div style={{ padding: "48px 32px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, textAlign: "center", marginBottom: 32 }}>
            Why Partner with CIOS?
          </h2>
          <div className="inv-why-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              {
                icon: "🔍",
                title: "Vetted Talent",
                desc: "Every intern goes through a structured 6-month program with performance tracking, peer reviews, and skill assessments — so you get the best.",
                color: ACCENT,
              },
              {
                icon: "📈",
                title: "Track Record",
                desc: "Consistent placements across top companies in Nigeria, Ghana, Kenya and beyond. Our graduates are battle-tested and employer-ready.",
                color: "#66BB6A",
              },
              {
                icon: "🔗",
                title: "Direct Pipeline",
                desc: "Skip the noise. Get direct access to intern-led startups, early-stage projects, and Africa's next generation of founders.",
                color: "#1E88E5",
              },
            ].map((c) => (
              <div
                key={c.title}
                style={{
                  background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "28px 24px",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>{c.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: c.color, marginBottom: 8 }}>{c.title}</h3>
                <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STARTUP PITCHES */}
      <div style={{ padding: "48px 32px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Browse Intern Startups</h2>
          <p style={{ fontSize: 14, color: "#8892A4", marginBottom: 28 }}>
            Discover innovative projects from our intern community. Express interest to connect with founders.
          </p>

          {/* Filters */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Category</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["All", ...STARTUP_CATEGORIES].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    style={{
                      padding: "5px 12px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      border: `1px solid ${categoryFilter === c ? ACCENT : "rgba(255,255,255,0.1)"}`,
                      background: categoryFilter === c ? "rgba(124,77,255,0.15)" : "transparent",
                      color: categoryFilter === c ? ACCENT : "#8892A4",
                      transition: "all 0.15s",
                    }}
                  >{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Stage</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[{ value: "All", label: "All" }, ...STARTUP_STAGES].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStageFilter(s.value)}
                    style={{
                      padding: "5px 12px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontWeight: 600,
                      border: `1px solid ${stageFilter === s.value ? ACCENT : "rgba(255,255,255,0.1)"}`,
                      background: stageFilter === s.value ? "rgba(124,77,255,0.15)" : "transparent",
                      color: stageFilter === s.value ? ACCENT : "#8892A4",
                      transition: "all 0.15s",
                    }}
                  >{s.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards grid */}
          {filtered.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚀</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No startups found</div>
              <div style={{ color: "#8892A4" }}>Try adjusting your filters.</div>
            </div>
          ) : (
            <div className="inv-pitches-grid" style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20,
            }}>
              {filtered.map((pitch) => (
                <div
                  key={pitch.id}
                  className="pitch-card"
                  style={{
                    background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16, padding: 24,
                    display: "flex", flexDirection: "column", gap: 14,
                  }}
                >
                  {/* Founder */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {pitch.founder_avatar ? (
                      <img
                        src={pitch.founder_avatar}
                        alt={pitch.founder_name || "Founder"}
                        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid rgba(124,77,255,0.3)` }}
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700, color: "#fff",
                        flexShrink: 0,
                      }}>
                        {(pitch.founder_name || "F")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 12, color: "#8892A4" }}>Founder</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#E8EDF5" }}>{pitch.founder_name || "Anonymous"}</div>
                    </div>
                  </div>

                  {/* Startup info */}
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>{pitch.startup_name}</div>
                    <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.5 }}>{pitch.tagline}</div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <StageBadge stage={pitch.stage} />
                    <span style={{
                      padding: "3px 10px", borderRadius: 99,
                      background: "rgba(255,255,255,0.06)", color: "#8892A4",
                      fontSize: 11, fontWeight: 600,
                    }}>
                      {pitch.category}
                    </span>
                  </div>

                  {/* Looking for */}
                  {pitch.looking_for && pitch.looking_for.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {pitch.looking_for.map((item) => (
                        <span key={item} style={{
                          padding: "2px 8px", borderRadius: 6,
                          background: "rgba(124,77,255,0.1)", color: ACCENT,
                          fontSize: 11, fontWeight: 600,
                        }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#8892A4" }}>
                    <span>👁 {pitch.views} views</span>
                    {pitch.interest_count !== undefined && (
                      <span>💜 {pitch.interest_count} interested</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
                    {pitch.website_url && (
                      <a
                        href={pitch.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 9,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                          color: "#8892A4", fontSize: 12, fontWeight: 600, textDecoration: "none",
                        }}
                      >
                        🌐 Website
                      </a>
                    )}
                    {isLoggedIn ? (
                      <button
                        className="interest-btn"
                        onClick={() => handleInterest(pitch.id)}
                        disabled={isPending || interestedIds.has(pitch.id)}
                        style={{
                          flex: 1, padding: "9px 0", borderRadius: 9,
                          background: interestedIds.has(pitch.id) ? "rgba(102,187,106,0.15)" : "rgba(124,77,255,0.15)",
                          border: `1px solid ${interestedIds.has(pitch.id) ? "rgba(102,187,106,0.3)" : "rgba(124,77,255,0.3)"}`,
                          color: interestedIds.has(pitch.id) ? "#66BB6A" : ACCENT,
                          fontSize: 12, fontWeight: 700, cursor: isPending || interestedIds.has(pitch.id) ? "not-allowed" : "pointer",
                          opacity: isPending ? 0.6 : 1,
                          transition: "background 0.15s",
                        }}
                      >
                        {interestedIds.has(pitch.id) ? "✓ Interested" : "Express Interest"}
                      </button>
                    ) : (
                      <a
                        href="/sign-up"
                        style={{
                          flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 9,
                          background: "rgba(124,77,255,0.10)", border: "1px solid rgba(124,77,255,0.25)",
                          color: ACCENT, fontSize: 12, fontWeight: 700, textDecoration: "none",
                        }}
                      >
                        Login to Connect
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CTA FOOTER */}
      <div style={{
        background: `linear-gradient(135deg, rgba(124,77,255,0.1), rgba(30,136,229,0.08))`,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "48px 32px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>🤝</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Interested in partnering?</h3>
          <p style={{ fontSize: 14, color: "#8892A4", marginBottom: 20 }}>
            Whether you want to hire graduates, sponsor a hackathon, or invest in an intern startup — we would love to connect.
          </p>
          <a
            href="mailto:invest@cospronos.com"
            style={{
              display: "inline-block", padding: "12px 32px", borderRadius: 10,
              background: `linear-gradient(135deg, ${ACCENT}, #1E88E5)`,
              color: "#fff", fontSize: 14, fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Email us at invest@cospronos.com
          </a>
          <div style={{ marginTop: 16 }}>
            <Link href="/hackathons" style={{ color: ACCENT, fontSize: 13, textDecoration: "none", fontWeight: 600 }}>
              View Hackathons →
            </Link>
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}
