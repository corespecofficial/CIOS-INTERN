/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { type CreativeSpace } from "@/app/actions/creative-spaces-types";

const ACCENT = "#26C6DA";
const ACCENT_DIM = "rgba(38,198,218,0.15)";
const ACCENT_BORDER = "rgba(38,198,218,0.25)";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFC107",
  approved: "#66BB6A",
  rejected: "#EF5350",
  suspended: "#8892A4",
};

const FORMAT_COLORS: Record<string, string> = {
  live: "#66BB6A",
  recorded: "#42A5F5",
  hybrid: "#AB47BC",
};

export function ManageSpacesClient({
  mySpaces,
  myEnrollments,
}: {
  mySpaces: CreativeSpace[];
  myEnrollments: CreativeSpace[];
}) {
  const [tab, setTab] = useState<"hosted" | "enrolled">("hosted");

  const totalEnrolled = mySpaces.reduce((sum, s) => sum + s.enrollment_count, 0);
  const pendingCount = mySpaces.filter((s) => s.status === "pending").length;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${ACCENT_DIM}, rgba(38,198,218,0.05))`,
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>
            INSTRUCTOR DASHBOARD
          </span>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#E8EDF5",
              margin: "4px 0 4px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            🎓 My Spaces
          </h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
            Manage your hosted spaces and track your enrollments.
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
          }}
        >
          + Host a New Space
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: 0 }}>
        {(["hosted", "enrolled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: "transparent",
              color: tab === t ? ACCENT : "#8892A4",
              borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent",
              transition: "color 0.15s",
            }}
          >
            {t === "hosted"
              ? `My Hosted Spaces (${mySpaces.length})`
              : `Enrolled Spaces (${myEnrollments.length})`}
          </button>
        ))}
      </div>

      {/* Hosted Spaces Tab */}
      {tab === "hosted" && (
        <div>
          {/* Stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <StatCard label="Spaces Hosted" value={mySpaces.length} color={ACCENT} />
            <StatCard label="Total Enrolled" value={totalEnrolled} color="#66BB6A" />
            <StatCard label="Pending Approval" value={pendingCount} color="#FFC107" />
          </div>

          {mySpaces.length === 0 ? (
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
              You haven&apos;t hosted any spaces yet.{" "}
              <Link href="/creative-space/apply" style={{ color: ACCENT }}>
                Host your first space!
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {mySpaces.map((s) => (
                <HostedSpaceRow key={s.id} space={s} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enrolled Spaces Tab */}
      {tab === "enrolled" && (
        <div>
          {myEnrollments.length === 0 ? (
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
              Not enrolled in any spaces yet.{" "}
              <Link href="/creative-space" style={{ color: ACCENT }}>
                Browse available spaces!
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {myEnrollments.map((s) => (
                <EnrolledSpaceCard key={s.id} space={s} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color,
          fontFamily: "'Space Grotesk', sans-serif",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
    </div>
  );
}

function HostedSpaceRow({ space: s }: { space: CreativeSpace }) {
  const statusColor = STATUS_COLORS[s.status] || "#8892A4";
  const formatColor = FORMAT_COLORS[s.format] || "#8892A4";
  const fillPct = s.capacity > 0 ? Math.min((s.enrollment_count / s.capacity) * 100, 100) : 0;

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 200px" }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#E8EDF5",
            marginBottom: 4,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {s.title}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 5,
              background: `${statusColor}22`,
              color: statusColor,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {s.status}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 5,
              background: `${formatColor}22`,
              color: formatColor,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {s.format}
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div style={{ flex: "0 0 140px" }}>
        <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>
          {s.enrollment_count} / {s.capacity} enrolled
        </div>
        <div
          style={{
            height: 4,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${fillPct}%`,
              background: ACCENT,
              borderRadius: 4,
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#8892A4", flex: "0 0 auto" }}>
        {new Date(s.created_at).toLocaleDateString()}
      </div>

      <Link
        href={`/creative-space/${s.id}`}
        style={{
          padding: "6px 14px",
          background: "rgba(255,255,255,0.04)",
          color: "#8892A4",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        View
      </Link>
    </div>
  );
}

function EnrolledSpaceCard({ space: s }: { space: CreativeSpace }) {
  const formatColor = FORMAT_COLORS[s.format] || "#8892A4";

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 5,
            background: `${formatColor}22`,
            color: formatColor,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {s.format}
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 5,
            background: ACCENT_DIM,
            color: ACCENT,
          }}
        >
          {s.category}
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#E8EDF5",
          fontFamily: "'Space Grotesk', sans-serif",
          lineHeight: 1.3,
        }}
      >
        {s.title}
      </div>
      <div style={{ fontSize: 11, color: "#8892A4" }}>
        by {s.owner_name || "Instructor"}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8892A4" }}>
        <span>{s.duration_weeks || 4} weeks</span>
        <span>{s.price_per_student === 0 ? "FREE" : `₦${Number(s.price_per_student).toLocaleString()}`}</span>
      </div>
      <Link
        href={`/creative-space/${s.id}`}
        style={{
          display: "block",
          textAlign: "center",
          padding: "7px 0",
          background: ACCENT_DIM,
          color: ACCENT,
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          marginTop: 4,
        }}
      >
        View Space
      </Link>
    </div>
  );
}
