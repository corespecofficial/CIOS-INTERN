/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import type { Hackathon, HackathonTeam, HackathonSubmission } from "@/app/actions/hackathon-types";
import { createTeam, joinTeam, submitProject } from "@/app/actions/hackathons";

const ACCENT = "#FF7043";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    upcoming: { bg: "rgba(30,136,229,0.15)", color: "#1E88E5", label: "Upcoming" },
    active: { bg: "rgba(102,187,106,0.15)", color: "#66BB6A", label: "Active" },
    judging: { bg: "rgba(255,112,67,0.15)", color: "#FF7043", label: "Judging" },
    completed: { bg: "rgba(136,146,164,0.15)", color: "#8892A4", label: "Completed" },
    cancelled: { bg: "rgba(239,83,80,0.15)", color: "#EF5350", label: "Cancelled" },
  };
  const s = styles[status] || styles.upcoming;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 99,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
    }}>
      {status === "active" && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%", background: "#66BB6A",
          animation: "pulse 1.5s infinite",
        }} />
      )}
      {s.label}
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
      maxWidth: 360,
    }}>
      {msg}
    </div>
  );
}

export function HackathonDetailClient({
  hackathon,
  teams,
  leaderboard,
}: {
  hackathon: Hackathon;
  teams: HackathonTeam[];
  leaderboard: HackathonSubmission[];
}) {
  const [tab, setTab] = useState<"overview" | "teams" | "submit" | "leaderboard">("overview");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Teams tab state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [localTeams, setLocalTeams] = useState<HackathonTeam[]>(teams);

  // Submit tab state
  const [subTitle, setSubTitle] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subDemo, setSubDemo] = useState("");
  const [subRepo, setSubRepo] = useState("");

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // Find user's team
  const myTeam = localTeams.find((t) => t.my_role);

  function handleCreateTeam() {
    startTransition(async () => {
      const res = await createTeam(hackathon.id, teamName, teamDesc);
      if (res.ok) {
        showToast("Team created! You are the leader.", true);
        setShowCreateForm(false);
        setTeamName("");
        setTeamDesc("");
      } else {
        showToast(res.error, false);
      }
    });
  }

  function handleJoinTeam(teamId: string) {
    startTransition(async () => {
      const res = await joinTeam(teamId);
      if (res.ok) {
        showToast("Joined team successfully!", true);
        setLocalTeams((prev) =>
          prev.map((t) => t.id === teamId ? { ...t, my_role: "member" } : t)
        );
      } else {
        showToast(res.error, false);
      }
    });
  }

  function handleSubmit() {
    if (!myTeam) return;
    startTransition(async () => {
      const res = await submitProject(hackathon.id, myTeam.id, {
        title: subTitle,
        description: subDesc,
        demoUrl: subDemo || undefined,
        repoUrl: subRepo || undefined,
      });
      if (res.ok) {
        showToast("Project submitted successfully!", true);
      } else {
        showToast(res.error, false);
      }
    });
  }

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "teams", label: `Teams (${localTeams.length})` },
    { key: "submit", label: "Submit Project" },
    { key: "leaderboard", label: "Leaderboard" },
  ] as const;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        input,textarea,select { outline: none; }
        input:focus,textarea:focus,select:focus { border-color: #FF7043 !important; }
        @media (max-width: 600px) {
          .hd-overview-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .hd-teams-grid { grid-template-columns: 1fr !important; }
          .hd-leaderboard { overflow-x: auto; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,112,67,0.08) 0%, rgba(10,14,26,0) 60%)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "40px 32px 32px",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <StatusBadge status={hackathon.status} />
            {hackathon.prize_pool && (
              <span style={{
                padding: "4px 12px", borderRadius: 99,
                background: "rgba(255,193,7,0.15)", color: "#FFC107",
                fontSize: 11, fontWeight: 700,
              }}>
                🏅 {hackathon.prize_pool}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 8px", color: "#E8EDF5" }}>{hackathon.title}</h1>
          {hackathon.theme && (
            <div style={{ fontSize: 14, color: ACCENT, fontWeight: 600, marginBottom: 8 }}>Theme: {hackathon.theme}</div>
          )}
          <div style={{ fontSize: 13, color: "#8892A4" }}>
            📅 {formatDate(hackathon.starts_at)} → {formatDate(hackathon.ends_at)}
            {hackathon.registration_deadline && (
              <span style={{ marginLeft: 16 }}>
                ⏰ Reg. deadline: {formatDate(hackathon.registration_deadline)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "14px 18px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${tab === t.key ? ACCENT : "transparent"}`,
                color: tab === t.key ? ACCENT : "#8892A4",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px" }}>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{
              background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16, padding: 24,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: ACCENT }}>About this Hackathon</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#8892A4", margin: 0, whiteSpace: "pre-wrap" }}>{hackathon.description}</p>
            </div>

            <div className="hd-overview-grid" style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16,
            }}>
              {[
                { label: "Start Date", value: formatDate(hackathon.starts_at), icon: "🗓" },
                { label: "End Date", value: formatDate(hackathon.ends_at), icon: "🏁" },
                { label: "Team Size", value: `${hackathon.min_team_size}–${hackathon.max_team_size} members`, icon: "👥" },
                ...(hackathon.prize_pool ? [{ label: "Prize Pool", value: hackathon.prize_pool, icon: "🏅" }] : []),
              ].map((card) => (
                <div key={card.label} style={{
                  background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{card.icon}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{card.value}</div>
                </div>
              ))}
            </div>

            {hackathon.tags && hackathon.tags.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {hackathon.tags.map((tag) => (
                  <span key={tag} style={{
                    padding: "4px 12px", borderRadius: 99,
                    background: "rgba(255,112,67,0.1)", color: ACCENT,
                    fontSize: 12, fontWeight: 600,
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TEAMS TAB */}
        {tab === "teams" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Create team button */}
            {!myTeam && (
              <div>
                {!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    style={{
                      padding: "10px 24px", borderRadius: 10,
                      background: `rgba(255,112,67,0.15)`,
                      border: `1px solid rgba(255,112,67,0.3)`,
                      color: ACCENT, fontSize: 13, fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Create a Team
                  </button>
                ) : (
                  <div style={{
                    background: "#111827", border: "1px solid rgba(255,112,67,0.2)",
                    borderRadius: 16, padding: 24,
                  }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: ACCENT }}>Create New Team</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Team name (min 2 chars)"
                        style={{
                          padding: "10px 14px", borderRadius: 8,
                          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                          color: "#E8EDF5", fontSize: 14,
                        }}
                      />
                      <textarea
                        value={teamDesc}
                        onChange={(e) => setTeamDesc(e.target.value)}
                        placeholder="Team description (optional)"
                        rows={3}
                        style={{
                          padding: "10px 14px", borderRadius: 8, resize: "vertical",
                          border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                          color: "#E8EDF5", fontSize: 14,
                        }}
                      />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={handleCreateTeam}
                          disabled={isPending || teamName.trim().length < 2}
                          style={{
                            padding: "9px 20px", borderRadius: 8,
                            background: ACCENT, color: "#fff",
                            border: "none", fontSize: 13, fontWeight: 700,
                            cursor: isPending ? "not-allowed" : "pointer",
                            opacity: isPending || teamName.trim().length < 2 ? 0.6 : 1,
                          }}
                        >
                          {isPending ? "Creating..." : "Create Team"}
                        </button>
                        <button
                          onClick={() => setShowCreateForm(false)}
                          style={{
                            padding: "9px 20px", borderRadius: 8,
                            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                            color: "#8892A4", fontSize: 13, cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {myTeam && (
              <div style={{
                padding: "10px 16px", borderRadius: 10,
                background: "rgba(255,112,67,0.08)", border: "1px solid rgba(255,112,67,0.2)",
                color: ACCENT, fontSize: 13, fontWeight: 600,
              }}>
                You are on team &ldquo;{myTeam.name}&rdquo; as {myTeam.my_role}.
              </div>
            )}

            {/* Teams grid */}
            {localTeams.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#8892A4" }}>
                No teams yet. Be the first to create one!
              </div>
            ) : (
              <div className="hd-teams-grid" style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16,
              }}>
                {localTeams.map((team) => {
                  const isMyTeam = !!team.my_role;
                  return (
                    <div
                      key={team.id}
                      style={{
                        background: isMyTeam ? "rgba(255,112,67,0.05)" : "#111827",
                        border: `1px solid ${isMyTeam ? "rgba(255,112,67,0.3)" : "rgba(255,255,255,0.07)"}`,
                        borderRadius: 14, padding: 20,
                        display: "flex", flexDirection: "column", gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>{team.name}</div>
                        <span style={{
                          padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700,
                          background: team.is_open ? "rgba(102,187,106,0.15)" : "rgba(136,146,164,0.15)",
                          color: team.is_open ? "#66BB6A" : "#8892A4",
                        }}>
                          {team.is_open ? "Open" : "Closed"}
                        </span>
                      </div>

                      {team.description && (
                        <div style={{ fontSize: 12, color: "#8892A4" }}>{team.description}</div>
                      )}

                      {/* Member avatars */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ display: "flex", gap: -4 }}>
                          {team.members.slice(0, 4).map((m) => (
                            m.avatar_url ? (
                              <img
                                key={m.user_id}
                                src={m.avatar_url}
                                alt={m.name || "member"}
                                style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  border: "2px solid #111827", objectFit: "cover",
                                  marginLeft: -6,
                                }}
                              />
                            ) : (
                              <div
                                key={m.user_id}
                                title={m.name || "member"}
                                style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  background: "linear-gradient(135deg, #FF7043, #AB47BC)",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: 10, fontWeight: 700, color: "#fff",
                                  border: "2px solid #111827",
                                  marginLeft: -6,
                                }}
                              >
                                {(m.name || "?")[0].toUpperCase()}
                              </div>
                            )
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: "#8892A4", marginLeft: 8 }}>
                          {team.members.length}/{hackathon.max_team_size} members
                        </div>
                      </div>

                      {!isMyTeam && !myTeam && team.is_open && team.members.length < hackathon.max_team_size && (
                        <button
                          onClick={() => handleJoinTeam(team.id)}
                          disabled={isPending}
                          style={{
                            padding: "8px 0", borderRadius: 8,
                            background: "rgba(255,112,67,0.1)", border: "1px solid rgba(255,112,67,0.3)",
                            color: ACCENT, fontSize: 12, fontWeight: 700,
                            cursor: isPending ? "not-allowed" : "pointer",
                            opacity: isPending ? 0.6 : 1,
                          }}
                        >
                          {isPending ? "Joining..." : "Join Team"}
                        </button>
                      )}

                      {isMyTeam && (
                        <div style={{ fontSize: 12, color: ACCENT, fontWeight: 600 }}>
                          ✓ Your team ({team.my_role})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUBMIT TAB */}
        {tab === "submit" && (
          <div>
            {!myTeam ? (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>You need to be in a team</div>
                <div style={{ color: "#8892A4", marginBottom: 16 }}>Join or create a team first to submit a project.</div>
                <button
                  onClick={() => setTab("teams")}
                  style={{
                    padding: "10px 24px", borderRadius: 10,
                    background: "rgba(255,112,67,0.15)", border: "1px solid rgba(255,112,67,0.3)",
                    color: ACCENT, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Go to Teams →
                </button>
              </div>
            ) : (
              <div style={{
                background: "#111827", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: 28, maxWidth: 600,
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: ACCENT }}>Submit Your Project</h3>
                <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 20 }}>
                  Submitting as team: <strong style={{ color: "#E8EDF5" }}>{myTeam.name}</strong>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Project Title *</label>
                    <input
                      value={subTitle}
                      onChange={(e) => setSubTitle(e.target.value)}
                      placeholder="e.g. AI-powered crop monitoring"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, boxSizing: "border-box",
                        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                        color: "#E8EDF5", fontSize: 14,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>
                      Description * <span style={{ color: subDesc.trim().length < 20 ? "#EF5350" : "#66BB6A" }}>({subDesc.trim().length}/20 min)</span>
                    </label>
                    <textarea
                      value={subDesc}
                      onChange={(e) => setSubDesc(e.target.value)}
                      placeholder="Describe your project, what it does, and how you built it..."
                      rows={5}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, resize: "vertical", boxSizing: "border-box",
                        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                        color: "#E8EDF5", fontSize: 14,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Demo URL (optional)</label>
                    <input
                      value={subDemo}
                      onChange={(e) => setSubDemo(e.target.value)}
                      placeholder="https://your-demo.com"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, boxSizing: "border-box",
                        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                        color: "#E8EDF5", fontSize: 14,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, color: "#8892A4", display: "block", marginBottom: 6 }}>Repository URL (optional)</label>
                    <input
                      value={subRepo}
                      onChange={(e) => setSubRepo(e.target.value)}
                      placeholder="https://github.com/yourteam/project"
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8, boxSizing: "border-box",
                        border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                        color: "#E8EDF5", fontSize: 14,
                      }}
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isPending || subTitle.trim().length < 3 || subDesc.trim().length < 20}
                    style={{
                      padding: "12px 0", borderRadius: 10,
                      background: ACCENT, border: "none",
                      color: "#fff", fontSize: 14, fontWeight: 700,
                      cursor: isPending || subTitle.trim().length < 3 || subDesc.trim().length < 20 ? "not-allowed" : "pointer",
                      opacity: isPending || subTitle.trim().length < 3 || subDesc.trim().length < 20 ? 0.6 : 1,
                      marginTop: 4,
                    }}
                  >
                    {isPending ? "Submitting..." : "Submit Project"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {tab === "leaderboard" && (
          <div>
            {leaderboard.length === 0 ? (
              <div style={{
                textAlign: "center", padding: "60px 20px",
                border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🏅</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#E8EDF5" }}>Scores not released yet</div>
                <div style={{ color: "#8892A4" }}>The leaderboard will appear once judges submit scores.</div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                      {["Rank", "Team", "Score", "Judge Notes"].map((h) => (
                        <th key={h} style={{
                          padding: "10px 16px", textAlign: "left",
                          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.06em", color: "#8892A4",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, i) => (
                      <tr
                        key={entry.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                          background: i === 0 ? "rgba(255,193,7,0.05)" : i === 1 ? "rgba(136,146,164,0.04)" : i === 2 ? "rgba(255,112,67,0.04)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontSize: 18,
                            display: "inline-block", minWidth: 30,
                          }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${entry.rank}`}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: "#E8EDF5" }}>
                          {entry.team_name || "Unknown Team"}
                          <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 400 }}>{entry.title}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            fontSize: 16, fontWeight: 800,
                            color: i === 0 ? "#FFC107" : i === 1 ? "#8892A4" : i === 2 ? ACCENT : "#E8EDF5",
                          }}>
                            {entry.score?.toFixed(1) ?? "—"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#8892A4", maxWidth: 280 }}>
                          {entry.judge_notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} ok={toast.ok} />}
    </div>
  );
}
