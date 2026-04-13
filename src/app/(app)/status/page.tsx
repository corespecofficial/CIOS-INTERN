"use client";
/* eslint-disable @next/next/no-img-element */

import toast from "react-hot-toast";

const COLORS = {
  blue: "#1E88E5",
  gold: "#FFC107",
  green: "#66BB6A",
  red: "#EF5350",
  purple: "#AB47BC",
  orange: "#FF7043",
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.07)",
};

const LOGO =
  "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

type ServiceStatus = "Operational" | "Maintenance" | "Down";

interface Service {
  name: string;
  status: ServiceStatus;
  uptime: string;
  response: string;
}

const SERVICES: Service[] = [
  { name: "Authentication (Clerk)", status: "Operational", uptime: "100%", response: "45ms" },
  { name: "Database (Supabase)", status: "Operational", uptime: "99.98%", response: "78ms" },
  { name: "Real-time Messaging (Ably)", status: "Operational", uptime: "99.99%", response: "32ms" },
  { name: "File Storage (Cloudinary)", status: "Operational", uptime: "100%", response: "56ms" },
  { name: "Payments (Paystack)", status: "Maintenance", uptime: "—", response: "—" },
  { name: "AI Copilot", status: "Operational", uptime: "99.95%", response: "420ms" },
  { name: "Email Delivery", status: "Operational", uptime: "100%", response: "1.2s" },
  { name: "CDN", status: "Operational", uptime: "100%", response: "18ms" },
];

const INCIDENTS = [
  { date: "Apr 5, 2026", title: "Payment delays", severity: "Minor", resolved: "Resolved in 2h 15m", color: COLORS.orange },
  { date: "Mar 28, 2026", title: "Messaging lag", severity: "Minor", resolved: "Resolved in 45m", color: COLORS.orange },
  { date: "Mar 15, 2026", title: "Scheduled maintenance", severity: "Info", resolved: "Completed as planned", color: COLORS.blue },
];

function statusColor(s: ServiceStatus) {
  if (s === "Operational") return COLORS.green;
  if (s === "Maintenance") return COLORS.gold;
  return COLORS.red;
}

function statusIcon(s: ServiceStatus) {
  if (s === "Operational") return "●";
  if (s === "Maintenance") return "⚠";
  return "✕";
}

function statusLabel(s: ServiceStatus) {
  if (s === "Operational") return "Operational";
  if (s === "Maintenance") return "Under Maintenance";
  return "Down";
}

export default function StatusPage() {
  const lastUpdated = "Apr 12, 2026 · 10:42 WAT";

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, padding: 24 }}>
      {/* Banner */}
      <div
        style={{
          borderRadius: 20,
          padding: "28px 32px",
          background: `linear-gradient(135deg, ${COLORS.green}33 0%, ${COLORS.blue}15 100%)`,
          border: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <img src={LOGO} alt="CIOS" style={{ width: 80, height: 80, objectFit: "contain", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 999,
              background: `${COLORS.green}33`,
              color: COLORS.green,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.2,
              marginBottom: 10,
            }}
          >
            SYSTEM STATUS
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: COLORS.green }}>
            All Systems Operational
          </h1>
          <p style={{ margin: "4px 0 0", color: COLORS.dim, fontSize: 14 }}>
            Last updated: {lastUpdated}
          </p>
        </div>
      </div>

      {/* Overall status */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 28,
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `${COLORS.green}22`,
            border: `3px solid ${COLORS.green}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            color: COLORS.green,
            fontWeight: 800,
          }}
        >
          ✓
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.green }}>All Services Running</div>
          <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 4 }}>
            99.97% uptime (90 days)
          </div>
        </div>
      </div>

      {/* Services list */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Services</h2>
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {SERVICES.map((s, i) => {
          const c = statusColor(s.status);
          return (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: i < SERVICES.length - 1 ? `1px solid ${COLORS.border}` : "none",
                gap: 16,
              }}
            >
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{s.name}</div>
              <span
                style={{
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: `${c}22`,
                  color: c,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{statusIcon(s.status)}</span>
                {statusLabel(s.status)}
              </span>
              <div style={{ width: 80, textAlign: "right", fontSize: 13, color: COLORS.dim }}>
                {s.uptime}
              </div>
              <div style={{ width: 70, textAlign: "right", fontSize: 13, color: COLORS.dim }}>
                {s.response}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheduled maintenance */}
      <div
        style={{
          background: `${COLORS.gold}11`,
          border: `1px solid ${COLORS.gold}44`,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontSize: 28 }}>🔧</div>
        <div>
          <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>
            Scheduled Maintenance
          </div>
          <div style={{ fontSize: 13, color: COLORS.text }}>
            Paystack integration upgrade — Apr 15, 2026 at 2:00 AM WAT · Expected downtime: 30 min
          </div>
        </div>
      </div>

      {/* Recent incidents */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px" }}>Recent Incidents</h2>
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        {INCIDENTS.map((inc, i) => (
          <div
            key={inc.title}
            style={{
              padding: "16px 20px",
              borderBottom: i < INCIDENTS.length - 1 ? `1px solid ${COLORS.border}` : "none",
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ width: 110, fontSize: 12, color: COLORS.dim }}>{inc.date}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.title}</div>
              <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{inc.resolved}</div>
            </div>
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: `${inc.color}22`,
                color: inc.color,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {inc.severity}
            </span>
          </div>
        ))}
      </div>

      {/* Version card */}
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${COLORS.purple}22`,
            color: COLORS.purple,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          🚀
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>CIOS v2.1.0</div>
          <div style={{ fontSize: 12, color: COLORS.dim }}>Latest update: Apr 10, 2026</div>
        </div>
        <button
          onClick={() => toast("Opening changelog…", { icon: "📜" })}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            background: "transparent",
            border: `1px solid ${COLORS.purple}55`,
            color: COLORS.purple,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          View changelog
        </button>
      </div>
    </div>
  );
}
