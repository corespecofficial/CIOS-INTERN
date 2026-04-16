"use client";

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  listTalentAlerts, createTalentAlert, updateTalentAlert, deleteTalentAlert,
  type TalentAlert, type AlertFilters,
} from "@/app/actions/talent-alerts";

const TRACKS = ["Design", "Development", "Marketing", "Data", "Video", "Copywriting", "AI", "Finance", "Other"];

export function TalentAlertsPanel() {
  const [alerts, setAlerts] = useState<TalentAlert[]>([]);
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  // form state
  const [label, setLabel] = useState("New Alert");
  const [track, setTrack] = useState("");
  const [minScore, setMinScore] = useState(70);
  const [minLevel, setMinLevel] = useState(1);
  const [skills, setSkills] = useState("");

  useEffect(() => {
    listTalentAlerts().then((r) => { if (r.ok) setAlerts(r.data!); });
  }, []);

  const refresh = () => listTalentAlerts().then((r) => { if (r.ok) setAlerts(r.data!); });

  const handleCreate = () => start(async () => {
    const filters: AlertFilters = {
      ...(track && { track }),
      min_score: minScore,
      min_level: minLevel > 1 ? minLevel : undefined,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    };
    const r = await createTalentAlert(label, filters);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Alert created — you'll be notified when matching talent is available.");
    setShowForm(false);
    setLabel("New Alert"); setTrack(""); setMinScore(70); setMinLevel(1); setSkills("");
    refresh();
  });

  const handleToggle = (id: string, current: boolean) => start(async () => {
    await updateTalentAlert(id, { is_active: !current });
    refresh();
  });

  const handleDelete = (id: string) => start(async () => {
    if (!confirm("Delete this alert?")) return;
    await deleteTalentAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    toast.success("Alert deleted");
  });

  const activeCount = alerts.filter((a) => a.is_active).length;

  return (
    <div style={{ marginTop: 20 }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        background: open ? "rgba(255,193,7,0.12)" : "#111827",
        border: `1px solid ${open ? "rgba(255,193,7,0.35)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 12, color: open ? "#FFC107" : "#E8EDF5",
        fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", justifyContent: "space-between",
      }}>
        <span>🔔 Talent Alerts {activeCount > 0 && <span style={{ marginLeft: 6, padding: "1px 7px", background: "rgba(255,193,7,0.2)", borderRadius: 99, fontSize: 11, color: "#FFC107" }}>{activeCount} active</span>}</span>
        <span style={{ fontSize: 12, color: "#8892A4" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ background: "#0D1420", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "0 0 12px 12px", padding: 16, marginTop: -1 }}>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 12px" }}>
            Get notified instantly when an intern matching your criteria joins or levels up.
          </p>

          {/* Existing alerts */}
          {alerts.length === 0 && !showForm && (
            <p style={{ fontSize: 12, color: "#5A6478", padding: "12px 0" }}>No alerts yet. Create one below.</p>
          )}
          {alerts.map((a) => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 8,
            }}>
              <button onClick={() => handleToggle(a.id, a.is_active)} style={{
                width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                background: a.is_active ? "#FFC107" : "#374151", position: "relative", flexShrink: 0,
                transition: "background 0.2s",
              }}>
                <span style={{
                  position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  left: a.is_active ? 18 : 2, transition: "left 0.2s",
                }} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{a.label}</div>
                <div style={{ fontSize: 11, color: "#8892A4", marginTop: 1 }}>
                  {[
                    a.filters.track && `Track: ${a.filters.track}`,
                    a.filters.min_score && `Score ≥ ${a.filters.min_score}%`,
                    a.filters.min_level && a.filters.min_level > 1 && `Level ≥ ${a.filters.min_level}`,
                    a.filters.skills?.length && `Skills: ${a.filters.skills.join(", ")}`,
                  ].filter(Boolean).join(" · ") || "Any intern"}
                </div>
              </div>
              {a.last_notified_at && (
                <span style={{ fontSize: 10, color: "#5A6478", whiteSpace: "nowrap" }}>
                  Last: {new Date(a.last_notified_at).toLocaleDateString()}
                </span>
              )}
              <button onClick={() => handleDelete(a.id)} style={{ background: "transparent", border: "none", color: "#EF5350", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>×</button>
            </div>
          ))}

          {/* Create form */}
          {showForm ? (
            <div style={{ background: "#111827", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 12, padding: 14, marginTop: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 12 }}>New Talent Alert</div>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <label style={lbl}>Alert name</label>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} style={inp} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={lbl}>Track (optional)</label>
                    <select value={track} onChange={(e) => setTrack(e.target.value)} style={inp}>
                      <option value="">Any track</option>
                      {TRACKS.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Min performance score: {minScore}%</label>
                    <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(+e.target.value)}
                      style={{ width: "100%", accentColor: "#FFC107" }} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Required skills (comma-separated, optional)</label>
                  <input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. React, Figma, SEO" style={inp} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowForm(false)} style={btnGhost}>Cancel</button>
                  <button onClick={handleCreate} disabled={pending} style={btnYellow}>{pending ? "Saving…" : "🔔 Create alert"}</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForm(true)} style={btnYellow}>+ New alert</button>
          )}
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, cursor: "pointer" };
const btnYellow: React.CSSProperties = { padding: "8px 14px", background: "rgba(255,193,7,0.15)", color: "#FFC107", border: "1px solid rgba(255,193,7,0.35)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
