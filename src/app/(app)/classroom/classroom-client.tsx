"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { ClassSessionRow, HomeTask, HomeActivityItem, MaterialRow } from "@/lib/db";
import { toggleRsvp, markJoined, updateSessionStatus, deleteSession } from "@/app/actions/classes";
import { addMaterial, deleteMaterial, setSessionReplay } from "@/app/actions/classroom-extras";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";

interface ClassroomPanels {
  todaysTasks: HomeTask[];
  activity: HomeActivityItem[];
  continueLearning: { id: string; title: string; progress: number; thumbnailUrl: string | null; category: string }[];
  rewards: { xp: number; streak: number; level: number; rank: string; performance: number };
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const today = new Date().toDateString();
  const tomorrow = new Date(Date.now() + 86400000).toDateString();
  const day = d.toDateString();
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (day === today) return `Today, ${time}`;
  if (day === tomorrow) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

function initialsOf(name: string | null): string {
  if (!name) return "?";
  return (name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
}

function isLiveWindow(s: ClassSessionRow): boolean {
  const now = Date.now();
  const start = new Date(s.scheduled_at).getTime();
  const end = start + s.duration_minutes * 60000;
  // Accept "live" as manually flipped, or auto-live within the window
  return s.status === "live" || (now >= start - 5 * 60000 && now <= end + 15 * 60000);
}

export function ClassroomClient({ sessions: initial, canInstruct, panels }: { sessions: ClassSessionRow[]; canInstruct: boolean; panels: ClassroomPanels }) {
  const [sessions, setSessions] = useState<ClassSessionRow[]>(initial);
  const [tab, setTab] = useState<"upcoming" | "live" | "past" | "mine">("upcoming");

  const now = Date.now();
  const partitioned = useMemo(() => {
    const upcoming: ClassSessionRow[] = [];
    const live: ClassSessionRow[] = [];
    const past: ClassSessionRow[] = [];
    const mine: ClassSessionRow[] = [];
    for (const s of sessions) {
      const start = new Date(s.scheduled_at).getTime();
      const end = start + s.duration_minutes * 60000;
      if (s.is_mine) mine.push(s);
      if (s.status === "cancelled") continue;
      if (isLiveWindow(s) && s.status !== "completed") live.push(s);
      else if (end < now || s.status === "completed") past.push(s);
      else upcoming.push(s);
    }
    return { upcoming, live, past, mine };
  }, [sessions, now]);

  const activeList = tab === "upcoming" ? partitioned.upcoming
    : tab === "live" ? partitioned.live
    : tab === "past" ? partitioned.past
    : partitioned.mine;

  async function onRsvp(s: ClassSessionRow) {
    const r = await toggleRsvp(s.id);
    if (!r.ok) { toast.error(r.error); return; }
    setSessions((prev) => prev.map((x) => x.id === s.id ? { ...x, i_rsvped: r.data!.rsvped, attendee_count: r.data!.attendeeCount } : x));
    toast.success(r.data!.rsvped ? "You're in. See you there." : "RSVP removed");
  }

  async function onJoin(s: ClassSessionRow) {
    if (!s.meeting_url) { toast.error("Instructor hasn't set a meeting link yet"); return; }
    await markJoined(s.id);
    window.open(s.meeting_url, "_blank", "noopener");
  }

  async function onGoLive(s: ClassSessionRow) {
    const r = await updateSessionStatus(s.id, s.status === "live" ? "scheduled" : "live");
    if (!r.ok) { toast.error(r.error); return; }
    setSessions((prev) => prev.map((x) => x.id === s.id ? { ...x, status: s.status === "live" ? "scheduled" : "live" } : x));
    toast.success(s.status === "live" ? "Class no longer live" : "Class is now live");
  }

  async function onEnd(s: ClassSessionRow) {
    if (!confirm("Mark class as ended?")) return;
    const r = await updateSessionStatus(s.id, "completed");
    if (!r.ok) { toast.error(r.error); return; }
    setSessions((prev) => prev.map((x) => x.id === s.id ? { ...x, status: "completed" } : x));
    toast.success("Class ended");
  }

  async function onDelete(s: ClassSessionRow) {
    if (!confirm(`Delete "${s.title}"?`)) return;
    const r = await deleteSession(s.id);
    if (!r.ok) { toast.error(r.error); return; }
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    toast.success("Class deleted");
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "flex-start" }}>
      <style>{`@media (max-width: 960px) { main[data-classroom-grid] { grid-template-columns: 1fr !important; } }`}</style>
      <div>
      <div style={{
        background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(171,71,188,0.08))",
        border: "1px solid rgba(30,136,229,0.2)",
        borderRadius: 18, padding: "20px 24px", marginBottom: 18,
        display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ fontSize: 36 }}>🎓</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.18)", color: "#1E88E5", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>
            LIVE CLASSROOM
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Classes</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>
            {partitioned.live.length > 0 && <span style={{ color: "#66BB6A", fontWeight: 700 }}>🔴 {partitioned.live.length} live now · </span>}
            {partitioned.upcoming.length} upcoming · {partitioned.past.length} past
          </p>
        </div>
        {canInstruct && (
          <Link href="/instructor/schedule-class" style={btnPrimary}>+ Schedule class</Link>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <TabBtn active={tab === "upcoming"} onClick={() => setTab("upcoming")}>📅 Upcoming ({partitioned.upcoming.length})</TabBtn>
        <TabBtn active={tab === "live"} onClick={() => setTab("live")}>🔴 Live ({partitioned.live.length})</TabBtn>
        <TabBtn active={tab === "past"} onClick={() => setTab("past")}>✓ Past ({partitioned.past.length})</TabBtn>
        {canInstruct && <TabBtn active={tab === "mine"} onClick={() => setTab("mine")}>🎤 Mine ({partitioned.mine.length})</TabBtn>}
      </div>

      {activeList.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
          <p style={{ fontSize: 14, color: "#8892A4", margin: "0 0 16px 0" }}>
            {tab === "upcoming" && "No upcoming classes scheduled."}
            {tab === "live" && "No classes live right now."}
            {tab === "past" && "No past classes yet."}
            {tab === "mine" && "You haven't scheduled any classes."}
          </p>
          {canInstruct && <Link href="/instructor/schedule-class" style={btnPrimary}>+ Schedule a class</Link>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeList.map((s) => {
            const live = isLiveWindow(s) && s.status !== "completed";
            const full = s.max_attendees != null && s.attendee_count >= s.max_attendees && !s.i_rsvped;
            return (
              <div key={s.id} style={{
                background: "#111827", border: `1px solid ${live ? "rgba(239,83,80,0.3)" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 14, padding: 18, display: "flex", gap: 14, flexWrap: "wrap",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 240 }}>
                  {s.instructor_avatar ? (
                    <img src={s.instructor_avatar} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                      {initialsOf(s.instructor_name)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>{s.title}</h3>
                      {live && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#EF5350", background: "rgba(239,83,80,0.12)", padding: "2px 8px", borderRadius: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF5350", animation: "pulse 1.5s infinite" }} />
                          Live
                        </span>
                      )}
                      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
                      {s.status === "cancelled" && <span style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", padding: "2px 8px", borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>CANCELLED</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#8892A4" }}>
                      {s.instructor_name || "Instructor"} · {formatWhen(s.scheduled_at)} · {s.duration_minutes} min
                      {s.course_title && ` · ${s.course_title}`}
                    </div>
                    {s.description && (
                      <p style={{ fontSize: 12, color: "#E8EDF5", margin: "6px 0 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {s.description}
                      </p>
                    )}
                    <div style={{ fontSize: 11, color: "#8892A4", marginTop: 6 }}>
                      👥 {s.attendee_count} RSVP{s.attendee_count === 1 ? "" : "s"}{s.max_attendees ? ` / ${s.max_attendees} max` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {s.youtube_replay_id && (
                    <details style={{ width: "100%" }}>
                      <summary style={{ fontSize: 11, color: "#1E88E5", cursor: "pointer", fontWeight: 700, marginBottom: 6 }}>▶ Watch replay</summary>
                      <div style={{ aspectRatio: "16/9", width: "100%", borderRadius: 10, overflow: "hidden", marginTop: 6 }}>
                        <iframe
                          src={`https://www.youtube.com/embed/${s.youtube_replay_id}`}
                          title="Replay"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          style={{ width: "100%", height: "100%", border: "none" }}
                        />
                      </div>
                    </details>
                  )}
                  <SessionExtras session={s} canInstruct={s.is_mine} />
                  {s.is_mine ? (
                    <>
                      {s.status !== "completed" && (
                        <button onClick={() => onGoLive(s)} style={{ ...btnPrimary, background: s.status === "live" ? "#8892A4" : "linear-gradient(135deg, #EF5350, #C62828)" }}>
                          {s.status === "live" ? "Pause live" : "🔴 Go live"}
                        </button>
                      )}
                      {s.meeting_url && <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" style={btnGhost}>Open link</a>}
                      {s.status !== "completed" && (
                        <button onClick={() => onEnd(s)} style={btnGhost}>End class</button>
                      )}
                      <button onClick={() => onDelete(s)} style={{ ...btnGhost, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>Delete</button>
                    </>
                  ) : live && s.meeting_url ? (
                    <button onClick={() => onJoin(s)} style={{ ...btnPrimary, background: "linear-gradient(135deg, #66BB6A, #2E7D32)" }}>
                      ▶ Join now
                    </button>
                  ) : s.status === "completed" || (tab === "past") ? (
                    <span style={{ fontSize: 11, color: "#8892A4", padding: "6px 10px" }}>Ended</span>
                  ) : (
                    <button onClick={() => onRsvp(s)} disabled={full && !s.i_rsvped} style={s.i_rsvped ? btnGhost : btnPrimary}>
                      {s.i_rsvped ? "✓ RSVP'd (tap to cancel)" : full ? "Full" : "📅 RSVP"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* ── Right command panel ── */}
      <aside style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>
        {/* Rewards */}
        <div style={{ background: "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(30,136,229,0.08))", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#FFC107", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>🏆 Rewards</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Stat label="XP" value={panels.rewards.xp.toLocaleString()} color="#1E88E5" />
            <Stat label="Streak" value={`${panels.rewards.streak}d`} color="#FF7043" />
            <Stat label="Level" value={panels.rewards.level.toString()} color="#AB47BC" />
            <Stat label="Perf." value={`${panels.rewards.performance}%`} color="#66BB6A" />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "#8892A4" }}>
            Current rank: <span style={{ color: "#E8EDF5", fontWeight: 700 }}>{panels.rewards.rank}</span>
          </div>
        </div>

        {/* Today's tasks */}
        <div style={panelBox}>
          <div style={panelTitle}>📋 Today&apos;s tasks</div>
          {panels.todaysTasks.length === 0 ? (
            <p style={emptyText}>All caught up. 🎉</p>
          ) : (
            panels.todaysTasks.slice(0, 4).map((t) => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.priority === "urgent" ? "#EF5350" : t.priority === "high" ? "#FF7043" : t.priority === "medium" ? "#FFC107" : "#1E88E5", flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                </div>
                <span style={{ fontSize: 10, color: "#8892A4", whiteSpace: "nowrap" }}>{t.dueLabel}</span>
              </div>
            ))
          )}
          <Link href="/tasks" style={miniLink}>View all tasks →</Link>
        </div>

        {/* Continue learning */}
        <div style={panelBox}>
          <div style={panelTitle}>📚 Continue learning</div>
          {panels.continueLearning.length === 0 ? (
            <p style={emptyText}>No courses in progress.</p>
          ) : (
            panels.continueLearning.map((c) => (
              <Link key={c.id} href={`/courses/${c.id}`} style={{ display: "block", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#E8EDF5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${c.progress}%`, height: "100%", background: "linear-gradient(90deg, #1E88E5, #66BB6A)" }} />
                  </div>
                  <span style={{ fontSize: 10, color: "#8892A4" }}>{c.progress}%</span>
                </div>
              </Link>
            ))
          )}
          <Link href="/courses" style={miniLink}>Browse catalog →</Link>
        </div>

        {/* Recent activity */}
        <div style={panelBox}>
          <div style={panelTitle}>🕒 Recent activity</div>
          {panels.activity.length === 0 ? (
            <p style={emptyText}>No recent activity.</p>
          ) : (
            panels.activity.slice(0, 4).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#E8EDF5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.text}</span>
                </div>
                <span style={{ fontSize: 10, color: "#8892A4", whiteSpace: "nowrap" }}>{a.timeLabel}</span>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "#0A0E1A", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#8892A4", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const panelBox: React.CSSProperties = {
  background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 14,
};
const panelTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10,
};
const emptyText: React.CSSProperties = { fontSize: 12, color: "#8892A4", margin: "8px 0" };
const miniLink: React.CSSProperties = {
  display: "block", marginTop: 10, fontSize: 11, color: "#1E88E5", textDecoration: "none", fontWeight: 700,
};

function SessionExtras({ session, canInstruct }: { session: ClassSessionRow; canInstruct: boolean }) {
  const [open, setOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replayInput, setReplayInput] = useState(session.youtube_replay_id || "");
  const [replaySaved, setReplaySaved] = useState(session.youtube_replay_id || "");
  const fileInput = useRef<HTMLInputElement>(null);

  async function toggleOpen() {
    if (!open && !loaded) {
      try {
        const res = await fetch(`/api/materials/session/${session.id}`);
        if (res.ok) setMaterials((await res.json()).materials || []);
      } catch {}
      setLoaded(true);
    }
    setOpen(!open);
  }

  async function onUpload(files: FileList | null) {
    if (!files || !files[0]) return;
    const f = files[0];
    if (f.size > 15 * 1024 * 1024) { toast.error("Max 15 MB"); return; }
    setUploading(true);
    const t = toast.loading(`Uploading ${f.name}…`);
    try {
      const up = await uploadToCloudinary(f, { folder: `cios-materials/${session.id}`, resourceType: "auto", filename: f.name });
      const r = await addMaterial({
        title: f.name, fileUrl: up.secureUrl, fileType: f.type, fileSize: f.size,
        sessionId: session.id, courseId: session.course_id, moduleId: null,
      });
      if (!r.ok) { toast.error(r.error, { id: t }); return; }
      toast.success("Added", { id: t });
      setMaterials((prev) => [{ id: r.data!.id, title: f.name, file_url: up.secureUrl, file_type: f.type, file_size: f.size, uploaded_by: "", session_id: session.id, course_id: session.course_id, module_id: null, created_at: new Date().toISOString() }, ...prev]);
    } catch (e) { toast.error((e as Error).message, { id: t }); }
    finally { setUploading(false); }
  }

  async function onDeleteMat(id: string) {
    if (!confirm("Remove this material?")) return;
    const r = await deleteMaterial(id);
    if (!r.ok) { toast.error(r.error); return; }
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  async function saveReplay() {
    const r = await setSessionReplay(session.id, replayInput || null);
    if (!r.ok) { toast.error(r.error); return; }
    setReplaySaved(replayInput);
    toast.success(replayInput ? "Replay saved" : "Replay cleared");
  }

  return (
    <div style={{ width: "100%" }}>
      <button onClick={toggleOpen} style={{ background: "transparent", border: "none", color: "#8892A4", fontSize: 11, cursor: "pointer", fontWeight: 700, padding: "2px 0" }}>
        {open ? "▼" : "▶"} Materials {loaded && materials.length > 0 && `(${materials.length})`} {canInstruct && "· Replay"}
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: 10, background: "#0A0E1A", borderRadius: 10, fontSize: 11 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>📁 Class materials</div>
          {materials.length === 0 && <p style={{ color: "#5A6478", margin: "4px 0" }}>No materials yet.</p>}
          {materials.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
              <a href={m.file_url} target="_blank" rel="noopener noreferrer" download style={{ color: "#1E88E5", textDecoration: "underline", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                📎 {m.title}
              </a>
              {canInstruct && <button onClick={() => onDeleteMat(m.id)} style={{ background: "transparent", border: "none", color: "#EF5350", cursor: "pointer", fontSize: 11 }}>✕</button>}
            </div>
          ))}
          {canInstruct && (
            <>
              <input ref={fileInput} type="file" hidden onChange={(e) => onUpload(e.target.files)} />
              <button onClick={() => fileInput.current?.click()} disabled={uploading} style={{ marginTop: 6, background: "transparent", border: "1px dashed rgba(255,255,255,0.15)", color: "#1E88E5", borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                {uploading ? "Uploading…" : "+ Upload material"}
              </button>
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>▶ YouTube replay</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    value={replayInput}
                    onChange={(e) => setReplayInput(e.target.value)}
                    placeholder="Paste YouTube URL or ID"
                    style={{ flex: 1, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 10px", color: "#E8EDF5", fontSize: 11, outline: "none" }}
                  />
                  <button onClick={saveReplay} disabled={replayInput === replaySaved} style={{ background: "#1E88E5", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Save</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: active ? "#1E88E5" : "#111827",
      color: active ? "#fff" : "#8892A4",
      border: active ? "none" : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 10, padding: "8px 14px",
      fontSize: 12, fontWeight: 700, cursor: "pointer",
    }}>{children}</button>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff",
  border: "none", borderRadius: 10, padding: "9px 16px",
  fontSize: 12, fontWeight: 700, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
const btnGhost: React.CSSProperties = {
  background: "transparent", color: "#E8EDF5",
  border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
  padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  textDecoration: "none", display: "inline-block",
};
