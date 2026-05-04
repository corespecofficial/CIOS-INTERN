"use client";

/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { updateMyProfile } from "@/app/actions/profile";
import { saveVisitorPreferences } from "@/app/actions/visitor-preferences";

interface Initial {
  name: string;
  email: string;
  avatarUrl: string | null;
  headline: string;
  bio: string;
  location: string;
  interests: string[];
  tracks: string[];
}

const INTERESTS: { id: string; emoji: string; label: string }[] = [
  { id: "find_class",    emoji: "🏫", label: "Find a class to join" },
  { id: "find_mentor",   emoji: "🎓", label: "Connect with a mentor" },
  { id: "hackathons",    emoji: "🏆", label: "Compete in hackathons" },
  { id: "marketplace",   emoji: "🛒", label: "Shop the marketplace" },
  { id: "opportunities", emoji: "💼", label: "Find opportunities" },
  { id: "startups",      emoji: "🚀", label: "Discover startups" },
  { id: "study",         emoji: "📚", label: "Study with peers" },
  { id: "ai_tools",      emoji: "🤖", label: "Use AI tools" },
];

const TRACKS: { id: string; emoji: string; label: string }[] = [
  { id: "design",     emoji: "🎨", label: "Design" },
  { id: "dev",        emoji: "💻", label: "Development" },
  { id: "marketing",  emoji: "📢", label: "Marketing" },
  { id: "content",    emoji: "✍️", label: "Content" },
  { id: "ai",         emoji: "🤖", label: "AI" },
  { id: "video",      emoji: "🎬", label: "Video" },
  { id: "data",       emoji: "📊", label: "Data" },
  { id: "product",    emoji: "🚀", label: "Product" },
];

export function ProfileEditor({ initial }: { initial: Initial }) {
  const [name, setName] = useState(initial.name);
  const [headline, setHeadline] = useState(initial.headline);
  const [bio, setBio] = useState(initial.bio);
  const [location, setLocation] = useState(initial.location);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [tracks, setTracks] = useState<string[]>(initial.tracks);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setDirty(true); setter(v); };
  }
  function toggle(arr: string[], setArr: (v: string[]) => void, id: string) {
    setDirty(true);
    setArr(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  }

  function save() {
    if (!name.trim()) { toast.error("Name can't be empty"); return; }
    if (headline.trim().length < 3) { toast.error("Headline needs at least 3 characters"); return; }

    start(async () => {
      const r = await updateMyProfile({
        name: name.trim(),
        headline: headline.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        interests: interests,
        skills: tracks,
      });
      if (!r.ok) { toast.error(r.error); return; }
      // Mirror to the visitor_prefs sidecar so the welcome-carousel
      // localStorage echo and any future signal-driven surfaces stay in
      // sync. Non-fatal if it fails.
      try { await saveVisitorPreferences({ interests, tracks }); } catch {/* */}
      setDirty(false);
      toast.success("Profile updated");
    });
  }

  const initials = (name || "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Your profile</h1>
      <p style={{ color: "#8892A4", fontSize: 13, margin: "0 0 24px" }}>
        Edit anytime. The headline + bio show wherever your name appears across CIOS.
      </p>

      {/* Identity card */}
      <section style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #1E88E5, #AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff", overflow: "hidden", flexShrink: 0 }}>
            {initial.avatarUrl ? <img src={initial.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700, marginBottom: 2 }}>Visitor</div>
            <div style={{ fontSize: 13, color: "#8892A4" }}>{initial.email}</div>
          </div>
        </div>

        <Field label="Display name *">
          <input value={name} onChange={(e) => markDirty(setName)(e.target.value)} maxLength={80} placeholder="Joshua Agbo" style={input} />
        </Field>

        <Field label="One-line headline *">
          <input value={headline} onChange={(e) => markDirty(setHeadline)(e.target.value)} maxLength={120} placeholder="e.g. Aspiring product designer · Lagos" style={input} />
          <div style={hint}>Shown at the top of your profile and beside your name in chats.</div>
        </Field>

        <Field label="About you">
          <textarea value={bio} onChange={(e) => markDirty(setBio)(e.target.value)} rows={5} maxLength={500} placeholder="A couple of sentences — what you're working on, what you want to learn." style={{ ...input, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          <div style={hint}>{bio.length}/500</div>
        </Field>

        <Field label="Location">
          <input value={location} onChange={(e) => markDirty(setLocation)(e.target.value)} maxLength={80} placeholder="e.g. Lagos, Nigeria" style={input} />
        </Field>
      </section>

      {/* Interests */}
      <section style={card}>
        <h2 style={sectionH2}>What brings you here?</h2>
        <p style={sectionSub}>Picks from your welcome — change anytime to retune your dashboard.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {INTERESTS.map((it) => {
            const on = interests.includes(it.id);
            return (
              <button key={it.id} type="button" onClick={() => toggle(interests, setInterests, it.id)}
                style={{ padding: 14, background: on ? "rgba(30,136,229,0.15)" : "#0A0E1A", border: `1px solid ${on ? "rgba(30,136,229,0.50)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", color: on ? "#1E88E5" : "#E8EDF5", textAlign: "left", display: "flex", alignItems: "center", gap: 12, fontSize: 13, fontWeight: on ? 700 : 500 }}>
                <span style={{ fontSize: 18 }}>{it.emoji}</span>{it.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tracks */}
      <section style={card}>
        <h2 style={sectionH2}>Tracks of interest</h2>
        <p style={sectionSub}>Helps us surface the right classes & mentors first.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {TRACKS.map((t) => {
            const on = tracks.includes(t.id);
            return (
              <button key={t.id} type="button" onClick={() => toggle(tracks, setTracks, t.id)}
                style={{ padding: "14px 8px", background: on ? "rgba(38,198,218,0.15)" : "#0A0E1A", border: `1px solid ${on ? "rgba(38,198,218,0.50)" : "rgba(255,255,255,0.07)"}`, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", color: on ? "#26C6DA" : "#E8EDF5", textAlign: "center", fontSize: 11, fontWeight: on ? 700 : 500, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 20 }}>{t.emoji}</span>{t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Sticky save bar */}
      <div style={{ position: "sticky", bottom: 16, display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
        {dirty && <span style={{ alignSelf: "center", fontSize: 12, color: "#FFA726", marginRight: 6 }}>Unsaved changes</span>}
        <button type="button" onClick={save} disabled={pending || !dirty} style={{ padding: "12px 24px", background: pending || !dirty ? "rgba(30,136,229,0.30)" : "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: pending || !dirty ? "not-allowed" : "pointer", boxShadow: pending || !dirty ? "none" : "0 8px 22px -8px rgba(30,136,229,0.6)", fontFamily: "inherit" }}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "#5A6478", textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 6, fontWeight: 700 }}>{label}</label>
      {children}
    </div>
  );
}

const card: React.CSSProperties = { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 20, marginBottom: 16 };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#0A0E1A", border: "1px solid #1F2937", borderRadius: 8, color: "#E8EDF5", fontSize: 13 };
const hint: React.CSSProperties = { fontSize: 11, color: "#5A6478", marginTop: 4 };
const sectionH2: React.CSSProperties = { fontSize: 15, fontWeight: 700, margin: "0 0 4px", color: "#E8EDF5" };
const sectionSub: React.CSSProperties = { fontSize: 12, color: "#8892A4", margin: "0 0 14px" };
