/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { enrollInSpace, submitSpaceReview } from "@/app/actions/creative-spaces";
import type { CreativeSpace, SpaceReview } from "@/app/actions/creative-spaces-types";
import { TIER_STYLES, type CreatorCredibility } from "@/lib/creator-credibility";
import { ConversionGate } from "@/components/portal/conversion-gate";

interface Props {
  space: CreativeSpace;
  reviews: SpaceReview[];
  credBadge: string;
  credTier: CreatorCredibility["tier"];
  provenance: string;
}

const ACCENT = "#26C6DA";
const ACCENT_2 = "#0EA5E9";
const INK = "#F8FAFC";
const DIM = "#94A3B8";
const MUTED = "#64748B";

export function SpaceDetailClient({ space: s, reviews, credBadge, credTier, provenance }: Props) {
  const [pending, start] = useTransition();
  const tierStyle = TIER_STYLES[credTier];
  const isFull = s.enrollment_count >= s.capacity;
  const isFree = s.price_per_student === 0;
  const spotsLeft = Math.max(0, s.capacity - s.enrollment_count);
  const pct = s.capacity > 0 ? Math.min(100, Math.round((s.enrollment_count / s.capacity) * 100)) : 0;

  const handleEnroll = () => {
    start(async () => {
      const res = await enrollInSpace(s.id);
      if (res.ok) {
        toast.success(res.data?.paid ? `Enrolled · ₦${res.data.amount.toLocaleString()} debited.` : "Enrolled · welcome!");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Hero */}
      <div
        style={{
          position: "relative",
          height: 300,
          background: s.cover_image_url
            ? `linear-gradient(180deg, rgba(10,14,26,0.25), rgba(10,14,26,0.85)), url(${s.cover_image_url}) center/cover no-repeat, #0F172A`
            : `radial-gradient(800px 300px at 30% 0%, rgba(38,198,218,0.3), transparent 60%), radial-gradient(700px 300px at 80% 20%, rgba(124,58,237,0.2), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
        className="sd-hero"
      />

      <div style={{ maxWidth: 1080, margin: "-110px auto 0", padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
        <Link
          href="/creative-space"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 999,
            background: "rgba(10,14,26,0.7)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: DIM,
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
            marginBottom: 16,
          }}
        >
          ← Creative Spaces
        </Link>

        <div className="sd-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 26, alignItems: "start" }}>
          {/* LEFT — narrative */}
          <div style={{ minWidth: 0 }}>
            {/* Title block */}
            <div style={{ padding: 28, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={badgeStyle(formatColor(s.format))}>{formatIcon(s.format)} {s.format}</span>
                <span style={badgeStyle(ACCENT)}>{s.category}</span>
                {s.is_featured && <span style={badgeStyle("#F59E0B", true)}>★ Featured</span>}
                {s.is_live && <span style={badgeStyle("#F87171", true, "#F87171")}>● LIVE NOW</span>}
                <span style={badgeStyle("#34D399")}>{s.duration_weeks || 4} weeks</span>
              </div>

              <h1
                className="sd-title"
                style={{
                  margin: 0,
                  fontSize: 34,
                  lineHeight: 1.1,
                  letterSpacing: -1,
                  fontWeight: 900,
                  color: INK,
                  fontFamily: "'Space Grotesk', 'Nunito', sans-serif",
                }}
              >
                {s.title}
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: MUTED, fontWeight: 600 }}>
                {provenance} · listed {new Date(s.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              </p>

              {s.rating > 0 && (
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ display: "flex", gap: 2, color: "#FBBF24" }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ fontSize: 16 }}>{i < Math.round(s.rating) ? "★" : "☆"}</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: INK, fontWeight: 700 }}>{s.rating.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: MUTED }}>({s.review_count} review{s.review_count === 1 ? "" : "s"})</span>
                </div>
              )}

              {s.tags.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {s.tags.map((t) => (
                    <span key={t} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 8, color: DIM }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Intro video */}
            {s.intro_video_url && (
              <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", aspectRatio: "16 / 9", border: "1px solid rgba(255,255,255,0.06)", background: "#000" }}>
                <VideoEmbed url={s.intro_video_url} />
              </div>
            )}

            {/* Outcomes */}
            {s.outcomes.length > 0 && (
              <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
                <h2 style={sectionHead}>What you'll walk away with</h2>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
                  {s.outcomes.map((o, i) => (
                    <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: INK, lineHeight: 1.55 }}>
                      <span style={{ color: "#34D399", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description */}
            <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
              <h2 style={sectionHead}>About this space</h2>
              <p style={{ fontSize: 15, color: INK, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{s.description}</p>
            </div>

            {/* Syllabus */}
            {s.syllabus.length > 0 && (
              <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
                <h2 style={sectionHead}>Syllabus</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.syllabus.map((section, i) => (
                    <details key={i} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 16px" }}>
                      <summary style={{ fontSize: 14, fontWeight: 800, color: INK, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Week {i + 1} · {section.title}</span>
                        <span style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{section.lessons.length} lesson{section.lessons.length === 1 ? "" : "s"}</span>
                      </summary>
                      <ul style={{ margin: "12px 0 0 20px", padding: 0, color: DIM, fontSize: 13, lineHeight: 1.8 }}>
                        {section.lessons.map((l, j) => <li key={j}>{l}</li>)}
                      </ul>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor card */}
            <div style={{ padding: 22, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
              <h2 style={sectionHead}>Your instructor</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
                {s.owner_avatar ? (
                  <img src={s.owner_avatar} alt="" style={{ width: 58, height: 58, borderRadius: "50%", objectFit: "cover", border: `2.5px solid ${tierStyle.border}`, flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 58, height: 58, borderRadius: "50%", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                    {(s.owner_name || "?").charAt(0)}
                  </span>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: INK, letterSpacing: -0.2 }}>{s.owner_name || "CIOS Instructor"}</div>
                  <div style={{ display: "inline-block", marginTop: 4, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: tierStyle.fg, background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, borderRadius: 999 }}>
                    {credBadge}
                  </div>
                </div>
                <Link href={`/creative-space/instructor/${s.owner_id}`} style={{ fontSize: 12, fontWeight: 700, color: ACCENT, textDecoration: "none", whiteSpace: "nowrap" }}>
                  View profile →
                </Link>
              </div>
            </div>

            {/* Reviews */}
            <div style={{ padding: 22, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20 }}>
              <h2 style={sectionHead}>Reviews ({s.review_count})</h2>
              {reviews.length === 0 ? (
                <p style={{ margin: "8px 0 0", fontSize: 13, color: DIM, lineHeight: 1.6 }}>
                  No reviews yet. Enrolled learners can leave one once the cohort begins.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
                  {reviews.map((r) => <ReviewRow key={r.id} review={r} />)}
                </div>
              )}

              <ReviewComposer spaceId={s.id} />
            </div>
          </div>

          {/* RIGHT — sticky enrol card */}
          <aside style={{ position: "sticky", top: 84 }} className="sd-aside">
            <div
              style={{
                padding: 22,
                background: "linear-gradient(180deg, rgba(38,198,218,0.08), rgba(255,255,255,0.02))",
                border: "1px solid rgba(38,198,218,0.28)",
                borderRadius: 20,
                boxShadow: "0 28px 60px -20px rgba(38,198,218,0.35)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                {isFree ? (
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#34D399", fontFamily: "'Space Grotesk', sans-serif" }}>FREE</div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, letterSpacing: 1.5, color: DIM, fontWeight: 800, textTransform: "uppercase" }}>One-time enrol fee</div>
                    <div style={{ fontSize: 34, fontWeight: 900, color: INK, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
                      ₦{Number(s.price_per_student).toLocaleString()}
                    </div>
                  </>
                )}
              </div>

              {/* Capacity */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: pct >= 90 ? "#DC2626" : `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`, transition: "width 160ms ease" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, marginTop: 6, fontWeight: 700 }}>
                  <span>{s.enrollment_count} / {s.capacity} enrolled</span>
                  <span>{isFull ? "FULL" : `${spotsLeft} seat${spotsLeft === 1 ? "" : "s"} left`}</span>
                </div>
              </div>

              <ConversionGate
                action={isFree ? "Enrol for free" : `Enrol in "${s.title}"`}
                benefit="Join free as a public user. Pay per cohort from your CIOS wallet — top up with Paystack or Monnify."
                intendedRole="public_user"
                variant="card"
              >
                <button
                  onClick={handleEnroll}
                  disabled={pending || isFull}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    background: isFull
                      ? "rgba(255,255,255,0.05)"
                      : isFree
                        ? "linear-gradient(135deg, #34D399, #059669)"
                        : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                    color: isFull ? MUTED : "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: pending || isFull ? "not-allowed" : "pointer",
                    letterSpacing: 0.2,
                    boxShadow: isFull ? "none" : `0 14px 28px -10px rgba(38,198,218,0.55)`,
                  }}
                >
                  {pending ? "Enrolling…" : isFull ? "Space is full" : isFree ? "Enrol for free" : `Enrol · ₦${Number(s.price_per_student).toLocaleString()}`}
                </button>
              </ConversionGate>

              {s.is_live && s.meeting_link && (
                <a
                  href={s.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginTop: 10,
                    display: "block",
                    padding: "11px 0",
                    borderRadius: 12,
                    background: "rgba(248,113,113,0.12)",
                    border: "1px solid rgba(248,113,113,0.35)",
                    color: "#FCA5A5",
                    fontSize: 13,
                    fontWeight: 800,
                    textAlign: "center",
                    textDecoration: "none",
                    letterSpacing: 0.3,
                  }}
                >
                  🔴 Session live — join now
                </a>
              )}

              <p style={{ fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.55, margin: "10px 0 0" }}>
                {isFree ? "Free to join — seat is reserved instantly." : "85% goes to your instructor, 15% funds the next CIOS cohort."}
              </p>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                <Kv label="Format" value={s.format} />
                <Kv label="Duration" value={`${s.duration_weeks || 4}w`} />
                {s.schedule && <Kv label="Schedule" value={s.schedule} />}
                <Kv label="Enrolled" value={`${s.enrollment_count}`} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .sd-grid { grid-template-columns: 1fr !important; }
          .sd-aside { position: static !important; }
          .sd-hero { height: 200px !important; }
          .sd-title { font-size: 26px !important; letter-spacing: -0.6px !important; }
        }
      `}</style>
    </div>
  );
}

function ReviewRow({ review: r }: { review: SpaceReview }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
      {r.reviewer_avatar ? (
        <img src={r.reviewer_avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #26C6DA, #0EA5E9)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
          {(r.reviewer_name || "?").charAt(0)}
        </span>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{r.reviewer_name || "Learner"}</span>
          <span style={{ fontSize: 11, color: MUTED }}>·</span>
          <span style={{ display: "flex", gap: 1, color: "#FBBF24" }}>
            {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ fontSize: 12 }}>{i < r.rating ? "★" : "☆"}</span>)}
          </span>
          <span style={{ fontSize: 11, color: MUTED, marginLeft: "auto" }}>
            {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
        {r.body && <p style={{ margin: 0, fontSize: 13, color: DIM, lineHeight: 1.6 }}>{r.body}</p>}
      </div>
    </div>
  );
}

function ReviewComposer({ spaceId }: { spaceId: string }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div style={{ marginTop: 18 }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: "9px 16px",
            background: "rgba(38,198,218,0.12)",
            color: ACCENT,
            border: "1px solid rgba(38,198,218,0.28)",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          + Leave a review
        </button>
        <span style={{ marginLeft: 10, fontSize: 11, color: MUTED }}>Only enrolled learners.</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16, padding: 16, background: "rgba(38,198,218,0.06)", border: "1px solid rgba(38,198,218,0.22)", borderRadius: 14 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setRating(i + 1)}
            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 22, color: i < rating ? "#FBBF24" : "rgba(255,255,255,0.2)", padding: 0 }}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="What was the cohort like? (optional)"
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "rgba(0,0,0,0.35)",
          color: INK,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10,
          fontSize: 13,
          outline: "none",
          fontFamily: "inherit",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={() =>
            start(async () => {
              const r = await submitSpaceReview({ spaceId, rating, body });
              if (r.ok) { toast.success("Thanks for the review"); setOpen(false); setBody(""); }
              else toast.error(r.error);
            })
          }
          disabled={pending}
          style={{
            padding: "9px 16px",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            cursor: pending ? "wait" : "pointer",
          }}
        >
          {pending ? "Submitting…" : "Submit review"}
        </button>
        <button onClick={() => setOpen(false)} style={{ padding: "9px 16px", background: "transparent", color: MUTED, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function VideoEmbed({ url }: { url: string }) {
  // YouTube / Vimeo embed URL normaliser; falls back to a plain video tag.
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu")) {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");
      if (id) return <iframe src={`https://www.youtube.com/embed/${id}`} allowFullScreen style={{ width: "100%", height: "100%", border: "none" }} />;
    }
    if (u.hostname.includes("vimeo")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return <iframe src={`https://player.vimeo.com/video/${id}`} allowFullScreen style={{ width: "100%", height: "100%", border: "none" }} />;
    }
  } catch { /* fallthrough */ }
  return <video src={url} controls style={{ width: "100%", height: "100%" }} />;
}

function badgeStyle(color: string, strong = false, altText?: string): React.CSSProperties {
  const c = altText || color;
  return {
    padding: "3px 10px",
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: 800,
    textTransform: "uppercase",
    background: strong ? "linear-gradient(135deg, #FBBF24, #F59E0B)" : `${c}22`,
    color: strong ? "#1A1205" : c,
    border: strong ? "none" : `1px solid ${c}55`,
    borderRadius: 999,
    whiteSpace: "nowrap",
  };
}

function formatColor(f: string): string {
  return f === "live" ? "#F87171" : f === "recorded" ? "#60A5FA" : "#A855F7";
}

function formatIcon(f: string): string {
  return f === "live" ? "🔴" : f === "recorded" ? "▶" : "⚡";
}

const sectionHead: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 2,
  fontWeight: 800,
  color: MUTED,
  textTransform: "uppercase",
  margin: "0 0 12px",
};

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>
      <div style={{ fontSize: 9, letterSpacing: 1, color: MUTED, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginTop: 2 }}>{value}</div>
    </div>
  );
}
