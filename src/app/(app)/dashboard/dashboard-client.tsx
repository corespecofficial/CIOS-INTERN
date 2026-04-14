"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/use-app-store";
import { PromotionProgressCard } from "@/components/promotion-progress-card";
import { useCurrentUser } from "@/lib/use-current-user";
import { AdminDashboard } from "./admin-dashboard";
import {
  SuperAdminDashboard,
  TeamLeadDashboard,
  InstructorDashboard,
  ModeratorDashboard,
  FinanceDashboard,
  SupportDashboard,
} from "./portal-dashboards";

/* ── Animated Counter Hook ── */
function useCounter(end: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
}

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const n = useCounter(value);
  return <>{n.toLocaleString()}{suffix}</>;
}

/* ── Promotion Ladder Data ── */
const ladderRanks = [
  "New Intern",
  "Active",
  "Senior Intern",
  "Team Lead",
  "Dept Lead",
  "Trainer",
  "Manager",
  "Admin",
  "Executive",
];

interface InternStats {
  xp: number;
  streak: number;
  performance: number;
  walletBalance: number;
  level: number;
  rank: string;
  todaysTasks: { id: string; title: string; dueLabel: string; priority: "low" | "medium" | "high" | "urgent" }[];
  upcomingClasses: { id: string; title: string; instructorName: string; startLabel: string; isLive: boolean }[];
  leaderboard: { id: string; name: string; xp: number; avatarUrl: string | null; isMe: boolean }[];
  weekly: { day: string; value: number }[];
  activity: { id: string; text: string; value: string; color: string; timeLabel: string }[];
  teamStats: { members: number; inProgress: number; teamScore: number };
  teamLeaderboard: { rank: number; name: string; xp: number; avatarUrl: string | null }[];
}

const PRIORITY_DOT: Record<InternStats["todaysTasks"][number]["priority"], string> = {
  urgent: "#EF5350", high: "#FF7043", medium: "#FFC107", low: "#1E88E5",
};
const PRIORITY_BG: Record<InternStats["todaysTasks"][number]["priority"], { bg: string; color: string }> = {
  urgent: { bg: "rgba(239,83,80,0.15)", color: "#EF5350" },
  high:   { bg: "rgba(255,112,67,0.15)", color: "#FF7043" },
  medium: { bg: "rgba(255,193,7,0.15)",  color: "#FFC107" },
  low:    { bg: "rgba(30,136,229,0.15)", color: "#1E88E5" },
};

