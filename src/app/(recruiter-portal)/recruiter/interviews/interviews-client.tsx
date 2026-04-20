"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateInterview } from "@/app/actions/recruiter";

interface Interview {
  id: string; scheduled_at: string; duration_minutes: number; mode: string; meeting_link: string | null; location: string | null; note: string | null; status: string;
  application: {
    id: string; status: string;
    applicant: { id: string; name: string; email: string; avatar_url: string | null } | null;
    opportunity: { id: string; title: string } | null;
  } | null;
}

const STATUS_COLOR: Record<string, string> = { scheduled: "#1E88E5", completed: "#66BB6A", cancelled: "#8892A4", no_show: "#EF5350" };

export function InterviewsClient({ interviews }: { interviews: Array<Record<string, unknown>> }) {
  const [rows, setRows] = useState<Interview[]>(interviews as unknown as Interview[]);
  const [tab, setTab] = useState<"upcoming" | "past" | "all">("upcoming");
  const [pending, start] = useTransition();

  const now = Date.now();
  const upcoming = rows.filter((i) => new Date(i.scheduled_at).getTime() >= now && i.status === "scheduled");
  const past = rows.filter((i) => new Date(i.scheduled_at).getTime() < now || i.status !== "scheduled");
  const display = tab === "all" ? rows : tab === "upcoming" ? upcoming : past;

  const onUpdate = (id: string, patch: { status?: string; note?: string; meetingLink?: string }) => start(async () => {
    const res = await updateInterview(id, patch);
    if (!res.ok) return toast.error(res.error);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...(patch.status ? { status: patch.status } : {}), ...(patch.meetingLink !== undefined ? { meeting_link: patch.meetingLink } : {}), ...(patch.note !== undefined ? { note: patch.note } : {}) } : r));
    toast.success("Updated");
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        {[{ k: "upcoming", label: `Upcoming (${upcoming.length})` }, { k: "past", label: `Past (${past.length})` }, { k: "all", label: `All (${rows.length})` }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as "upcoming" | "past" | "all")} style={{
            flex: 1, padding: "8px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(30,136,229,0.15)" : "transparent",
            color: tab === t.k ? "#1E88E5" : "#8892A4",
            border: "none",
          }}>{t.label}</button>
        ))}
      </div>

      {display.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          No interviews {tab === "upcoming" ? "scheduled" : tab === "past" ? "completed yet" : "yet"}. Schedule one from an applicant in <a href="/recruiter/opportunities" style={{ color: "#1E88E5" }}>Opportunities</a>.
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {display.map((iv) => {
          const when = new Date(iv.scheduled_at);
          const applicant = iv.application?.applicant;
          return (
            <div key={iv.id} style={{ background: "#111827", border: `1px solid ${STATUS_COLOR[iv.status] || "#8892A4"}33`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                {applicant?.avatar_url
                  ? <img src={applicant.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>{applicant?.name?.slice(0, 1) || "?"}</div>}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{applicant?.name || "Unknown"}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${STATUS_COLOR[iv.status] || "#8892A4"}22`, color: STATUS_COLOR[iv.status] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{iv.status.replace("_", " ")}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: "rgba(255,255,255,0.06)", color: "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{iv.mode}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8892A4", marginTop: 3 }}>{iv.application?.opportunity?.title || "(deleted listing)"}</div>
                  <div style={{ fontSize: 13, color: "#E8EDF5", marginTop: 6, fontWeight: 600 }}>
                    📅 {when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {iv.duration_minutes}m
                  </div>
                  {iv.meeting_link && <div style={{ fontSize: 12, marginTop: 4 }}>🔗 <a href={iv.meeting_link} target="_blank" rel="noreferrer" style={{ color: "#1E88E5" }}>Join meeting</a></div>}
                  {iv.location && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>📍 {iv.location}</div>}
                  {iv.note && <div style={{ fontSize: 12, color: "#E8EDF5", marginTop: 6, padding: 8, background: "#0A0E1A", borderRadius: 6 }}>📝 {iv.note}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {iv.status === "scheduled" && (
                    <>
                      <button onClick={() => onUpdate(iv.id, { status: "completed" })} disabled={pending} style={btnSuccess}>✓ Completed</button>
                      <button onClick={() => onUpdate(iv.id, { status: "no_show" })} disabled={pending} style={btnGhost}>No-show</button>
                      <button onClick={() => onUpdate(iv.id, { status: "cancelled" })} disabled={pending} style={btnDanger}>Cancel</button>
                    </>
                  )}
                  {iv.status !== "scheduled" && (
                    <button onClick={() => onUpdate(iv.id, { status: "scheduled" })} disabled={pending} style={btnGhost}>Reopen</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnSuccess: React.CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "rgba(102,187,106,0.15)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 8, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 8, cursor: "pointer" };
