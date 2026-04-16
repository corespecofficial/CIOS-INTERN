/* eslint-disable @next/next/no-img-element */
"use client";

import { useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { enrollInSpace } from "@/app/actions/creative-spaces";
import { type CreativeSpace } from "@/app/actions/creative-spaces-types";

const ACCENT = "#26C6DA";
const ACCENT_DIM = "rgba(38,198,218,0.15)";
const ACCENT_BORDER = "rgba(38,198,218,0.25)";

const FORMAT_COLORS: Record<string, string> = {
  live: "#66BB6A",
  recorded: "#42A5F5",
  hybrid: "#AB47BC",
};

export function SpaceDetailClient({ space: s }: { space: CreativeSpace }) {
  const [pending, start] = useTransition();
  const isFull = s.enrollment_count >= s.capacity;
  const fillPct = s.capacity > 0 ? Math.min((s.enrollment_count / s.capacity) * 100, 100) : 0;
  const formatColor = FORMAT_COLORS[s.format] || ACCENT;

  const handleEnroll = () => {
    start(async () => {
      const res = await enrollInSpace(s.id);
      if (res.ok) {
        toast.success("Successfully enrolled! Welcome to the space.");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Back */}
      <Link
        href="/creative-space"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#8892A4",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        ← Back to Creative Spaces
      </Link>

      {/* Hero card */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16,
          padding: 28,
          marginBottom: 16,
        }}
      >
        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 6,
              background: `${formatColor}22`,
              color: formatColor,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {s.format}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 6,
              background: ACCENT_DIM,
              color: ACCENT,
            }}
          >
            {s.category}
          </span>
          {s.status !== "approved" && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(239,83,80,0.15)",
                color: "#EF5350",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {s.status}
            </span>
          )}
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#E8EDF5",
            margin: "0 0 12px",
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.2,
          }}
        >
          {s.title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: 14,
            color: "#8892A4",
            lineHeight: 1.7,
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {s.description}
        </p>
      </div>

      {/* Owner card */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        {s.owner_avatar ? (
          <img
            src={s.owner_avatar}
            alt={s.owner_name || "Instructor"}
            style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #26C6DA, #1E88E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {(s.owner_name || "?")[0].toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 600 }}>
            INSTRUCTOR
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "#E8EDF5",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {s.owner_name || "Instructor"}
          </div>
        </div>
        <Link
          href={`/profile/${s.owner_id}`}
          style={{
            padding: "7px 16px",
            background: "rgba(255,255,255,0.04)",
            color: "#8892A4",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          View Profile
        </Link>
      </div>

      {/* Details grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <DetailCard
          label="Price"
          value={
            s.price_per_student === 0 ? "FREE" : `₦${Number(s.price_per_student).toLocaleString()}`
          }
          color={s.price_per_student === 0 ? "#66BB6A" : "#E8EDF5"}
        />
        <DetailCard
          label="Duration"
          value={`${s.duration_weeks || 4} week${(s.duration_weeks || 4) !== 1 ? "s" : ""}`}
          color="#E8EDF5"
        />
        <DetailCard
          label="Capacity"
          value={`${s.enrollment_count} / ${s.capacity}`}
          color={isFull ? "#EF5350" : "#E8EDF5"}
          sub={isFull ? "FULL" : `${Math.round(fillPct)}% filled`}
        />
        <DetailCard label="Format" value={s.format.charAt(0).toUpperCase() + s.format.slice(1)} color={formatColor} />
        {s.schedule && (
          <DetailCard label="Schedule" value={s.schedule} color="#E8EDF5" />
        )}
      </div>

      {/* Capacity bar */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "14px 20px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#8892A4",
            marginBottom: 8,
          }}
        >
          <span>{s.enrollment_count} students enrolled</span>
          <span>{s.capacity - s.enrollment_count} spots left</span>
        </div>
        <div
          style={{
            height: 8,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${fillPct}%`,
              background: isFull ? "#EF5350" : `linear-gradient(90deg, ${ACCENT}, #1E88E5)`,
              borderRadius: 4,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Tags */}
      {s.tags && s.tags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {s.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                color: "#8892A4",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Enroll button */}
      <button
        onClick={handleEnroll}
        disabled={pending || isFull || s.status !== "approved"}
        style={{
          width: "100%",
          padding: "14px 0",
          background:
            isFull || s.status !== "approved"
              ? "rgba(255,255,255,0.04)"
              : pending
              ? "rgba(38,198,218,0.3)"
              : ACCENT_DIM,
          color:
            isFull || s.status !== "approved" ? "#5A6478" : ACCENT,
          border: `1px solid ${
            isFull || s.status !== "approved"
              ? "rgba(255,255,255,0.08)"
              : ACCENT_BORDER
          }`,
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor:
            pending || isFull || s.status !== "approved" ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {pending
          ? "Enrolling…"
          : isFull
          ? "Space is Full"
          : s.status !== "approved"
          ? "Not Open for Enrollment"
          : s.price_per_student === 0
          ? "Enroll for Free"
          : `Enroll — ₦${Number(s.price_per_student).toLocaleString()}`}
      </button>
    </div>
  );
}

function DetailCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#8892A4",
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