/* ── Intern Dashboard ── */
function InternDashboard({ stats }: { stats: InternStats }) {
  const user = useCurrentUser();
  const today = new Date();
  const greeting =
    today.getHours() < 12
      ? "Good Morning"
      : today.getHours() < 17
      ? "Good Afternoon"
      : "Good Evening";
  const firstName = user.firstName || "Intern";
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const walletPct = Math.min(100, Math.round((stats.walletBalance / 100000) * 100));

  return (
    <div style={{ fontFamily: "'Inter', 'Space Grotesk', sans-serif" }}>

      {/* ── 1. Welcome Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(255,193,7,0.08))",
          border: "1px solid rgba(30,136,229,0.2)",
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <img
          src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png"
          alt="CIOS Mascot"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            objectFit: "cover",
            animation: "bounce 2s infinite",
          }}
        />
        <div>
          <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 2 }}>
            {dateLabel}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#E8EDF5" }}>
            {greeting}, {firstName}!
          </div>
          <div style={{ fontSize: 13, color: "#8892A4", marginTop: 2 }}>
            You are on a <span style={{ color: "#FF7043", fontWeight: 700 }}>{stats.streak}</span>-day streak! Keep pushing forward.
          </div>
        </div>
      </div>

      {/* Promotion readiness (real-time score from performance / streak / tasks) */}
      <div style={{ marginBottom: 20 }}>
        <PromotionProgressCard />
      </div>

      {/* ── 2. Promotion Ladder ── */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 4 }}>
          🏆 Promotion Ladder
        </div>
        <div style={{ fontSize: 13, color: "#8892A4", marginBottom: 14 }}>
          Current Rank: <span style={{ fontWeight: 700, color: "#1E88E5" }}>{stats.rank}</span> – Level {stats.level}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {ladderRanks.map((rank, i) => {
            const isActive = rank === stats.rank;
            return (
              <React.Fragment key={rank}>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    border: isActive ? "1px solid #1E88E5" : "1px solid rgba(255,255,255,0.1)",
                    background: isActive ? "#1E88E5" : "transparent",
                    color: isActive ? "#fff" : "#8892A4",
                    boxShadow: isActive ? "0 0 12px rgba(30,136,229,0.4)" : "none",
                  }}
                >
                  {rank}
                </span>
                {i < ladderRanks.length - 1 && (
                  <span style={{ color: "#8892A4", fontSize: 13 }}>→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── 3. Stats Row ── */}
      <style>{`
        @media (max-width: 768px) { .cios-dash-stats { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
      <div
        className="cios-dash-stats"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {[
          { value: stats.xp, label: "Total XP", color: "#1E88E5", border: "#1E88E5" },
          { value: stats.streak, label: "Day Streak", color: "#FF7043", border: "#FF7043" },
          { value: 0, label: "Leaderboard", color: "#FFC107", border: "#FFC107", display: "#3" },
          { value: stats.performance, label: "Performance", color: "#66BB6A", border: "#66BB6A", suffix: "%" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.07)",
              borderLeft: `3px solid ${stat.border}`,
              borderRadius: 14,
              padding: 18,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: stat.color,
              }}
            >
              {stat.display ? stat.display : <AnimatedNumber value={stat.value} suffix={stat.suffix || ""} />}
            </div>
            <div style={{ fontSize: 12, color: "#8892A4", fontWeight: 600, marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── 4. Three Column Grid ── */}
      <style>{`
        @media (max-width: 900px) {
          .cios-dash-3col { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div
        className="cios-dash-3col"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 20,
        }}
      >
        {/* Column 1 - Today's Tasks */}
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 14 }}>
            Today&apos;s Tasks
          </div>
          {stats.todaysTasks.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8892A4", margin: "8px 0" }}>No tasks due soon. Enjoy the quiet.</p>
          ) : (
            stats.todaysTasks.map((task) => {
              const tag = PRIORITY_BG[task.priority];
              return (
                <div
                  key={task.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRIORITY_DOT[task.priority], flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8,
                    background: tag.bg, color: tag.color, whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {task.dueLabel}
                  </span>
                </div>
              );
            })
          )}
          <a href="/tasks" style={{ marginTop: 12, display: "block", fontSize: 13, color: "#1E88E5", textDecoration: "none", fontWeight: 600 }}>
            View All Tasks →
          </a>
        </div>

        {/* Column 2 - Upcoming Classes */}
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 14 }}>
            Upcoming Classes
          </div>
          {stats.upcomingClasses.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8892A4", margin: "8px 0" }}>
              No upcoming classes scheduled.
            </p>
          ) : (
            stats.upcomingClasses.map((cls, i) => (
              <div key={cls.id} style={{
                padding: "10px 0",
                borderBottom: i < stats.upcomingClasses.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5" }}>{cls.title}</span>
                  {cls.isLive && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
                      color: "#66BB6A", background: "rgba(102,187,106,0.12)", padding: "2px 8px", borderRadius: 8,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#66BB6A", animation: "pulse 1.5s infinite" }} />
                      Live
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#8892A4" }}>
                  {cls.instructorName} | {cls.startLabel}
                </div>
              </div>
            ))
          )}
          <a href="/calendar" style={{ marginTop: 12, display: "block", fontSize: 13, color: "#1E88E5", textDecoration: "none", fontWeight: 600 }}>
            View Schedule →
          </a>
        </div>

        {/* Column 3 - Wallet */}
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Wallet Section */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 10 }}>
              💳 Wallet
            </div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#FFC107",
              }}
            >
              ₦{stats.walletBalance.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>Available balance</div>
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: "#8892A4",
                  marginBottom: 4,
                }}
              >
                <span>{stats.walletBalance.toLocaleString()} / 100,000</span>
                <span>{walletPct}%</span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${walletPct}%`,
                    height: "100%",
                    borderRadius: 6,
                    background: "linear-gradient(90deg, #1E88E5, #42A5F5)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Leaderboard Section */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>
              Top 3 Leaderboard
            </div>
            {stats.leaderboard.length === 0 ? (
              <p style={{ fontSize: 12, color: "#8892A4" }}>Leaderboard is empty.</p>
            ) : (
              stats.leaderboard.map((u, i) => {
                const rankColor = i === 0 ? "#FFC107" : i === 1 ? "#8892A4" : "#CD7F32";
                const ini = (u.name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("") || "?").toUpperCase();
                return (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 10, marginBottom: 4,
                    background: u.isMe ? "rgba(30,136,229,0.08)" : "transparent",
                    border: u.isMe ? "1px solid rgba(30,136,229,0.2)" : "1px solid transparent",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: rankColor, width: 20, textAlign: "center" }}>
                      #{i + 1}
                    </span>
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                      <span style={{
                        width: 28, height: 28, borderRadius: "50%", background: rankColor,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: "#0A0E1A", flexShrink: 0,
                      }}>{ini}</span>
                    )}
                    <span style={{ fontSize: 13, color: "#E8EDF5", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.isMe ? "You" : u.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#8892A4", fontWeight: 600 }}>{u.xp.toLocaleString()} XP</span>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 8 }}>
              Quick Actions
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Notes", icon: "📝", href: "/notes" },
                { label: "Calendar", icon: "📅", href: "/calendar" },
                { label: "Messages", icon: "💬", href: "/messages" },
                { label: "Courses", icon: "📚", href: "/courses" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 10px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "transparent",
                    color: "#E8EDF5",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "none",
                  }}
                >
                  {action.icon} {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Weekly Performance Chart ── */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>
          📊 Weekly Performance
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 10,
            height: 150,
          }}
        >
          {stats.weekly.map((d, idx) => {
            const isToday = idx === stats.weekly.length - 1;
            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  height: "100%",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${d.value}%`,
                    borderRadius: "6px 6px 0 0",
                    background: isToday
                      ? "linear-gradient(to top, #FFC107, #FFD54F)"
                      : "linear-gradient(to top, #1E88E5, #42A5F5)",
                    boxShadow: isToday ? "0 0 10px rgba(255,193,7,0.3)" : "none",
                    transition: "height 0.6s ease",
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: isToday ? "#FFC107" : "#8892A4",
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6. Recent Activity ── */}
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 16 }}>
          🕒 Recent Activity
        </div>
        {stats.activity.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8892A4", margin: "8px 0" }}>
            No recent activity. Complete a task or make a transaction to see it here.
          </p>
        ) : (
          stats.activity.map((a, i) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: i < stats.activity.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "#E8EDF5", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.text}</span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: a.value.startsWith("-") ? "#EF5350" : a.value.startsWith("+") ? "#66BB6A" : "#FFC107",
                whiteSpace: "nowrap",
              }}>{a.value}</span>
              <span style={{ fontSize: 12, color: "#8892A4", whiteSpace: "nowrap" }}>{a.timeLabel}</span>
            </div>
          ))
        )}
      </div>

      {/* ── Bounce + Pulse keyframes ── */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardClient({ stats }: { stats: InternStats }) {
  const role = useAppStore((s) => s.role);

  if (role === "admin") return <AdminDashboard />;
  if (role === "super_admin") return <SuperAdminDashboard />;
  if (role === "team_lead") return <TeamLeadDashboard stats={stats.teamStats} leaderboard={stats.teamLeaderboard} />;
  if (role === "instructor") return <InstructorDashboard />;
  if (role === "moderator") return <ModeratorDashboard />;
  if (role === "finance") return <FinanceDashboard />;
  if (role === "support") return <SupportDashboard />;

  return <InternDashboard stats={stats} />;
}
