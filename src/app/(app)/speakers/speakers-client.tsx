"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rsvpToSession, type SpeakerSession } from "@/app/actions/speakers";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#AB47BC",
  gold: "#FFC107",
  green: "#66BB6A",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function daysUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return "Ended";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days}d`;
  return `In ${Math.ceil(days / 7)}w`;
}

interface Props {
  upcoming: SpeakerSession[];
  past: SpeakerSession[];
  rsvped: string[];
}

export default function SpeakersClient({ upcoming, past, rsvped }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [rsvpSet, setRsvpSet] = useState<Set<string>>(new Set(rsvped));
  const [pending, startTransition] = useTransition();

  function handleRsvp(sessionId: string) {
    startTransition(async () => {
      const res = await rsvpToSession(sessionId);
      if (res.ok) {
        setRsvpSet((prev) => new Set([...prev, sessionId]));
        router.refresh();
      }
    });
  }

  const featuredUpcoming = upcoming.find((s) => s.featured);
  const restUpcoming = upcoming.filter((s) => s !== featuredUpcoming);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1100, margin: "0 auto" }}>
      <style>{`
        .sp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        @media (max-width: 720px) { .sp-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "inline-block", background: "rgba(171,71,188,0.12)", border: "1px solid rgba(171,71,188,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>
          🎙 Speaker Series
        </div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Learn from industry.</h1>
        <p style={{ margin: "6px 0 0", color: C.dim, fontSize: 14, maxWidth: 620, lineHeight: 1.6 }}>
          Live and recorded talks from founders, designers, engineers, and operators.
          RSVP to save your spot. Attendance earns points.
        </p>
      </div>

      {/* Featured */}
      {featuredUpcoming && (
        <div
          style={{
            background: `linear-gradient(135deg, ${C.accent}22, ${C.card})`,
            border: `1px solid ${C.accent}44`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            display: "flex",
            gap: 18,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "0 0 auto" }}>
            {featuredUpcoming.speaker?.photo_url ? (
              <img src={featuredUpcoming.speaker.photo_url} alt="" style={{ width: 72, height: 72, borderRadius: 14, objectFit: "cover" }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 14, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff" }}>
                🎤
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
              ⭐ Featured · {daysUntil(featuredUpcoming.scheduled_at)}
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, letterSpacing: -0.3 }}>{featuredUpcoming.title}</h2>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
              {featuredUpcoming.speaker?.full_name} {featuredUpcoming.speaker?.title ? `· ${featuredUpcoming.speaker.title}` : ""} {featuredUpcoming.speaker?.company ? `@ ${featuredUpcoming.speaker.company}` : ""}
            </div>
            {featuredUpcoming.description && <p style={{ color: C.dim, fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>{featuredUpcoming.description}</p>}
            <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: C.dim }}>📅 {fmtDate(featuredUpcoming.scheduled_at)}</span>
              <span style={{ fontSize: 12, color: C.dim }}>⏱ {featuredUpcoming.duration_min}m</span>
              <span style={{ fontSize: 12, color: C.dim }}>👥 {featuredUpcoming.rsvp_count} RSVP&apos;d</span>
              <button
                onClick={() => handleRsvp(featuredUpcoming.id)}
                disabled={pending || rsvpSet.has(featuredUpcoming.id)}
                style={{
                  marginLeft: "auto",
                  padding: "9px 18px",
                  background: rsvpSet.has(featuredUpcoming.id) ? C.green : C.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: rsvpSet.has(featuredUpcoming.id) ? "default" : "pointer",
                }}
              >
                {rsvpSet.has(featuredUpcoming.id) ? "✓ You're in" : "RSVP →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[
          { k: "upcoming" as const, label: `Upcoming (${upcoming.length})` },
          { k: "past" as const, label: `Past (${past.length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            style={{
              flex: 1,
              padding: "9px 14px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: tab === t.k ? C.accent : "transparent",
              color: tab === t.k ? "#fff" : C.dim,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sessions list */}
      {tab === "upcoming" && (
        <>
          {restUpcoming.length === 0 && !featuredUpcoming ? (
            <Empty text="No upcoming sessions — check back soon." />
          ) : (
            <div className="sp-grid">
              {restUpcoming.map((s) => (
                <SessionCard key={s.id} session={s} rsvped={rsvpSet.has(s.id)} onRsvp={() => handleRsvp(s.id)} pending={pending} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "past" && (
        <>
          {past.length === 0 ? (
            <Empty text="No past sessions yet." />
          ) : (
            <div className="sp-grid">
              {past.map((s) => (
                <SessionCard key={s.id} session={s} rsvped={false} onRsvp={() => {}} pending={false} isPast />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SessionCard({
  session,
  rsvped,
  onRsvp,
  pending,
  isPast,
}: {
  session: SpeakerSession;
  rsvped: boolean;
  onRsvp: () => void;
  pending: boolean;
  isPast?: boolean;
}) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {session.speaker?.photo_url ? (
          <img src={session.speaker.photo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 10, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff" }}>
            🎤
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.3 }}>{session.title}</div>
          <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>
            {session.speaker?.full_name}{session.speaker?.company ? ` · ${session.speaker.company}` : ""}
          </div>
        </div>
      </div>
      {session.description && <div style={{ fontSize: 12, color: C.dim, lineHeight: 1.5 }}>{session.description.length > 120 ? `${session.description.slice(0, 120)}…` : session.description}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: C.dim, marginTop: "auto" }}>
        <span>📅 {fmtDate(session.scheduled_at)}</span>
        <span>⏱ {session.duration_min}m</span>
        <span>👥 {session.rsvp_count}</span>
      </div>
      {!isPast ? (
        <button
          onClick={onRsvp}
          disabled={pending || rsvped}
          style={{
            padding: "8px 14px",
            background: rsvped ? C.green : C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 12,
            cursor: rsvped ? "default" : "pointer",
            marginTop: 4,
          }}
        >
          {rsvped ? "✓ RSVP'd" : "RSVP →"}
        </button>
      ) : session.recording_url ? (
        <a href={session.recording_url} target="_blank" rel="noreferrer" style={{ padding: "8px 14px", background: C.dim, color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 12, textDecoration: "none", textAlign: "center", marginTop: 4 }}>
          ▶ Watch recording
        </a>
      ) : (
        <div style={{ padding: "8px 14px", background: "transparent", color: C.dim, borderRadius: 8, fontWeight: 600, fontSize: 12, textAlign: "center", marginTop: 4, border: `1px solid ${C.border}` }}>
          Ended
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🎙</div>
      {text}
    </div>
  );
}
