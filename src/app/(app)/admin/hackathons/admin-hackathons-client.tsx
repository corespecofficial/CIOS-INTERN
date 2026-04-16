"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { adminCreateHackathon, adminUpdateHackathonStatus } from "@/app/actions/hackathons";
import type { Hackathon } from "@/app/actions/hackathon-types";

const ACCENT = "#FFC107";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    upcoming: { bg: "rgba(30,136,229,0.15)", color: "#1E88E5" },
    active: { bg: "rgba(102,187,106,0.15)", color: "#66BB6A" },
    judging: { bg: "rgba(255,112,67,0.15)", color: "#FF7043" },
    completed: { bg: "rgba(136,146,164,0.15)", color: "#8892A4" },
    cancelled: { bg: "rgba(239,83,80,0.15)", color: "#EF5350" },
  };
  const s = styles[status] || styles.upcoming;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: "capitalize",
    }}>
      {status}
    </span>
  );
}

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
    }}>
      {msg}
    </div>
  );
}

const STATUSES = ["upcoming", "active", "judging", "completed", "cancelled"] as const;

export function AdminHackathonsClient({ hackathons: initial }: { hackathons: Hackathon[] }) {
  const [hackathons, setHackathons] = useState<Hackathon[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Create form state
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [theme, setTheme] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [regDeadline, setRegDeadline] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [maxTeam, setMaxTeam] = useState("4");
  const [minTeam, setMinTeam] = useState("1");
  const [tags, setTags] = useState("");

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await adminCreateHackathon({
        title, description: desc, theme: theme || undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        registration_deadline: regDeadline ? new Date(regDeadline).toISOString() : undefined,
        prize_pool: prizePool || undefined,
        max_team_size: parseInt(maxTeam) || 4,
        min_team_size: parseInt(minTeam) || 1,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      });
      if (res.ok) {
        showToast("Hackathon created!", true);
        setShowForm(false);
        setTitle(""); setDesc(""); setTheme(""); setStartsAt(""); setEndsAt("");
        setRegDeadline(""); setPrizePool(""); setMaxTeam("4"); setMinTeam("1"); setTags("");
      } else {
        showToast(res.error, false);
      }
    });
  }

  function handleStatusChange(hackathonId: string, status: string) {
    startTransition(async () => {
      const res = await adminUpdateHackathonStatus(hackathonId, status);
      if (res.ok) {
        setHackathons((prev) => prev.map((h) => h.id === hackathonId ? { ...h, status } : h));
        showToast("Status updated", true);
      } else {
        showToast(res.error, false);
      }
    });
  }

  const totalTeams = hackathons.reduce((sum, h) => sum + (h.team_count || 0), 0);
  const activeCount = hackathons.filter((h) => h.status === "active").length;

  const inputStyle = {
    padding: "9px 12px", borderRadius: 8, boxSizing: "border-box" as const,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
    color: "#E8EDF5", fontSize: 13, width: "100%",
    outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        input:focus,textarea:focus,select:focus{border-color:#FFC107!important}
        @media (max-width: 600px) {
          .ah-stats-grid { grid-template-columns: 1fr !important; }
          .ah-form-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,193,7,0.08) 0%, rgba(10,14,26,0) 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "36px 32px 28px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 4px" }}>🏆 Hackathon Management</h1>
          <div style={{ fontSize: 14, color: "#8892A4" }}>Create and manage hackathons, update statuses, monitor teams.</div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 32px" }}>
        {/* Stats */}
        <div className="ah-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Total Hackathons", value: hackathons.length, color: ACCENT },
            { label: "Active Now", value: activeCount, color: "#66BB6A" },
            { label: "Total Teams", value: totalTeams, color: "#1E88E5" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "20px 24px",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Create form toggle */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{
              padding: "10px 24px", borderRadius: 10,
              background: showForm ? "rgba(255,255,255,0.05)" : `rgba(255,193,7,0.15)`,
              border: `1px solid ${showForm ? "rgba(255,255,255,0.1)" : "rgba(255,193,7,0.3)"}`,
              color: showForm ? "#8892A4" : ACCENT, fontSize: 13, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showForm ? "✕ Cancel" : "+ Create Hackathon"}
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div style={{
            background: "#111827", border: "1px solid rgba(255,193,7,0.2)",
            borderRadius: 16, padding: 28, marginBottom: 28,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: ACCENT }}>Create New Hackathon</h3>
            <div className="ah-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hackathon title" style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Description *</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the hackathon..." rows={4}
                  style={{ ...inputStyle, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Theme</label>
                <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. AI for Good" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Prize Pool</label>
                <input value={prizePool} onChange={(e) => setPrizePool(e.target.value)} placeholder="e.g. $5,000 total prizes" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Starts At *</label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Ends At *</label>
                <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Registration Deadline</label>
                <input type="datetime-local" value={regDeadline} onChange={(e) => setRegDeadline(e.target.value)} style={{ ...inputStyle, colorScheme: "dark" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Tags (comma-separated)</label>
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AI, Web3, EdTech" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Min Team Size</label>
                <input type="number" value={minTeam} onChange={(e) => setMinTeam(e.target.value)} min={1} max={10} style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 5 }}>Max Team Size</label>
                <input type="number" value={maxTeam} onChange={(e) => setMaxTeam(e.target.value)} min={1} max={10} style={inputStyle} />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={isPending || !title.trim() || !desc.trim() || !startsAt || !endsAt}
              style={{
                marginTop: 20, padding: "11px 28px", borderRadius: 10,
                background: ACCENT, border: "none", color: "#0A0E1A",
                fontSize: 13, fontWeight: 800, cursor: isPending ? "not-allowed" : "pointer",
                opacity: isPending || !title.trim() || !desc.trim() || !startsAt || !endsAt ? 0.6 : 1,
              }}
            >
              {isPending ? "Creating..." : "Create Hackathon"}
            </button>
          </div>
        )}

        {/* Hackathon list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {hackathons.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: "#8892A4",
            }}>
              No hackathons yet. Create one above.
            </div>
          ) : (
            hackathons.map((h) => (
              <div
                key={h.id}
                style={{
                  background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 14, padding: "18px 20px",
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{h.title}</div>
                    <StatusBadge status={h.status} />
                  </div>
                  <div style={{ fontSize: 12, color: "#8892A4" }}>
                    {formatDate(h.starts_at)} → {formatDate(h.ends_at)} · {h.team_count || 0} teams
                  </div>
                </div>

                {/* Status changer */}
                <select
                  value={h.status}
                  onChange={(e) => handleStatusChange(h.id, e.target.value)}
                  disabled={isPending}
                  style={{
                    padding: "7px 10px", borderRadius: 8,
                    border: "1px solid rgba(255,193,7,0.3)", background: "rgba(255,193,7,0.08)",
                    color: ACCENT, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", outline: "none",
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} style={{ background: "#111827", color: "#E8EDF5" }}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>

                <Link
                  href={`/hackathons/${h.id}`}
                  style={{
                    padding: "7px 16px", borderRadius: 8,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#8892A4", fontSize: 12, fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  View →
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}
