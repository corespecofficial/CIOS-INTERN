"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { reviewSpace } from "@/app/actions/creative-spaces";
import { type CreativeSpace } from "@/app/actions/creative-spaces-types";

const GOLD = "#FFC107";
const GOLD_DIM = "rgba(255,193,7,0.12)";
const GOLD_BORDER = "rgba(255,193,7,0.25)";

const STATUS_COLORS: Record<string, string> = {
  pending: "#FFC107",
  approved: "#66BB6A",
  rejected: "#EF5350",
  suspended: "#8892A4",
};

export function AdminCreativeSpacesClient({
  pendingSpaces: initialPending,
  allSpaces: initialAll,
}: {
  pendingSpaces: CreativeSpace[];
  allSpaces: CreativeSpace[];
}) {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [pending, setPending] = useState(initialPending);
  const [all, setAll] = useState(initialAll);

  const approvedCount = initialAll.filter((s) => s.status === "approved").length;

  const handleReview = async (spaceId: string, decision: "approved" | "rejected") => {
    const res = await reviewSpace(spaceId, decision);
    if (res.ok) {
      toast.success(`Space ${decision === "approved" ? "approved" : "rejected"}.`);
      setPending((prev) => prev.filter((s) => s.id !== spaceId));
      setAll((prev) =>
        prev.map((s) => (s.id === spaceId ? { ...s, status: decision } : s))
      );
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          background: GOLD_DIM,
          border: `1px solid ${GOLD_BORDER}`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, letterSpacing: 0.5 }}>
          ADMIN PANEL
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
          🏫 Creative Spaces — Admin Review
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          Review and approve instructor space applications.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Pending Review" value={pending.length} color={GOLD} />
        <StatCard label="Approved" value={approvedCount} color="#66BB6A" />
        <StatCard label="Total Spaces" value={initialAll.length} color="#42A5F5" />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {(["pending", "all"] as const).map((t) => (
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
              color: tab === t ? GOLD : "#8892A4",
              borderBottom: tab === t ? `2px solid ${GOLD}` : "2px solid transparent",
              transition: "color 0.15s",
            }}
          >
            {t === "pending"
              ? `Pending Review (${pending.length})`
              : `All Spaces (${all.length})`}
          </button>
        ))}
      </div>

      {/* Pending Tab */}
      {tab === "pending" && (
        <div>
          {pending.length === 0 ? (
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
              No spaces pending review. 🎉
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {pending.map((s) => (
                <PendingSpaceCard key={s.id} space={s} onReview={handleReview} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Tab */}
      {tab === "all" && (
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {["Title", "Owner", "Status", "Enrolled", "Created"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#8892A4",
                      textAlign: "left",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {all.map((s) => {
                const statusColor = STATUS_COLORS[s.status] || "#8892A4";
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5", fontWeight: 600 }}>
                      {s.title}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#8892A4" }}>
                      {s.owner_name || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 5,
                          background: `${statusColor}22`,
                          color: statusColor,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#8892A4" }}>
                      {s.enrollment_count} / {s.capacity}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "#8892A4" }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      <div
        style={{
          fontSize: 11,
          color: "#8892A4",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function PendingSpaceCard({
  space: s,
  onReview,
}: {
  space: CreativeSpace;
  onReview: (id: string, decision: "approved" | "rejected") => Promise<void>;
}) {
  const [pending, start] = useTransition();

  const approve = () => start(() => onReview(s.id, "approved"));
  const reject = () => start(() => onReview(s.id, "rejected"));

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(255,193,7,0.15)",
        borderRadius: 14,
        padding: 20,
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 300px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#E8EDF5",
            marginBottom: 6,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        >
          {s.title}
        </div>
        <p
          style={{
            fontSize: 12,
            color: "#8892A4",
            margin: "0 0 10px",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {s.description}
        </p>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#8892A4", flexWrap: "wrap" }}>
          <span>👤 {s.owner_name || "Unknown"}</span>
          <span>📂 {s.category}</span>
          <span>📡 {s.format}</span>
          <span>
            💰{" "}
            {s.price_per_student === 0
              ? "Free"
              : `₦${Number(s.price_per_student).toLocaleString()}`}
          </span>
          <span>👥 Capacity: {s.capacity}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
        <button
          onClick={approve}
          disabled={pending}
          style={{
            padding: "8px 18px",
            background: "rgba(102,187,106,0.15)",
            color: "#66BB6A",
            border: "1px solid rgba(102,187,106,0.3)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {pending ? "…" : "Approve"}
        </button>
        <button
          onClick={reject}
          disabled={pending}
          style={{
            padding: "8px 18px",
            background: "rgba(239,83,80,0.12)",
            color: "#EF5350",
            border: "1px solid rgba(239,83,80,0.25)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: pending ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {pending ? "…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
