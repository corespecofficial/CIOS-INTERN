"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { respondToMentorshipRequest, upsertMentorProfile, type Mentorship, type MentorSession } from "@/app/actions/mentorship";

interface Props {
  userId: string;
  userName: string;
  mentorships: Mentorship[];
  sessions: MentorSession[];
}

export function MentorDashboardClient({ userId, userName, mentorships, sessions }: Props) {
  const [tab, setTab] = useState<"overview" | "mentees" | "sessions" | "profile">("overview");
  const [pending, start] = useTransition();
  const [localMentorships, setLocalMentorships] = useState(mentorships);

  const isMentor = mentorships.some((m) => m.mentor_id === userId);
  const isMentee = mentorships.some((m) => m.mentee_id === userId);
  const pendingRequests = localMentorships.filter((m) => m.mentor_id === userId && m.status === "pending");
  const activeMentees = localMentorships.filter((m) => m.mentor_id === userId && m.status === "active");
  const myMentors = localMentorships.filter((m) => m.mentee_id === userId && m.status === "active");
  const upcoming = sessions.filter((s) => s.status === "scheduled" && new Date(s.scheduled_at) > new Date());

  const respond = (id: string, accept: boolean) => start(async () => {
    const r = await respondToMentorshipRequest(id, accept);
    if (!r.ok) { toast.error(r.error); return; }
    setLocalMentorships((prev) => prev.map((m) => m.id === id ? { ...m, status: accept ? "active" : "rejected" } : m));
    toast.success(accept ? "Mentorship accepted! 🎉" : "Request declined.");
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(30,136,229,0.08))", border: "1px solid rgba(171,71,188,0.25)", borderRadius: 16, padding: 22, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <span style={{ fontSize: 11, color: "#AB47BC", fontWeight: 700, letterSpacing: 0.5 }}>MENTOR HUB</span>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>🧑‍🏫 Mentor Dashboard</h1>
            <p style={{ fontSize: 12, color: "#8892A4", margin: 0 }}>Manage your mentees, sessions, and profile</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/mentorship" style={btnGhost}>Browse Mentors →</Link>
            {!isMentor && <Link href="/mentor/profile" style={btnPurple}>Become a Mentor</Link>}
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginTop: 16 }}>
          {[
            { val: activeMentees.length, label: "Active Mentees", color: "#AB47BC" },
            { val: pendingRequests.length, label: "Pending Requests", color: "#FFC107" },
            { val: upcoming.length, label: "Upcoming Sessions", color: "#1E88E5" },
            { val: myMentors.length, label: "My Mentors", color: "#66BB6A" },
          ].map(({ val, label, color }) => (
            <div key={label} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif" }}>{val}</div>
              <div style={{ fontSize: 10, color: "#8892A4", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[
          { k: "overview", label: "Overview" },
          { k: "mentees", label: `Mentees ${pendingRequests.length > 0 ? `(${pendingRequests.length} new)` : ""}` },
          { k: "sessions", label: "Sessions" },
          { k: "profile", label: "My Mentor Profile" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)} style={{
            flex: 1, padding: "8px 10px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(171,71,188,0.15)" : "transparent",
            color: tab === t.k ? "#AB47BC" : "#8892A4", border: "none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 14 }}>
          {pendingRequests.length > 0 && (
            <div style={{ background: "rgba(255,193,7,0.06)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#FFC107", marginBottom: 10 }}>🔔 Pending Requests ({pendingRequests.length})</div>
              {pendingRequests.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <Avatar name={m.mentee_name} url={m.mentee_avatar} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{m.mentee_name || "Intern"}</div>
                    {m.note && <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.note}</div>}
                  </div>
                  <button onClick={() => respond(m.id, true)} disabled={pending} style={btnGreen}>Accept</button>
                  <button onClick={() => respond(m.id, false)} disabled={pending} style={btnRed}>Decline</button>
                </div>
              ))}
            </div>
          )}

          {upcoming.length > 0 && (
            <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 10 }}>📅 Upcoming Sessions</div>
              {upcoming.slice(0, 5).map((s) => (
                <SessionRow key={s.id} session={s} userId={userId} />
              ))}
            </div>
          )}

          {myMentors.length > 0 && (
            <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 10 }}>🌟 My Mentors</div>
              {myMentors.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <Avatar name={m.mentor_name} url={m.mentor_avatar} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{m.mentor_name || "Mentor"}</div>
                    <div style={{ fontSize: 11, color: "#66BB6A" }}>Active since {m.started_at ? new Date(m.started_at).toLocaleDateString() : "—"}</div>
                  </div>
                  <Link href="/mentor/sessions" style={btnGhost}>Schedule session →</Link>
                </div>
              ))}
            </div>
          )}

          {!isMentor && !isMentee && (
            <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧑‍🏫</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5", marginBottom: 6 }}>Start Your Mentorship Journey</div>
              <div style={{ fontSize: 13, color: "#8892A4", marginBottom: 16 }}>Browse available mentors or apply to become one.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Link href="/mentorship" style={btnPurple}>Browse Mentors</Link>
                <Link href="/mentor/profile" style={btnGhost}>Become a Mentor</Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mentees tab */}
      {tab === "mentees" && (
        <div style={{ display: "grid", gap: 10 }}>
          {localMentorships.filter((m) => m.mentor_id === userId).length === 0 ? (
            <Empty text="No mentorship requests yet. Make sure your mentor profile is set up and visible." />
          ) : localMentorships.filter((m) => m.mentor_id === userId).map((m) => (
            <div key={m.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={m.mentee_name} url={m.mentee_avatar} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{m.mentee_name || "Intern"}</div>
                {m.note && <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{m.note}</div>}
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 2 }}>Requested {new Date(m.created_at).toLocaleDateString()}</div>
              </div>
              <StatusBadge status={m.status} />
              {m.status === "pending" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => respond(m.id, true)} disabled={pending} style={btnGreen}>Accept</button>
                  <button onClick={() => respond(m.id, false)} disabled={pending} style={btnRed}>Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sessions tab */}
      {tab === "sessions" && (
        <div style={{ display: "grid", gap: 10 }}>
          {sessions.length === 0 ? (
            <Empty text="No sessions yet. Schedule your first session from an active mentorship." />
          ) : sessions.map((s) => (
            <SessionRow key={s.id} session={s} userId={userId} />
          ))}
          {(activeMentees.length > 0 || myMentors.length > 0) && (
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <Link href="/mentor/sessions" style={btnPurple}>+ Schedule a session</Link>
            </div>
          )}
        </div>
      )}

      {/* Profile tab */}
      {tab === "profile" && <MentorProfileForm userId={userId} />}
    </div>
  );
}

/* ── Sub-components ── */

function Avatar({ name, url, size = 36 }: { name: string | null; url: string | null; size?: number }) {
  const ini = (name || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return url
    ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <span style={{ width: size, height: size, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{ini}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    pending: { bg: "rgba(255,193,7,0.15)", color: "#FFC107" },
    active: { bg: "rgba(102,187,106,0.15)", color: "#66BB6A" },
    ended: { bg: "rgba(88,102,126,0.2)", color: "#8892A4" },
    rejected: { bg: "rgba(239,83,80,0.15)", color: "#EF5350" },
    scheduled: { bg: "rgba(30,136,229,0.15)", color: "#1E88E5" },
    completed: { bg: "rgba(102,187,106,0.15)", color: "#66BB6A" },
    cancelled: { bg: "rgba(239,83,80,0.15)", color: "#EF5350" },
  };
  const s = map[status] || { bg: "rgba(88,102,126,0.2)", color: "#8892A4" };
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, textTransform: "uppercase", whiteSpace: "nowrap" }}>{status}</span>;
}

function SessionRow({ session: s, userId }: { session: MentorSession; userId: string }) {
  const isMentor = s.mentor_id === userId;
  const partner = isMentor ? s.mentee_name : s.mentor_name;
  const isPast = new Date(s.scheduled_at) < new Date();
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: s.status === "scheduled" ? "rgba(30,136,229,0.12)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {s.status === "completed" ? "✓" : s.status === "cancelled" ? "✕" : "📅"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{s.topic || "Session"}</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>
          {isMentor ? "with " : "with "}{partner || "—"} · {new Date(s.scheduled_at).toLocaleString()} · {s.duration_min}min
        </div>
        {s.meeting_link && !isPast && (
          <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1E88E5", fontWeight: 700 }}>Join meeting →</a>
        )}
      </div>
      <StatusBadge status={s.status} />
    </div>
  );
}

function MentorProfileForm({ userId }: { userId: string }) {
  const [bio, setBio] = useState("");
  const [tags, setTags] = useState("");
  const [maxMentees, setMaxMentees] = useState(5);
  const [available, setAvailable] = useState(true);
  const [pending, start] = useTransition();

  const save = () => start(async () => {
    const r = await upsertMentorProfile({
      bio: bio || undefined,
      expertise_tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      max_mentees: maxMentees,
      is_available: available,
    });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Mentor profile saved! You are now visible to interns.");
  });

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>🧑‍🏫 My Mentor Profile</div>
      <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>Set this up to appear in the mentor directory and receive mentorship requests from interns.</div>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={lbl}>Bio (what you teach, your background)</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="I'm a UI/UX designer with 5 years experience…" style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div>
          <label style={lbl}>Expertise tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. React, Figma, Marketing, Python" style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>Max simultaneous mentees</label>
            <input type="number" min={1} max={20} value={maxMentees} onChange={(e) => setMaxMentees(+e.target.value)} style={inp} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "#E8EDF5" }}>
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} style={{ accentColor: "#AB47BC" }} />
              Available for new mentees
            </label>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={pending} style={btnPurple}>{pending ? "Saving…" : "💾 Save mentor profile"}</button>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 32, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>{text}</div>;
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnPurple: React.CSSProperties = { padding: "8px 16px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", border: "1px solid rgba(171,71,188,0.35)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGreen: React.CSSProperties = { padding: "6px 12px", background: "rgba(102,187,106,0.15)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" };
const btnRed: React.CSSProperties = { padding: "6px 12px", background: "rgba(239,83,80,0.1)", color: "#EF5350", border: "1px solid rgba(239,83,80,0.25)", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" };
