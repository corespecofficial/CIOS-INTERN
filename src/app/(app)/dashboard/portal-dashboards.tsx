"use client";
/* eslint-disable @next/next/no-img-element */

import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Server,
  ToggleLeft,
  AlertOctagon,
  Building2,
  Users,
  UserCheck,
  ClipboardList,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Calendar,
  Star,
  DollarSign,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Headphones,
  TicketCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flag,
  Eye,
  Trash2,
  Activity,
  Zap,
  BarChart3,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { DataTable, type Column } from "@/components/ui/data-table";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const MASCOT = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

/* ═══════════════════════════════════════════════════
   1. SUPER ADMIN DASHBOARD (inline styles, HTML prototype match)
   ═══════════════════════════════════════════════════ */

interface SuperAdminProps {
  stats?: { totalUsers: number; totalRevenue: number; orgs: number; systemHealth: number };
}

export function SuperAdminDashboard({ stats }: SuperAdminProps = {}) {
  const display = stats ?? { totalUsers: 0, totalRevenue: 0, orgs: 1, systemHealth: 100 };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(239,83,80,0.12), rgba(171,71,188,0.10))",
          border: "1px solid rgba(239,83,80,0.2)",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <img
          src={MASCOT}
          alt="Mascot"
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
        />
        <div style={{ flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              background: "#EF5350",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            SUPER ADMIN &ndash; CRITICAL ACCESS
          </span>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>
            Super Admin Control Center
          </h1>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0, marginTop: 4 }}>
            Full system control. All actions are logged and auditable.
          </p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { value: display.totalUsers.toLocaleString(), label: "Total Users", color: "#1E88E5" },
          { value: display.orgs.toString(), label: "Organizations", color: "#AB47BC" },
          { value: `\u20A6${display.totalRevenue.toLocaleString()}`, label: "Total Revenue", color: "#FFC107" },
          { value: `${display.systemHealth}%`, label: "System Health", color: "#66BB6A" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: 20,
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "#8892A4", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Emergency Controls */}
      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
          Emergency Controls
        </h3>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            style={{
              flex: 1,
              background: "#EF5350",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            System Lock
          </button>
          <button
            style={{
              flex: 1,
              background: "#FFC107",
              color: "#111827",
              border: "none",
              borderRadius: 12,
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Backup Now
          </button>
          <button
            style={{
              flex: 1,
              background: "transparent",
              color: "#E8EDF5",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Feature Toggles */}
      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
          Feature Toggles
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {[
            { name: "AI Copilot", enabled: true },
            { name: "Spin Wheel", enabled: true },
            { name: "Fine System", enabled: true },
            { name: "Community", enabled: true },
            { name: "Payouts", enabled: false },
          ].map((f) => (
            <div
              key={f.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span style={{ fontSize: 14, color: "#E8EDF5" }}>{f.name}</span>
              <div
                style={{
                  position: "relative",
                  width: 40,
                  height: 20,
                  borderRadius: 10,
                  cursor: "pointer",
                  transition: "background 0.2s",
                  background: f.enabled ? "#1E88E5" : "#374151",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: f.enabled ? 22 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Organizations */}
      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
          Organizations
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { name: "COSPRONOS Media", members: 120, status: "Active", statusColor: "#66BB6A" },
            { name: "Corespec Engineering", members: 85, status: "Active", statusColor: "#66BB6A" },
            { name: "Partner Org", members: 42, status: "Trial", statusColor: "#FFC107" },
          ].map((org) => (
            <div
              key={org.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5", margin: 0 }}>{org.name}</p>
                <p style={{ fontSize: 12, color: "#8892A4", margin: 0, marginTop: 2 }}>{org.members} members</p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fff",
                  background: org.statusColor,
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {org.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   2. TEAM LEAD DASHBOARD (inline styles, HTML prototype match)
   ═══════════════════════════════════════════════════ */

interface TeamLeadProps {
  stats?: { members: number; inProgress: number; teamScore: number };
  leaderboard?: { rank: number; name: string; xp: number; avatarUrl: string | null }[];
}

export function TeamLeadDashboard({ stats, leaderboard: leaderboardProp }: TeamLeadProps = {}) {
  const s = stats ?? { members: 0, inProgress: 0, teamScore: 0 };
  const board = leaderboardProp ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(102,187,106,0.12), rgba(102,187,106,0.04))",
          border: "1px solid rgba(102,187,106,0.2)",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <img
          src={MASCOT}
          alt="Mascot"
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
        />
        <div style={{ flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              background: "#66BB6A",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            TEAM LEAD
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>
            Team Overview
          </h1>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0, marginTop: 4 }}>
            Managing {s.members} member{s.members === 1 ? "" : "s"} · {s.inProgress} task{s.inProgress === 1 ? "" : "s"} in progress
          </p>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { value: s.members.toString(), label: "Team Members", color: "#1E88E5" },
          { value: s.inProgress.toString(), label: "In Progress", color: "#FFC107" },
          { value: `${s.teamScore}%`, label: "Team Score", color: "#66BB6A" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#111827",
              borderRadius: 14,
              padding: 20,
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: 13, color: "#8892A4", marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Team Leaderboard */}
      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
          Team Leaderboard
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {board.length === 0 && (
            <p style={{ fontSize: 13, color: "#8892A4" }}>No team members yet.</p>
          )}
          {board.map((m) => (
            <div
              key={m.rank}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: "#8892A4", width: 24 }}>
                #{m.rank}
              </span>
              <img
                src={("avatarUrl" in m && m.avatarUrl) || MASCOT}
                alt={m.name}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
              <span style={{ flex: 1, fontSize: 14, color: "#E8EDF5", fontWeight: 500 }}>
                {m.name}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#FFC107" }}>
                {m.xp.toLocaleString()} XP
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <button
          style={{
            background: "#1E88E5",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Assign Task to Team
        </button>
        <button
          style={{
            background: "#66BB6A",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Submit Team Report
        </button>
        <button
          style={{
            background: "#FFC107",
            color: "#111827",
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Run Team Challenge
        </button>
        <button
          style={{
            background: "transparent",
            color: "#E8EDF5",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Team Group Chat
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   3. INSTRUCTOR DASHBOARD (inline styles, HTML prototype match)
   ═══════════════════════════════════════════════════ */

interface InstructorCourse {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  totalEnrolled: number;
  totalModules: number;
  thumbnailUrl: string | null;
}

interface InstructorProps {
  courses?: InstructorCourse[];
  name?: string;
}

const COURSE_GRADIENTS = [
  "linear-gradient(135deg, #AB47BC, #7B1FA2)",
  "linear-gradient(135deg, #1E88E5, #00ACC1)",
  "linear-gradient(135deg, #FF7043, #E91E63)",
  "linear-gradient(135deg, #66BB6A, #2E7D32)",
  "linear-gradient(135deg, #FFC107, #F57C00)",
  "linear-gradient(135deg, #EF5350, #C62828)",
];
const COURSE_ICONS: Record<string, string> = {
  AI: "\u{1F916}", Design: "\u{1F3A8}", Development: "\u{1F4BB}",
  Marketing: "\u{1F4E2}", General: "\u{1F4DA}",
};

export function InstructorDashboard({ courses: coursesProp, name }: InstructorProps = {}) {
  const courses = coursesProp ?? [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(171,71,188,0.12), rgba(171,71,188,0.04))",
          border: "1px solid rgba(171,71,188,0.2)",
          borderRadius: 16,
          padding: 24,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <img
          src={MASCOT}
          alt="Mascot"
          style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
        />
        <div style={{ flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              background: "#AB47BC",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            INSTRUCTOR
          </span>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>
            Instructor Dashboard
          </h1>
          <p style={{ fontSize: 14, color: "#8892A4", margin: 0, marginTop: 4 }}>
            Manage your courses, schedule classes, and track student progress.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a href="/instructor/create-course" style={{ background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", textDecoration: "none", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 700 }}>+ Create course</a>
        <a href="/instructor/students" style={{ background: "#111827", color: "#E8EDF5", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>👥 Students</a>
        <a href="/instructor/certificates" style={{ background: "#111827", color: "#E8EDF5", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>🏆 Certificates</a>
        <a href="/instructor/schedule-class" style={{ background: "#111827", color: "#E8EDF5", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>📅 Schedule class</a>
        <a href="/instructor/submissions" style={{ background: "#111827", color: "#E8EDF5", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>📝 Submissions</a>
        <a href="/instructor/earnings" style={{ background: "#111827", color: "#E8EDF5", textDecoration: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 20px", fontSize: 13, fontWeight: 600 }}>💰 Earnings</a>
      </div>

      {/* My Courses */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
          My Courses {name ? `— ${name}` : ""}
        </h3>
        {courses.length === 0 ? (
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24, textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
              No courses yet. Click <b>+ Create Course</b> above or ask a super admin to seed demo data.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {courses.map((c, i) => (
              <div key={c.id} style={{ background: "#111827", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ height: 140, background: COURSE_GRADIENTS[i % COURSE_GRADIENTS.length], display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  <span style={{ fontSize: 48 }}>{COURSE_ICONS[c.category] || COURSE_ICONS.General}</span>
                  <span style={{ position: "absolute", top: 10, right: 10, background: "#66BB6A", color: "#fff", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, textTransform: "capitalize" }}>
                    {c.difficulty}
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "#E8EDF5", margin: "0 0 8px 0" }}>{c.title}</h4>
                  <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 8px 0" }}>
                    {c.totalEnrolled} student{c.totalEnrolled === 1 ? "" : "s"} · {c.totalModules} lesson{c.totalModules === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-column: Upcoming Classes + Recent Grades */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Upcoming Classes */}
        <div
          style={{
            background: "#111827",
            borderRadius: 16,
            padding: 24,
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
            Upcoming Classes
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { title: "Prompt Engineering \u2013 Module 7", time: "Today, 3:00 PM", enrolled: 32 },
              { title: "Design Sprint Workshop", time: "Tomorrow, 10:00 AM", enrolled: 28 },
            ].map((cls) => (
              <div
                key={cls.title}
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#E8EDF5" }}>{cls.title}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#fff",
                      background: "#66BB6A",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}
                  >
                    Starting Soon
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#8892A4" }}>
                  {cls.time} &middot; {cls.enrolled} enrolled
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Grades */}
        <div
          style={{
            background: "#111827",
            borderRadius: 16,
            padding: 24,
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#E8EDF5", margin: 0, marginBottom: 16 }}>
            Recent Grades
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { student: "Grace Adebayo", grade: "A", score: "95/100" },
              { student: "Chukwuemeka Obi", grade: "B+", score: "87/100" },
              { student: "Fatima Usman", grade: "A-", score: "91/100" },
            ].map((g) => (
              <div
                key={g.student}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 500 }}>{g.student}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#FFC107" }}>{g.grade}</span>
                  <span style={{ fontSize: 12, color: "#8892A4", marginLeft: 8 }}>{g.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ────────────── MODERATOR DASHBOARD ────────────── */


interface ModProps {
  stats?: { pending: number; warnings: number; resolvedToday: number };
  posts?: { id: string; title: string; author: string; community: string; createdAt: string; upvotes: number; downvotes: number; commentCount: number }[];
}

export function ModeratorDashboard({ stats, posts: postsProp }: ModProps = {}) {
  const s = stats ?? { pending: 0, warnings: 0, resolvedToday: 0 };
  const posts = postsProp ?? [];
  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(171,71,188,0.05))",
        border: "1px solid rgba(171,71,188,0.2)",
        borderRadius: 16, padding: 24, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <img src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png" alt="" style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
        <div>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(171,71,188,0.2)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>MODERATOR</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Moderation Queue</h1>
          <p style={{ fontSize: 13, color: "#8892A4" }}>Review reported content and manage user warnings.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { value: s.pending.toString(), label: "Recent Posts", color: "#EF5350" },
          { value: s.warnings.toString(), label: "Warnings Issued", color: "#FFC107" },
          { value: s.resolvedToday.toString(), label: "Resolved Today", color: "#66BB6A" },
        ].map(s => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#8892A4", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 12 }}>Recent Community Posts</h3>
        {posts.length === 0 && (
          <p style={{ fontSize: 13, color: "#8892A4" }}>No community posts yet. When the community is active, recent posts will appear here for review.</p>
        )}
        {posts.map((p, i) => (
          <div key={p.id} style={{
            padding: "14px 0",
            borderBottom: i < posts.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "#8892A4" }}>
                {p.author} · {p.community || "Community"} · ↑{p.upvotes} ↓{p.downvotes} · 💬 {p.commentCount}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ background: "#FFC107", color: "#000", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Pin</button>
              <button style={{ background: "#EF5350", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Lock</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────── FINANCE DASHBOARD ────────────── */


interface FinanceProps {
  stats?: { totalRevenue: number; totalPayouts: number; finesCollected: number; pendingPayouts: number };
  transactions?: { id: string; date: string; user: string; type: string; amount: number; }[];
}

export function FinanceDashboard({ stats, transactions: txProp }: FinanceProps = {}) {
  const s = stats ?? { totalRevenue: 0, totalPayouts: 0, finesCollected: 0, pendingPayouts: 0 };
  const transactions = txProp ?? [];
  const fmt = (n: number) => `\u20A6${Math.abs(n).toLocaleString()}`;
  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, rgba(102,187,106,0.12), rgba(102,187,106,0.04))",
        border: "1px solid rgba(102,187,106,0.2)",
        borderRadius: 16, padding: 24, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <img src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png" alt="" style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
        <div>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(102,187,106,0.2)", color: "#66BB6A", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>FINANCE</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Financial Overview</h1>
          <p style={{ fontSize: 13, color: "#8892A4" }}>Manage transactions, payouts, and revenue.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { value: fmt(s.totalRevenue), label: "Total Revenue", color: "#66BB6A" },
          { value: fmt(s.totalPayouts), label: "Payouts Made", color: "#1E88E5" },
          { value: fmt(s.finesCollected), label: "Fines Collected", color: "#FFC107" },
          { value: fmt(s.pendingPayouts), label: "Pending Payouts", color: "#AB47BC" },
        ].map(s => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#8892A4", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", padding: "20px 20px 16px" }}>Recent Transactions</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr", padding: "12px 20px", background: "rgba(255,255,255,0.03)", fontSize: 11, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>
          <div>Date</div><div>User</div><div>Type</div><div>Amount</div><div>Status</div>
        </div>
        {transactions.length === 0 && (
          <div style={{ padding: "20px 20px 24px", fontSize: 13, color: "#8892A4", textAlign: "center" }}>
            No transactions yet. Seed demo data or wait for real payments.
          </div>
        )}
        {transactions.map((t, i) => {
          const isCredit = t.type === "credit" || t.type === "reward" || t.type === "refund";
          const color = isCredit ? "#66BB6A" : t.type === "fine" ? "#FFC107" : "#EF5350";
          return (
            <div key={t.id} style={{
              display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr",
              padding: "14px 20px", fontSize: 13, color: "#E8EDF5",
              borderBottom: i < transactions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              alignItems: "center",
            }}>
              <div style={{ color: "#8892A4" }}>{t.date}</div>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.user}</div>
              <div style={{ color: "#8892A4", textTransform: "capitalize" }}>{t.type}</div>
              <div style={{ color, fontWeight: 700 }}>
                {isCredit ? "+" : "-"}{fmt(t.amount)}
              </div>
              <div>
                <span style={{
                  padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  background: "rgba(102,187,106,0.2)", color: "#66BB6A",
                }}>Settled</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────── SUPPORT DASHBOARD ────────────── */


interface SupportProps {
  stats?: { open: number; inProgress: number; resolved: number };
  tickets?: { id: string; priority: "Urgent" | "Medium" | "Low"; title: string; user: string; time: string }[];
}

export function SupportDashboard({ stats, tickets: ticketsProp }: SupportProps = {}) {
  const s = stats ?? { open: 0, inProgress: 0, resolved: 0 };
  const tickets = ticketsProp ?? [];
  return (
    <div>
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(171,71,188,0.05))",
        border: "1px solid rgba(171,71,188,0.2)",
        borderRadius: 16, padding: 24, marginBottom: 20,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <img src="https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png" alt="" style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
        <div>
          <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(171,71,188,0.2)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>SUPPORT</span>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4 }}>Support Tickets</h1>
          <p style={{ fontSize: 13, color: "#8892A4" }}>Help interns resolve issues and manage accounts.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[
          { value: s.open.toString(), label: "Open Tickets", color: "#EF5350" },
          { value: s.inProgress.toString(), label: "In Progress", color: "#FFC107" },
          { value: s.resolved.toString(), label: "Resolved", color: "#66BB6A" },
        ].map(s => (
          <div key={s.label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#8892A4", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#E8EDF5", marginBottom: 12 }}>Open Tickets</h3>
        {tickets.length === 0 && (
          <p style={{ fontSize: 13, color: "#8892A4" }}>No open tickets. When users raise warnings/errors, they&apos;ll appear here.</p>
        )}
        {tickets.map((t, i) => {
          const priorityColor = t.priority === "Urgent" ? "#EF5350" : t.priority === "Medium" ? "#FFC107" : "#1E88E5";
          return (
            <div key={t.id} style={{
              padding: "16px 0",
              borderBottom: i < tickets.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                    background: `${priorityColor}33`, color: priorityColor, textTransform: "uppercase", letterSpacing: 0.5,
                  }}>{t.priority}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{t.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "#8892A4" }}>{t.user} — {t.time}</div>
              </div>
              <button style={{
                background: "#1E88E5", color: "#fff", border: "none", borderRadius: 8,
                padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>Take Ticket</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
