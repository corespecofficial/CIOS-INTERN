"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { upsertMentorProfile, type MentorProfile } from "@/app/actions/mentorship";

interface Props {
  existing: MentorProfile | null;
}

export function MentorProfilePageClient({ existing }: Props) {
  const [bio, setBio] = useState(existing?.bio || "");
  const [tags, setTags] = useState((existing?.expertise_tags || []).join(", "));
  const [maxMentees, setMaxMentees] = useState(existing?.max_mentees ?? 5);
  const [available, setAvailable] = useState(existing?.is_available ?? true);
  const [sessionRate, setSessionRate] = useState(existing?.session_rate?.toString() || "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const save = () => {
    setSaved(false);
    start(async () => {
      const r = await upsertMentorProfile({
        bio: bio.trim() || undefined,
        expertise_tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
        max_mentees: maxMentees,
        is_available: available,
        session_rate: sessionRate ? parseFloat(sessionRate) : undefined,
      });
      if (!r.ok) { toast.error(r.error); return; }
      setSaved(true);
      toast.success("Mentor profile saved! You are now visible to interns. 🎉");
    });
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(171,71,188,0.15), rgba(171,71,188,0.05))",
        border: "1px solid rgba(171,71,188,0.25)",
        borderRadius: 16, padding: 24, marginBottom: 20,
      }}>
        <Link href="/mentor" style={{ fontSize: 11, color: "#AB47BC", fontWeight: 700, letterSpacing: 0.5, textDecoration: "none" }}>← MENTOR DASHBOARD</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: "6px 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
          🧑‍🏫 {existing ? "Edit Mentor Profile" : "Become a Mentor"}
        </h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
          {existing
            ? "Update your profile to keep your mentees informed and attract new ones."
            : "Set up your mentor profile to appear in the directory and start receiving mentorship requests from interns."}
        </p>
        {existing && (
          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            {[
              { val: existing.sessions_done, label: "Sessions Done", color: "#AB47BC" },
              { val: existing.rating > 0 ? `${existing.rating} ★` : "—", label: "Rating", color: "#FFC107" },
              { val: existing.is_available ? "Open" : "Closed", label: "Status", color: existing.is_available ? "#66BB6A" : "#EF5350" },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ background: "#0A0E1A", borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif" }}>{val}</div>
                <div style={{ fontSize: 10, color: "#8892A4" }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 24 }}>
        <div style={{ display: "grid", gap: 16 }}>
          {/* Bio */}
          <div>
            <label style={lbl}>Bio — tell interns about yourself *</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="e.g. I'm a senior UI/UX designer with 5 years at a fintech startup. I love helping beginners break into design and build portfolios that get noticed…"
              style={{ ...inp, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
            />
            <div style={{ fontSize: 10, color: bio.length < 50 ? "#EF5350" : "#66BB6A", marginTop: 4 }}>{bio.length} / 50 min characters</div>
          </div>

          {/* Expertise tags */}
          <div>
            <label style={lbl}>Expertise tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. React, Figma, Digital Marketing, Python, SEO"
              style={inp}
            />
            {/* Preview */}
            {tags.trim() && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                  <span key={t} style={{ fontSize: 11, padding: "3px 10px", background: "rgba(171,71,188,0.1)", color: "#AB47BC", borderRadius: 20, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Capacity + availability */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={lbl}>Max simultaneous mentees</label>
              <input
                type="number" min={1} max={20} value={maxMentees}
                onChange={(e) => setMaxMentees(Math.max(1, Math.min(20, +e.target.value)))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Session rate (₦, optional — leave 0 for free)</label>
              <input
                type="number" min={0} value={sessionRate}
                onChange={(e) => setSessionRate(e.target.value)}
                placeholder="0 = Free"
                style={inp}
              />
            </div>
          </div>

          {/* Availability toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", background: available ? "rgba(102,187,106,0.06)" : "rgba(239,83,80,0.06)", border: `1px solid ${available ? "rgba(102,187,106,0.2)" : "rgba(239,83,80,0.2)"}`, borderRadius: 10 }}>
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} style={{ accentColor: "#AB47BC", width: 16, height: 16 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: available ? "#66BB6A" : "#EF5350" }}>
                {available ? "✅ Open for new mentees" : "⏸ Currently unavailable"}
              </div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>
                {available ? "Your profile will appear in the mentor directory." : "Your profile is hidden from new requests."}
              </div>
            </div>
          </label>

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Link href="/mentor" style={{ fontSize: 12, color: "#8892A4", textDecoration: "none" }}>← Back to dashboard</Link>
            <button
              onClick={save}
              disabled={pending || bio.length < 50}
              style={{
                padding: "10px 24px",
                background: bio.length >= 50 ? "rgba(171,71,188,0.15)" : "rgba(255,255,255,0.04)",
                color: bio.length >= 50 ? "#AB47BC" : "#5A6478",
                border: `1px solid ${bio.length >= 50 ? "rgba(171,71,188,0.35)" : "transparent"}`,
                borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: bio.length >= 50 ? "pointer" : "default",
              }}
            >
              {pending ? "Saving…" : saved ? "✅ Saved!" : existing ? "💾 Update profile" : "🚀 Go live as mentor"}
            </button>
          </div>
        </div>
      </div>

      {/* What to expect */}
      {!existing && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 10 }}>What happens after you go live?</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[
              ["🔍", "Interns discover you", "Your profile appears in the mentor directory when you're marked as available."],
              ["📬", "Requests come in", "Interns send you a mentorship request with a note. You accept or decline."],
              ["📅", "Schedule sessions", "Once active, schedule 1-on-1 sessions with your mentees via the Sessions page."],
              ["⭐", "Build your rating", "Mentees rate each session — high ratings make you more visible in the directory."],
            ].map(([emoji, title, desc]) => (
              <div key={title as string} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EDF5" }}>{title as string}</div>
                  <div style={{ fontSize: 11, color: "#8892A4" }}>{desc as string}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", outline: "none" };
