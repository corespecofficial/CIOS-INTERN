"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { scheduleSession, submitSessionFeedback, type MentorSession, type Mentorship } from "@/app/actions/mentorship";

interface Props {
  userId: string;
  sessions: MentorSession[];
  activeMentorships: Mentorship[];
}

export function MentorSessionsClient({ userId, sessions: initialSessions, activeMentorships }: Props) {
  const [sessions, setSessions] = useState(initialSessions);
  const [showSchedule, setShowSchedule] = useState(false);
  const [selectedMentorship, setSelectedMentorship] = useState(activeMentorships[0]?.id || "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [meetingLink, setMeetingLink] = useState("");
  const [pending, start] = useTransition();
  const [ratingSession, setRatingSession] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackBody, setFeedbackBody] = useState("");

  const submit = () => start(async () => {
    if (!scheduledAt) { toast.error("Pick a date and time"); return; }
    const r = await scheduleSession(selectedMentorship, new Date(scheduledAt).toISOString(), { topic: topic || undefined, durationMin: duration, meetingLink: meetingLink || undefined });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Session scheduled!");
    setShowSchedule(false);
    setTopic(""); setMeetingLink(""); setScheduledAt("");
    // Refresh
    window.location.reload();
  });

  const submitFeedback = (id: string) => start(async () => {
    const r = await submitSessionFeedback(id, rating, feedbackBody || undefined);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Feedback submitted. Thank you!");
    setRatingSession(null);
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, status: "completed", feedback_rating: rating } : s));
  });

  const upcoming = sessions.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at) > new Date());
  const past = sessions.filter((s) => s.status !== "scheduled" || new Date(s.scheduled_at) <= new Date());

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>📅 Mentor Sessions</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: "2px 0 0 0" }}>{upcoming.length} upcoming · {past.length} past</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/mentor" style={btnGhost}>← Mentor Hub</Link>
          {activeMentorships.length > 0 && (
            <button onClick={() => setShowSchedule((v) => !v)} style={btnBlue}>+ Schedule Session</button>
          )}
        </div>
      </div>

      {/* Schedule form */}
      {showSchedule && (
        <div style={{ background: "#111827", border: "1px solid rgba(30,136,229,0.25)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 12 }}>Schedule New Session</div>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <label style={lbl}>Mentorship</label>
              <select value={selectedMentorship} onChange={(e) => setSelectedMentorship(e.target.value)} style={inp}>
                {activeMentorships.map((m) => (
                  <option key={m.id} value={m.id}>
                    {userId === m.mentor_id ? `Mentee: ${m.mentee_name || "Intern"}` : `Mentor: ${m.mentor_name || "Mentor"}`}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={lbl}>Date & Time</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Duration (minutes)</label>
                <select value={duration} onChange={(e) => setDuration(+e.target.value)} style={inp}>
                  {[15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} min</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={lbl}>Session topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Portfolio review, Career goals…" style={inp} />
            </div>
            <div>
              <label style={lbl}>Meeting link (optional)</label>
              <input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" style={inp} />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowSchedule(false)} style={btnGhost}>Cancel</button>
              <button onClick={submit} disabled={pending} style={btnBlue}>{pending ? "Scheduling…" : "📅 Schedule"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8892A4", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Upcoming</div>
          {upcoming.map((s) => <SessionCard key={s.id} session={s} userId={userId} onRate={() => setRatingSession(s.id)} />)}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#8892A4", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Past Sessions</div>
          {past.map((s) => <SessionCard key={s.id} session={s} userId={userId} onRate={() => setRatingSession(s.id)} />)}
        </div>
      )}

      {sessions.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          No sessions yet.{activeMentorships.length > 0 ? " Schedule your first one above." : " You need an active mentorship first."}
        </div>
      )}

      {/* Rating modal */}
      {ratingSession && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={(e) => e.target === e.currentTarget && setRatingSession(null)}>
          <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, width: 400, maxWidth: "96vw" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>Rate this session</div>
            <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>Your feedback helps improve mentorship quality.</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "center" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} style={{ fontSize: 24, background: "transparent", border: "none", cursor: "pointer", opacity: n <= rating ? 1 : 0.3, transition: "opacity 0.15s" }}>★</button>
              ))}
            </div>
            <textarea value={feedbackBody} onChange={(e) => setFeedbackBody(e.target.value)} rows={3} placeholder="What went well? What could improve?" style={{ ...inp, resize: "none", fontFamily: "inherit", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setRatingSession(null)} style={btnGhost}>Skip</button>
              <button onClick={() => submitFeedback(ratingSession)} disabled={pending} style={btnBlue}>{pending ? "Submitting…" : "Submit feedback"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({ session: s, userId, onRate }: { session: MentorSession; userId: string; onRate: () => void }) {
  const isMentor = s.mentor_id === userId;
  const partner = isMentor ? s.mentee_name : s.mentor_name;
  const isPast = new Date(s.scheduled_at) < new Date();
  const statusMap: Record<string, { bg: string; color: string }> = {
    scheduled: { bg: "rgba(30,136,229,0.15)", color: "#1E88E5" },
    completed: { bg: "rgba(102,187,106,0.15)", color: "#66BB6A" },
    cancelled: { bg: "rgba(239,83,80,0.12)", color: "#EF5350" },
    no_show: { bg: "rgba(88,102,126,0.15)", color: "#8892A4" },
  };
  const sc = statusMap[s.status] || statusMap.scheduled;
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
        {s.status === "completed" ? "✓" : s.status === "cancelled" ? "✕" : "📅"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{s.topic || "Session"}</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
          {isMentor ? "with " : "with "}{partner || "—"} · {new Date(s.scheduled_at).toLocaleString()} · {s.duration_min}min
        </div>
        {s.meeting_link && !isPast && (
          <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1E88E5", fontWeight: 700, display: "inline-block", marginTop: 4 }}>Join meeting →</a>
        )}
        {s.feedback_rating && (
          <div style={{ fontSize: 11, color: "#FFC107", marginTop: 4 }}>{"★".repeat(s.feedback_rating)}{"☆".repeat(5 - s.feedback_rating)}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.color, textTransform: "uppercase" }}>{s.status}</span>
        {isPast && s.status === "scheduled" && !s.feedback_rating && !isMentor && (
          <button onClick={onRate} style={{ fontSize: 11, padding: "4px 10px", background: "rgba(255,193,7,0.12)", color: "#FFC107", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>Rate session</button>
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, boxSizing: "border-box" };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnBlue: React.CSSProperties = { padding: "8px 16px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", border: "1px solid rgba(30,136,229,0.3)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" };
