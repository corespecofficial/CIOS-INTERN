/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { type CreativeSpace } from "@/app/actions/creative-spaces-types";
import { updateSpaceMeetingLink, toggleSpaceLive } from "@/app/actions/creative-spaces";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  const isMobile = useIsMobile();

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
          padding: isMobile ? "16px" : "24px",
          marginBottom: 24,
          display: "flex",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>
            INSTRUCTOR DASHBOARD
          </span>
          <h1
            style={{
              fontSize: isMobile ? 20 : 24,
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
            whiteSpace: "nowrap",
          }}
        >
          + Host a New Space
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {(["hosted", "enrolled"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: isMobile ? "8px 14px" : "10px 20px",
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
              ? `Hosted (${mySpaces.length})`
              : `Enrolled (${myEnrollments.length})`}
          </button>
        ))}
      </div>

      {/* Hosted Spaces Tab */}
      {tab === "hosted" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <StatCard label="Spaces Hosted" value={mySpaces.length} color={ACCENT} />
            <StatCard label="Total Enrolled" value={totalEnrolled} color="#66BB6A" />
            <StatCard label="Pending" value={pendingCount} color="#FFC107" />
          </div>

          {mySpaces.length === 0 ? (
            <div
              style={{
                padding: 40,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mySpaces.map((s) => (
                <HostedSpaceRow key={s.id} space={s} isMobile={isMobile} />
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
                padding: 40,
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
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))",
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
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          fontFamily: "'Space Grotesk', sans-serif",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
    </div>
  );
}

function HostedSpaceRow({ space: s, isMobile }: { space: CreativeSpace; isMobile: boolean }) {
  const statusColor = STATUS_COLORS[s.status] || "#8892A4";
  const formatColor = FORMAT_COLORS[s.format] || "#8892A4";
  const fillPct = s.capacity > 0 ? Math.min((s.enrollment_count / s.capacity) * 100, 100) : 0;

  const [showLinkEdit, setShowLinkEdit] = useState(false);
  const [linkInput, setLinkInput] = useState(s.meeting_link || "");
  const [isLive, setIsLive] = useState(s.is_live || false);
  const [linkPending, startLink] = useTransition();
  const [livePending, startLive] = useTransition();

  const handleSaveLink = () => {
    startLink(async () => {
      const res = await updateSpaceMeetingLink(s.id, linkInput);
      if (res.ok) {
        toast.success("Meeting link saved!");
        setShowLinkEdit(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleToggleLive = () => {
    const newState = !isLive;
    startLive(async () => {
      const res = await toggleSpaceLive(s.id, newState);
      if (res.ok) {
        setIsLive(newState);
        toast.success(newState ? "🔴 Space is now live! Students have been notified." : "Session ended.");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid ${isLive ? "rgba(239,83,80,0.4)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12,
        padding: isMobile ? "14px" : "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "border-color 0.2s",
      }}
    >
      {/* Top row: title + badges + controls */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#E8EDF5",
              marginBottom: 6,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            {s.title}
            {isLive && (
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "rgba(239,83,80,0.2)", color: "#EF5350" }}>
                🔴 LIVE
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${statusColor}22`, color: statusColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {s.status}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${formatColor}22`, color: formatColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
              {s.format}
            </span>
          </div>
        </div>

        {/* Capacity */}
        <div style={{ flex: "0 0 130px" }}>
          <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>
            {s.enrollment_count} / {s.capacity} enrolled
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${fillPct}%`, background: ACCENT, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Meeting link row */}
      {s.status === "approved" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {s.meeting_link && !showLinkEdit ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "#8892A4" }}>🔗 Meeting link:</span>
              <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: ACCENT, wordBreak: "break-all" }}>
                {s.meeting_link.length > 50 ? s.meeting_link.slice(0, 50) + "…" : s.meeting_link}
              </a>
              <button onClick={() => { setLinkInput(s.meeting_link || ""); setShowLinkEdit(true); }} style={ghostBtn}>
                Edit
              </button>
            </div>
          ) : showLinkEdit ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://zoom.us/... or meet.google.com/..."
                style={{ flex: "1 1 200px", padding: "7px 12px", background: "#0D1420", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, outline: "none" }}
              />
              <button onClick={handleSaveLink} disabled={linkPending} style={{ ...ghostBtn, color: ACCENT, borderColor: ACCENT_BORDER }}>
                {linkPending ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setShowLinkEdit(false)} style={ghostBtn}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setShowLinkEdit(true)} style={{ ...ghostBtn, alignSelf: "flex-start" }}>
              + Add Meeting Link (Zoom / Google Meet)
            </button>
          )}

          {/* Go Live / End Session button */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleToggleLive}
              disabled={livePending}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: livePending ? "not-allowed" : "pointer",
                border: "none",
                background: isLive ? "rgba(239,83,80,0.15)" : "rgba(102,187,106,0.15)",
                color: isLive ? "#EF5350" : "#66BB6A",
                transition: "all 0.15s",
              }}
            >
              {livePending ? "…" : isLive ? "⏹ End Session" : "🔴 Go Live Now"}
            </button>
            <Link
              href={`/creative-space/${s.id}`}
              style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
            >
              View Page
            </Link>
          </div>
        </div>
      )}

      {s.status === "pending" && (
        <div style={{ fontSize: 12, color: "#FFC107", padding: "8px 12px", background: "rgba(255,193,7,0.08)", borderRadius: 8, border: "1px solid rgba(255,193,7,0.2)" }}>
          ⏳ Awaiting admin approval before you can go live.
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.04)",
  color: "#8892A4",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

function EnrolledSpaceCard({ space: s }: { space: CreativeSpace }) {
  const formatColor = FORMAT_COLORS[s.format] || "#8892A4";

  return (
    <div
      style={{
        background: "#111827",
        border: `1px solid ${s.is_live ? "rgba(239,83,80,0.35)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${formatColor}22`, color: formatColor, textTransform: "uppercase", letterSpacing: 0.4 }}>
          {s.format}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: ACCENT_DIM, color: ACCENT }}>
          {s.category}
        </span>
        {s.is_live && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "rgba(239,83,80,0.2)", color: "#EF5350" }}>
            🔴 LIVE
          </span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.3 }}>
        {s.title}
      </div>
      <div style={{ fontSize: 11, color: "#8892A4" }}>by {s.owner_name || "Instructor"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#8892A4" }}>
        <span>{s.duration_weeks || 4} weeks</span>
        <span>{s.price_per_student === 0 ? "FREE" : `₦${Number(s.price_per_student).toLocaleString()}`}</span>
      </div>
      {s.is_live && s.meeting_link && (
        <a
          href={s.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", textAlign: "center", padding: "8px 0", background: "rgba(239,83,80,0.15)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.35)", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
        >
          🔴 Join Live Session
        </a>
      )}
      <Link
        href={`/creative-space/${s.id}`}
        style={{ display: "block", textAlign: "center", padding: "7px 0", background: ACCENT_DIM, color: ACCENT, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
      >
        View Space
      </Link>
    </div>
  );
}
