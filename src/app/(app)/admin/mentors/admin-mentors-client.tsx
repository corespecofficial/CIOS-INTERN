"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { upsertMentorProfile, getAdminMentors, type AdminMentorRow } from "@/app/actions/mentorship";

function StarRating({ rating }: { rating: number }) {
  const stars = Math.round(rating);
  return (
    <span style={{ fontSize: 13, color: "#FFC107", whiteSpace: "nowrap" }}>
      {"★".repeat(Math.max(0, stars))}{"☆".repeat(Math.max(0, 5 - stars))}
      <span style={{ color: "#8892A4", fontSize: 11, marginLeft: 4 }}>{(rating || 0).toFixed(1)}</span>
    </span>
  );
}

function AvailBadge({ available }: { available: boolean }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const res = await getAdminMentors();
    if (res.ok && res.data) {
      setMentors(res.data);
      setLastRefresh(new Date());
    }
    if (!silent) setRefreshing(false);
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const filtered = mentors.filter((m) => {
    const q = search.toLowerCase();
    return !q || (m.name || "").toLowerCase().includes(q) || m.expertise_tags.some((t) => t.toLowerCase().includes(q));
  });

  const totalSessions = mentors.reduce((s, m) => s + (m.sessions_done || 0), 0);
  const totalActive = mentors.reduce((s, m) => s + (m.active_mentees || 0), 0);
  const available = mentors.filter((m) => m.is_available).length;

  const handleToggle = (mentor: AdminMentorRow) => {
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 0 40px", fontFamily: "'Nunito', sans-serif" }}>
      <style>{`
        @media (max-width: 640px) {
          .mentor-stats-grid { grid-template-columns: 1fr 1fr !important; }
          .mentor-table-wrap { display: none !important; }
          .mentor-cards-wrap { display: flex !important; }
        }
        @media (min-width: 641px) {
          .mentor-table-wrap { display: block !important; }
          .mentor-cards-wrap { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 12px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>ADMIN</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "#E8EDF5" }}>Mentor Management</h1>
          <p style={{ color: "#8892A4", fontSize: 13, margin: 0 }}>
            View all registered mentors, availability, mentee counts, and session stats.
          </p>
        </div>
        <button
          onClick={() => refresh(false)}
          disabled={refreshing}
          style={{
            padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
            background: "#111827", color: "#E8EDF5", fontSize: 12, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            opacity: refreshing ? 0.6 : 1, flexShrink: 0,
          }}
        >
          {refreshing ? "↻ Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      <p style={{ fontSize: 11, color: "#374151", margin: "0 0 16px" }}>
        Last updated: {lastRefresh.toLocaleTimeString()} · auto-refreshes every 30s
      </p>

      {/* Stats */}
      <div className="mentor-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Mentors", value: mentors.length, color: "#1E88E5" },
          { label: "Available", value: available, color: "#66BB6A" },
          { label: "Active Mentees", value: totalActive, color: "#AB47BC" },
          { label: "Total Sessions", value: totalSessions, color: "#FFC107" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#111827", borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 6px" }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or expertise tag…"
        style={{
          width: "100%", padding: "11px 16px", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.1)", background: "#111827",
          color: "#E8EDF5", fontSize: 14, marginBottom: 16, boxSizing: "border-box", outline: "none",
        }}
      />

      {/* ── DESKTOP TABLE ── */}
      <div className="mentor-table-wrap" style={{ background: "#111827", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                {["Mentor", "Expertise", "Status", "Mentees", "Sessions", "Rating", ""].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px 24px", textAlign: "center", color: "#5A6478", fontSize: 14 }}>
                    {search ? "No mentors match your search." : "No mentors registered yet."}
                  </td>
                </tr>
              ) : filtered.map((m, i) => (
                <tr key={m.user_id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                          {(m.name || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: "#E8EDF5" }}>{m.name || "—"}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: m.session_rate ? "#5A6478" : "#66BB6A" }}>
                          {m.session_rate ? `₦${Number(m.session_rate).toLocaleString()}/session` : "Free"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(m.expertise_tags || []).slice(0, 3).map((t) => (
                        <span key={t} style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: "rgba(30,136,229,0.12)", color: "#1E88E5" }}>{t}</span>
                      ))}
                      {(m.expertise_tags || []).length > 3 && <span style={{ fontSize: 10, color: "#5A6478" }}>+{m.expertise_tags.length - 3}</span>}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}><AvailBadge available={m.is_available} /></td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#AB47BC" }}>{m.active_mentees}</span>
                    <span style={{ fontSize: 11, color: "#5A6478" }}>/{m.max_mentees}</span>
                    {m.pending_requests > 0 && <span style={{ display: "block", fontSize: 10, color: "#FFC107", fontWeight: 700 }}>{m.pending_requests} pending</span>}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#FFC107" }}>{m.sessions_done}</span>
                  </td>
                  <td style={{ padding: "14px 16px" }}><StarRating rating={m.rating} /></td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => handleToggle(m)}
                      disabled={isPending && togglingId === m.user_id}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                        background: m.is_available ? "rgba(239,83,80,0.12)" : "rgba(102,187,106,0.12)",
                        color: m.is_available ? "#EF5350" : "#66BB6A",
                        opacity: isPending && togglingId === m.user_id ? 0.6 : 1,
                      }}
                    >
                      {isPending && togglingId === m.user_id ? "…" : m.is_available ? "Mark Full" : "Mark Open"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="mentor-cards-wrap" style={{ flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "#5A6478", fontSize: 14, background: "#111827", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
            {search ? "No mentors match your search." : "No mentors registered yet."}
          </div>
        ) : filtered.map((m) => (
          <div key={m.user_id} style={{
            background: "#111827", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", padding: 16,
          }}>
            {/* Top row: avatar + name + availability */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                  {(m.name || "?")[0].toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || "—"}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: m.session_rate ? "#8892A4" : "#66BB6A" }}>
                  {m.session_rate ? `₦${Number(m.session_rate).toLocaleString()}/session` : "Free"}
                </p>
              </div>
              <AvailBadge available={m.is_available} />
            </div>

            {/* Expertise tags */}
            {(m.expertise_tags || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                {(m.expertise_tags || []).slice(0, 4).map((t) => (
                  <span key={t} style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(30,136,229,0.12)", color: "#1E88E5" }}>{t}</span>
                ))}
                {(m.expertise_tags || []).length > 4 && <span style={{ fontSize: 11, color: "#5A6478", alignSelf: "center" }}>+{m.expertise_tags.length - 4}</span>}
              </div>
            )}

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
              <div style={{ background: "rgba(171,71,188,0.08)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#AB47BC" }}>{m.active_mentees}<span style={{ fontSize: 11, color: "#5A6478", fontWeight: 400 }}>/{m.max_mentees}</span></p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#8892A4" }}>Mentees</p>
                {m.pending_requests > 0 && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#FFC107", fontWeight: 700 }}>{m.pending_requests} pending</p>}
              </div>
              <div style={{ background: "rgba(255,193,7,0.08)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFC107" }}>{m.sessions_done}</p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#8892A4" }}>Sessions</p>
              </div>
              <div style={{ background: "rgba(255,193,7,0.06)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 13 }}><StarRating rating={m.rating} /></p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "#8892A4" }}>Rating</p>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() => handleToggle(m)}
              disabled={isPending && togglingId === m.user_id}
              style={{
                width: "100%", padding: "10px", borderRadius: 10, border: "none",
                cursor: "pointer", fontSize: 13, fontWeight: 700,
                background: m.is_available ? "rgba(239,83,80,0.12)" : "rgba(102,187,106,0.12)",
                color: m.is_available ? "#EF5350" : "#66BB6A",
                opacity: isPending && togglingId === m.user_id ? 0.6 : 1,
              }}
            >
              {isPending && togglingId === m.user_id ? "Updating…" : m.is_available ? "Mark as Full" : "Mark as Open"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
