/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { type CreativeSpace, SPACE_CATEGORIES } from "@/app/actions/creative-spaces-types";
import { enrollInSpace } from "@/app/actions/creative-spaces";
import { useIsMobile } from "@/hooks/use-is-mobile";

const ACCENT = "#26C6DA";
const ACCENT_DIM = "rgba(38,198,218,0.15)";
const ACCENT_BORDER = "rgba(38,198,218,0.25)";

const FORMAT_COLORS: Record<string, string> = {
  live: "#66BB6A",
  recorded: "#42A5F5",
  hybrid: "#AB47BC",
};

export function CreativeSpaceClient({ spaces }: { spaces: CreativeSpace[] }) {
  const [category, setCategory] = useState("All");
  const [format, setFormat] = useState("All");
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    let list = spaces;
    if (category !== "All") list = list.filter((s) => s.category === category);
    if (format !== "All") list = list.filter((s) => s.format === format.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          (s.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [spaces, category, format, search]);

  const categoryTabs = ["All", ...SPACE_CATEGORIES];
  const formatTabs = ["All", "Live", "Recorded", "Hybrid"];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${ACCENT_DIM}, rgba(38,198,218,0.05))`,
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: 16,
          padding: isMobile ? "16px" : "28px",
          marginBottom: 16,
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>
            COMMUNITY LEARNING
          </span>
          <h1
            style={{
              fontSize: isMobile ? 20 : 26,
              fontWeight: 800,
              color: "#E8EDF5",
              margin: "4px 0 6px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            🎓 Creative Spaces
          </h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
            Instructor-led learning spaces for the community. Find your next skill.
          </p>
        </div>
        <Link
          href="/creative-space/apply"
          style={{
            padding: "10px 20px",
            background: ACCENT_DIM,
            color: ACCENT,
            border: `1px solid ${ACCENT_BORDER}`,
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
            alignSelf: isMobile ? "stretch" : "auto",
            textAlign: "center",
          }}
        >
          Host a Space →
        </Link>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search spaces, topics, tags…"
          style={{
            flex: 1,
            padding: "9px 14px",
            background: "#111827",
            color: "#E8EDF5",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            fontSize: 13,
            outline: "none",
          }}
        />
        <span style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap" }}>
          {filtered.length} space{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Category tabs — horizontally scrollable on mobile */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 10,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
          scrollbarWidth: "none",
        }}
      >
        {categoryTabs.map((t) => (
          <button
            key={t}
            onClick={() => setCategory(t)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: category === t ? ACCENT_DIM : "rgba(255,255,255,0.04)",
              color: category === t ? ACCENT : "#8892A4",
              transition: "all 0.15s",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Format filter */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 2,
          scrollbarWidth: "none",
        }}
      >
        {formatTabs.map((f) => {
          const color = f === "All" ? ACCENT : FORMAT_COLORS[f.toLowerCase()] || ACCENT;
          const isActive = format === f;
          return (
            <button
              key={f}
              onClick={() => setFormat(f)}
              style={{
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                border: `1px solid ${isActive ? color : "rgba(255,255,255,0.08)"}`,
                background: isActive ? `${color}22` : "transparent",
                color: isActive ? color : "#8892A4",
                transition: "all 0.15s",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: "#8892A4",
            background: "#111827",
            border: "1px dashed rgba(255,255,255,0.1)",
            borderRadius: 14,
          }}
        >
          {spaces.length === 0
            ? "No spaces available yet. Be the first to host one! 🎓"
            : "No spaces match your filters."}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: isMobile ? 12 : 16,
          }}
        >
          {filtered.map((s) => (
            <SpaceCard key={s.id} space={s} isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ space: s, isMobile }: { space: CreativeSpace; isMobile: boolean }) {
  const [pending, start] = useTransition();
  const formatColor = FORMAT_COLORS[s.format] || ACCENT;
  const isFull = s.enrollment_count >= s.capacity;
  const fillPct = s.capacity > 0 ? Math.min((s.enrollment_count / s.capacity) * 100, 100) : 0;

  const handleEnroll = () => {
    start(async () => {
      const res = await enrollInSpace(s.id);
      if (res.ok) {
        toast.success("Enrolled successfully!");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid ${s.is_live ? "rgba(239,83,80,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 14,
        padding: isMobile ? "14px" : "18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.15s",
      }}
    >
      {/* Badges */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: `${formatColor}22`, color: formatColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {s.format}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: ACCENT_DIM, color: ACCENT }}>
          {s.category}
        </span>
        {s.is_live && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(239,83,80,0.2)", color: "#EF5350" }}>
            🔴 LIVE
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: "#E8EDF5", lineHeight: 1.3, fontFamily: "'Space Grotesk', sans-serif" }}>
        {s.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {s.description}
      </div>

      {/* Owner */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {s.owner_avatar ? (
          <img src={s.owner_avatar} alt={s.owner_name || "Instructor"} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #26C6DA, #1E88E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {(s.owner_name || "?")[0].toUpperCase()}
          </div>
        )}
        <span style={{ fontSize: 12, color: "#8892A4" }}>{s.owner_name || "Instructor"}</span>
      </div>

      {/* Capacity progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: isFull ? "#EF5350" : "#8892A4", marginBottom: 4 }}>
          <span>{s.enrollment_count} / {s.capacity} spots</span>
          {isFull && <span style={{ fontWeight: 700 }}>FULL</span>}
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${fillPct}%`, background: isFull ? "#EF5350" : ACCENT, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
      </div>

      {/* Price + Duration */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: s.price_per_student === 0 ? "#66BB6A" : "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
          {s.price_per_student === 0 ? "FREE" : `₦${Number(s.price_per_student).toLocaleString()}`}
        </span>
        <span style={{ fontSize: 11, color: "#8892A4" }}>{s.duration_weeks || 4} week{(s.duration_weeks || 4) !== 1 ? "s" : ""}</span>
      </div>

      {/* Tags */}
      {s.tags && s.tags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {s.tags.slice(0, isMobile ? 3 : 4).map((tag) => (
            <span key={tag} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)" }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Live join button (when live + has meeting link) */}
      {s.is_live && s.meeting_link && (
        <a
          href={s.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", textAlign: "center", padding: "9px 0", background: "rgba(239,83,80,0.15)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
        >
          🔴 Join Live Session
        </a>
      )}

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Link
          href={`/creative-space/${s.id}`}
          style={{ flex: 1, display: "block", textAlign: "center", padding: "8px 0", background: "rgba(255,255,255,0.04)", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
        >
          Details
        </Link>
        <button
          onClick={handleEnroll}
          disabled={pending || isFull}
          style={{
            flex: 1,
            padding: "8px 0",
            background: isFull ? "rgba(255,255,255,0.04)" : ACCENT_DIM,
            color: isFull ? "#5A6478" : ACCENT,
            border: `1px solid ${isFull ? "rgba(255,255,255,0.08)" : ACCENT_BORDER}`,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: pending || isFull ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {pending ? "…" : isFull ? "Full" : "Enroll"}
        </button>
      </div>
    </div>
  );
}
