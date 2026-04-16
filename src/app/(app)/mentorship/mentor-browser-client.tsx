"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { requestMentorship, type MentorProfile } from "@/app/actions/mentorship";

export function MentorBrowserClient({ mentors }: { mentors: MentorProfile[] }) {
  const [search, setSearch] = useState("");
  const [requesting, setRequesting] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const filtered = mentors.filter((m) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (m.name || "").toLowerCase().includes(q) || (m.bio || "").toLowerCase().includes(q) || m.expertise_tags.some((t) => t.toLowerCase().includes(q));
  });

  const sendRequest = (mentorId: string) => start(async () => {
    const r = await requestMentorship(mentorId, note || undefined);
    if (!r.ok) { toast.error(r.error); return; }
    setRequestedIds((prev) => new Set(prev).add(mentorId));
    setRequesting(null);
    setNote("");
    toast.success("Request sent! Your mentor will respond soon.");
  });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(30,136,229,0.08))", border: "1px solid rgba(171,71,188,0.25)", borderRadius: 16, padding: 22, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <span style={{ fontSize: 11, color: "#AB47BC", fontWeight: 700, letterSpacing: 0.5 }}>MENTORSHIP</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "2px 0" }}>🧑‍🏫 Find a Mentor</h1>
          <p style={{ fontSize: 12, color: "#8892A4", margin: 0 }}>Connect with verified CIOS mentors who can guide your journey</p>
        </div>
        <Link href="/mentor" style={btnPurple}>My Mentor Dashboard →</Link>
      </div>

      {/* Search */}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by name, skill, expertise…" style={{ width: "100%", padding: "10px 14px", background: "#111827", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, marginBottom: 16, boxSizing: "border-box" }} />

      {filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>
          No mentors available right now. Check back soon or ask an admin.
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((m) => {
          const isRequested = requestedIds.has(m.user_id);
          return (
            <div key={m.user_id} style={{ background: "#111827", border: "1px solid rgba(171,71,188,0.15)", borderRadius: 14, padding: 18, display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Avatar */}
              <div style={{ flexShrink: 0 }}>
                {m.avatar_url
                  ? <img src={m.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
                  : <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#AB47BC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
                      {(m.name || "?").charAt(0).toUpperCase()}
                    </span>
                }
              </div>
              {/* Body */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5" }}>{m.name || "Mentor"}</span>
                  {m.rating > 0 && <span style={{ fontSize: 11, color: "#FFC107", fontWeight: 700 }}>★ {m.rating.toFixed(1)}</span>}
                  {m.sessions_done > 0 && <span style={{ fontSize: 11, color: "#8892A4" }}>{m.sessions_done} sessions</span>}
                  {m.session_rate ? <span style={{ fontSize: 11, color: "#26C6DA", fontWeight: 700 }}>₦{m.session_rate.toLocaleString()}/session</span> : <span style={{ fontSize: 11, color: "#66BB6A", fontWeight: 700 }}>Free</span>}
                </div>
                {m.bio && <div style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.bio}</div>}
                {m.expertise_tags.length > 0 && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {m.expertise_tags.map((t) => <span key={t} style={{ fontSize: 10, padding: "2px 8px", background: "rgba(171,71,188,0.1)", border: "1px solid rgba(171,71,188,0.2)", borderRadius: 4, color: "#AB47BC" }}>{t}</span>)}
                  </div>
                )}
              </div>
              {/* Action */}
              <div style={{ flexShrink: 0 }}>
                {isRequested
                  ? <span style={{ padding: "8px 14px", background: "rgba(102,187,106,0.1)", color: "#66BB6A", border: "1px solid rgba(102,187,106,0.25)", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>✓ Requested</span>
                  : requesting === m.user_id ? (
                    <div style={{ width: 260 }}>
                      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Tell them why you'd like their mentorship…" style={{ width: "100%", padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, resize: "none", fontFamily: "inherit", marginBottom: 8, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { setRequesting(null); setNote(""); }} style={btnGhost}>Cancel</button>
                        <button onClick={() => sendRequest(m.user_id)} disabled={pending} style={btnPurple}>{pending ? "Sending…" : "Send request"}</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setRequesting(m.user_id)} style={btnPurple}>Request Mentorship</button>
                  )
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnPurple: React.CSSProperties = { padding: "8px 16px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", border: "1px solid rgba(171,71,188,0.35)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
