"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SystemIncident, SystemMaintenance } from "@/app/actions/system-status";
import {
  createIncident,
  createMaintenance,
} from "@/app/actions/system-status";

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

type ServiceStatus = "operational" | "degraded" | "unknown";

interface ServiceResult {
  name: string;
  status: ServiceStatus;
  responseMs?: number;
}

interface Props {
  services: ServiceResult[];
  incidents: SystemIncident[];
  maintenance: SystemMaintenance[];
  checkedAt: string | null;
  isAdmin: boolean;
  allOperational: boolean;
}

function serviceStatusColor(s: ServiceStatus) {
  if (s === "operational") return COLORS.green;
  if (s === "degraded") return COLORS.red;
  return COLORS.dim;
}

function serviceStatusIcon(s: ServiceStatus) {
  if (s === "operational") return "●";
  if (s === "degraded") return "✕";
  return "●";
}

function serviceStatusLabel(s: ServiceStatus) {
  if (s === "operational") return "Operational";
  if (s === "degraded") return "Degraded";
  return "Unknown";
}

function severityColor(severity: string) {
  if (severity === "critical") return COLORS.red;
  if (severity === "major") return COLORS.orange;
  if (severity === "minor") return COLORS.gold;
  return COLORS.blue;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ── Add Incident Modal ──────────────────────────────────────────────────────

function AddIncidentForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "minor" as "info" | "minor" | "major" | "critical",
    status: "investigating" as "investigating" | "monitoring" | "resolved",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createIncident({
        title: form.title,
        description: form.description || undefined,
        severity: form.severity,
        status: form.status,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 480,
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Add Incident</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="Brief incident title"
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Optional details"
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Severity</label>
              <select name="severity" value={form.severity} onChange={handleChange} style={inputStyle}>
                <option value="info">Info</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                <option value="investigating">Investigating</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
          {error && <p style={{ color: COLORS.red, fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={pending}>
              Cancel
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={pending}>
              {pending ? "Creating…" : "Create Incident"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Schedule Maintenance Modal ──────────────────────────────────────────────

function ScheduleMaintenanceForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    expected_duration_min: "30",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const duration = parseInt(form.expected_duration_min, 10);
    if (isNaN(duration) || duration < 1) {
      setError("Duration must be a positive number");
      return;
    }
    startTransition(async () => {
      const res = await createMaintenance({
        title: form.title,
        description: form.description || undefined,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        expected_duration_min: duration,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 480,
        }}
      >
        <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>
          Schedule Maintenance
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="Maintenance title"
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Optional details"
            />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Scheduled Date & Time *</label>
              <input
                name="scheduled_at"
                type="datetime-local"
                value={form.scheduled_at}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Duration (min) *</label>
              <input
                name="expected_duration_min"
                type="number"
                min="1"
                value={form.expected_duration_min}
                onChange={handleChange}
                required
                style={inputStyle}
              />
            </div>
          </div>
          {error && <p style={{ color: COLORS.red, fontSize: 13, margin: 0 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle} disabled={pending}>
              Cancel
            </button>
            <button type="submit" style={primaryBtnStyle} disabled={pending}>
              {pending ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "#0A0E1A",
  color: COLORS.text,
  fontSize: 14,
  boxSizing: "border-box",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: COLORS.dim,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  background: COLORS.blue,
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  border: "none",
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 8,
  background: "transparent",
  color: COLORS.dim,
  fontWeight: 600,
  fontSize: 14,
  border: `1px solid ${COLORS.border}`,
  cursor: "pointer",
};

// ── Main component ──────────────────────────────────────────────────────────

export default function StatusClient({
  services,
  incidents,
  maintenance,
  checkedAt,
  isAdmin,
  allOperational,
}: Props) {
  const router = useRouter();
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  function handleFormSuccess() {
    setShowIncidentForm(false);
    setShowMaintenanceForm(false);
    router.refresh();
  }

  const issueCount = services.filter((s) => s.status !== "operational").length;
  const bannerColor = allOperational ? COLORS.green : issueCount >= 3 ? COLORS.red : COLORS.gold;
  const bannerText = allOperational
    ? "All Systems Operational"
    : `${issueCount} Service${issueCount > 1 ? "s" : ""} Affected`;

  const lastUpdatedLabel = checkedAt
    ? formatDate(checkedAt)
    : "—";

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, padding: 24 }}>
      <style>{`
        .st-banner {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .st-banner-logo {
          width: 80px;
          height: 80px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .st-admin-btns {
          display: flex;
          gap: 10px;
          flex-shrink: 0;
        }
        .st-status-card {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .st-svc-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .st-svc-ms {
          width: 70px;
          text-align: right;
          font-size: 13px;
          color: ${COLORS.dim};
          flex-shrink: 0;
        }
        .st-inc-row {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .st-inc-date {
          width: 130px;
          font-size: 12px;
          color: ${COLORS.dim};
          flex-shrink: 0;
          padding-top: 2px;
        }
        @media (max-width: 600px) {
          .st-banner { flex-direction: column; align-items: flex-start; gap: 14px; padding: 20px 18px !important; }
          .st-banner-logo { width: 52px; height: 52px; }
          .st-banner h1 { font-size: 20px !important; }
          .st-admin-btns { flex-wrap: wrap; width: 100%; }
          .st-admin-btns button { flex: 1; min-width: 0; font-size: 12px !important; padding: 9px 10px !important; }
          .st-status-card { gap: 14px; }
          .st-status-card > div:first-child { width: 52px !important; height: 52px !important; font-size: 26px !important; }
          .st-svc-row { gap: 10px; }
          .st-svc-ms { display: none; }
          .st-inc-row { flex-direction: column; gap: 8px; }
          .st-inc-date { width: auto; padding-top: 0; }
          .st-inc-row > div:last-child { flex-direction: row !important; align-items: center !important; gap: 6px !important; }
        }
      `}</style>
      {/* Modals */}
      {showIncidentForm && (
        <AddIncidentForm
          onClose={() => setShowIncidentForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}
      {showMaintenanceForm && (
        <ScheduleMaintenanceForm
          onClose={() => setShowMaintenanceForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Banner */}
      <div
        className="st-banner"
        style={{
          borderRadius: 20,
          padding: "28px 32px",
          background: `linear-gradient(135deg, ${bannerColor}33 0%, ${COLORS.blue}15 100%)`,
          border: `1px solid ${COLORS.border}`,
          marginBottom: 24,
        }}
      >
        <img
          src={LOGO}
          alt="CIOS"
          className="st-banner-logo"
          style={{ objectFit: "contain", flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 12px",
              borderRadius: 999,
              background: `${bannerColor}33`,
              color: bannerColor,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.2,
              marginBottom: 10,
            }}
          >
            SYSTEM STATUS
          </span>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: bannerColor }}>
            {bannerText}
          </h1>
          <p style={{ margin: "4px 0 0", color: COLORS.dim, fontSize: 14 }}>
            Last updated: {lastUpdatedLabel}
          </p>
        </div>
        {isAdmin && (
          <div className="st-admin-btns">
            <button
              onClick={() => setShowIncidentForm(true)}
              style={{
                ...primaryBtnStyle,
                background: COLORS.red,
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              + Add Incident
            </button>
            <button
              onClick={() => setShowMaintenanceForm(true)}
              style={{
                ...primaryBtnStyle,
                background: COLORS.gold,
                color: "#000",
                fontSize: 13,
                whiteSpace: "nowrap",
              }}
            >
              + Schedule Maintenance
            </button>
          </div>
        )}
      </div>

      {/* Overall status summary */}
      <div
        className="st-status-card"
        style={{
          background: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: `${bannerColor}22`,
            border: `3px solid ${bannerColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            color: bannerColor,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {allOperational ? "✓" : "!"}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: bannerColor }}>
            {allOperational ? "All Services Running" : `${issueCount} Issue${issueCount > 1 ? "s" : ""} Detected`}
          </div>
          <div style={{ fontSize: 13, color: COLORS.dim, marginTop: 4 }}>
            {services.length > 0
              ? `${services.filter((s) => s.status === "operational").length} / ${services.length} services operational`
              : "Fetching service status…"}
          </div>
        </div>
      </div>

      {/* Upcoming maintenance */}
      {maintenance.length > 0 ? (
        <>
          {maintenance.map((m) => (
            <div
              key={m.id}
              style={{
                background: `${COLORS.gold}11`,
                border: `1px solid ${COLORS.gold}44`,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ fontSize: 28, flexShrink: 0 }}>🔧</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: COLORS.gold, marginBottom: 4 }}>
                  {m.status === "in_progress" ? "Maintenance In Progress" : "Scheduled Maintenance"}
                </div>
                <div style={{ fontSize: 13, color: COLORS.text }}>
                  {m.title} — {formatDate(m.scheduled_at)} · Expected downtime: {m.expected_duration_min} min
                </div>
                {m.description && (
                  <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 4 }}>{m.description}</div>
                )}
              </div>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: `${COLORS.gold}22`,
                  color: COLORS.gold,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {m.status === "in_progress" ? "In Progress" : "Upcoming"}
              </span>
            </div>
          ))}
        </>
      ) : (
        <div
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: COLORS.dim,
            fontSize: 14,
          }}
        >
          <span style={{ fontSize: 20 }}>🔧</span>
          No scheduled maintenance
        </div>
      )}

      {/* Services grid */}
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
        {services.length === 0 ? (
          <div style={{ padding: "20px", color: COLORS.dim, fontSize: 14 }}>
            Unable to fetch service status.
          </div>
        ) : (
          services.map((s, i) => {
            const c = serviceStatusColor(s.status);
            return (
              <div
                key={s.name}
                className="st-svc-row"
                style={{
                  padding: "16px 20px",
                  borderBottom: i < services.length - 1 ? `1px solid ${COLORS.border}` : "none",
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
                  <span style={{ fontSize: 10 }}>{serviceStatusIcon(s.status)}</span>
                  {serviceStatusLabel(s.status)}
                </span>
                <div className="st-svc-ms">
                  {s.responseMs != null ? `${s.responseMs}ms` : "—"}
                </div>
              </div>
            );
          })
        )}
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
        {incidents.length === 0 ? (
          <div
            style={{
              padding: "24px 20px",
              color: COLORS.dim,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>✅</span>
            No recent incidents
          </div>
        ) : (
          incidents.map((inc, i) => {
            const c = severityColor(inc.severity);
            return (
              <div
                key={inc.id}
                className="st-inc-row"
                style={{
                  padding: "16px 20px",
                  borderBottom: i < incidents.length - 1 ? `1px solid ${COLORS.border}` : "none",
                }}
              >
                <div className="st-inc-date">
                  {formatDate(inc.created_at)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{inc.title}</div>
                  {inc.description && (
                    <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 2 }}>{inc.description}</div>
                  )}
                  {inc.status === "resolved" && inc.resolution_note && (
                    <div style={{ fontSize: 12, color: COLORS.green, marginTop: 4 }}>
                      Resolution: {inc.resolution_note}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: COLORS.dim, marginTop: 4, textTransform: "capitalize" }}>
                    {inc.status === "resolved" && inc.resolved_at
                      ? `Resolved · ${formatDate(inc.resolved_at)}`
                      : inc.status}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: `${c}22`,
                      color: c,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "capitalize",
                    }}
                  >
                    {inc.severity}
                  </span>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: inc.status === "resolved"
                        ? `${COLORS.green}22`
                        : inc.status === "monitoring"
                        ? `${COLORS.gold}22`
                        : `${COLORS.orange}22`,
                      color: inc.status === "resolved"
                        ? COLORS.green
                        : inc.status === "monitoring"
                        ? COLORS.gold
                        : COLORS.orange,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "capitalize",
                    }}
                  >
                    {inc.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
