"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { upsertMentorProfile } from "@/app/actions/mentorship";
import type { AdminMentorRow } from "./page";

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating);
  return (
    <span style={{ fontSize: 13, color: "#FFC107" }}>
      {"★".repeat(stars)}{"☆".repeat(5 - stars)}
      <span style={{ color: "#8892A4", fontSize: 11, marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function AvailBadge({ available }: { available: boolean }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: available ? "rgba(102,187,106,0.12)" : "rgba(239,83,80,0.12)",
      color: available ? "#66BB6A" : "#EF5350",
    }}>
      {available ? "Available" : "Full"}
    </span>
  );
}

export default function AdminMentorsClient({ mentors: initial }: { mentors: AdminMentorRow[] }) {
  const [mentors, setMentors] = useState(initial);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = mentors.filter((m) => {
    const q = search.toLowerCase();
    return !q || (m.name || "").toLowerCase().includes(q) || m.expertise_tags.some((t) => t.toLowerCase().includes(q));
  });

  const totalSessions = mentors.reduce((s, m) => s + m.sessions_done, 0);
  const totalActive = mentors.reduce((s, m) => s + m.active_mentees, 0);
  const available = mentors.filter((m) => m.is_available).length;

  const handleToggleAvailability = (mentor: AdminMentorRow) => {
    setTogglingId(mentor.user_id);
    startTransition(async () => {
      const res = await upsertMentorProfile({ is_available: !mentor.is_available });
      setTogglingId(null);
      if (!res.ok) { toast.error(res.error); return; }
      setMentors((ms) => ms.map((m) => m.user_id === mentor.user_id ? { ...m, is_available: !m.is_available } : m));
      toast.success(`Mentor marked as ${!mentor.is_available ? "available" : "unavailable"}`);
    });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 40px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Mentor Management</h1>
      <p style={{ color: "#8892A4", fontSize: 14, margin: "0 0 24px" }}>
        View all registered mentors, their availability, active mentee counts, and session stats.
      </p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Mentors", value: mentors.length, color: "#1E88E5" },
          { label: "Available", value: available, color: "#66BB6A" },
          { label: "Active Mentees", value: totalActive, color: "#AB47BC" },
          { label: "Total Sessions", value: totalSessions, color: "#FFC107" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111827", borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 6px" }}>{s.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or expertise tag…"
        style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "#111827", color: "#E8EDF5", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }}
      />

      {/* Table */}
      <div style={{ background: "#111827", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 90px 80px 80px 80px 110px", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          {["Mentor", "Expertise", "Status", "Mentees", "Sessions", "Rating", ""].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#5A6478", fontSize: 14 }}>
            {search ? "No mentors match your search." : "No mentors registered yet."}
          </div>
        ) : (
          filtered.map((m, i) => (
            <div key={m.user_id} style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 90px 80px 80px 80px 110px",
              padding: "14px 20px", alignItems: "center",
              borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              {/* Name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.name || ""} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {(m.name || "?")[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{m.name || "—"}</p>
                  {m.session_rate ? <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5A6478" }}>₦{Number(m.session_rate).toLocaleString()}/session</p> : <p style={{ margin: "2px 0 0", fontSize: 11, color: "#66BB6A" }}>Free</p>}
                </div>
              </div>

              {/* Expertise */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {m.expertise_tags.slice(0, 3).map((t) => (
                  <span key={t} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(30,136,229,0.12)", color: "#1E88E5" }}>{t}</span>
                ))}
                {m.expertise_tags.length > 3 && <span style={{ fontSize: 10, color: "#5A6478" }}>+{m.expertise_tags.length - 3}</span>}
              </div>

              {/* Status */}
              <div><AvailBadge available={m.is_available} /></div>

              {/* Active mentees */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#AB47BC" }}>{m.active_mentees}</span>
                <span style={{ fontSize: 11, color: "#5A6478" }}>/{m.max_mentees}</span>
                {m.pending_requests > 0 && (
                  <span style={{ display: "block", fontSize: 10, color: "#FFC107", fontWeight: 700 }}>{m.pending_requests} pending</span>
                )}
              </div>

              {/* Sessions done */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#FFC107" }}>{m.sessions_done}</span>
              </div>

              {/* Rating */}
              <div><StarRating rating={m.rating} /></div>

              {/* Toggle availability */}
              <div>
                <button
                  onClick={() => handleToggleAvailability(m)}
                  disabled={isPending && togglingId === m.user_id}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    background: m.is_available ? "rgba(239,83,80,0.12)" : "rgba(102,187,106,0.12)",
                    color: m.is_available ? "#EF5350" : "#66BB6A",
                    opacity: isPending && togglingId === m.user_id ? 0.6 : 1,
                  }}
                >
                  {isPending && togglingId === m.user_id ? "…" : m.is_available ? "Mark Full" : "Mark Open"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
