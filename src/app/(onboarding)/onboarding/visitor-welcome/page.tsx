"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Visitor welcome carousel — multi-step pager that mirrors the intern
 * onboarding visual style (logo, dot pager, card body, Continue CTA).
 *
 * Triggered after `chooseVisitor()` returns; replaces the bare jump to
 * /visitor with a real first-run greeting that explains what the visitor
 * portal is for and lets them light-tag their interests so the dashboard
 * + super-admin queue have something to show.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/use-current-user";
import { saveVisitorPreferences } from "@/app/actions/visitor-preferences";
import { updateMyProfile } from "@/app/actions/profile";

const LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const INTERESTS: { id: string; emoji: string; label: string }[] = [
  { id: "find_org",     emoji: "🏫", label: "Join an organization space" },
  { id: "find_mentor",  emoji: "🎓", label: "Connect with a mentor" },
  { id: "hackathons",   emoji: "🏆", label: "Compete in hackathons" },
  { id: "marketplace",  emoji: "🛒", label: "Shop the marketplace" },
  { id: "opportunities", emoji: "💼", label: "Find opportunities" },
  { id: "startups",     emoji: "🚀", label: "Discover startups" },
  { id: "study",        emoji: "📚", label: "Study with peers" },
  { id: "ai_tools",     emoji: "🤖", label: "Use AI tools" },
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

export default function VisitorWelcomePage() {
  const router = useRouter();
  const user = useCurrentUser();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [tracks, setTracks] = useState<string[]>([]);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // Already onboarded into this carousel — skip back to /visitor.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cios-visitor-welcome");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.completed) router.replace("/visitor");
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = [
    { title: "Welcome to CIOS", subtitle: "Your visitor space — explore, save, apply, level up when you're ready." },
    { title: "What brings you here?", subtitle: "Pick anything that fits — we'll surface those first." },
    { title: "Any tracks of interest?", subtitle: "Optional. Helps us show you the right organizations, programs and mentors." },
    { title: "Tell us about you", subtitle: "Goes on your profile so the people you connect with know who they're meeting. You can edit anytime." },
    { title: "How CIOS works for visitors", subtitle: "Three things you can do without committing to a role yet." },
    { title: "You're all set!", subtitle: "Welcome aboard. Your visitor portal is ready." },
  ];

  const canContinue = () => {
    if (step === 1) return interests.length > 0;
    if (step === 3) return headline.trim().length >= 3;
    return true;
  };

  function next() {
    if (!canContinue()) {
      if (step === 1) setErr("Pick at least one — we'll personalise from there.");
      else if (step === 3) setErr("Add a one-line headline (at least 3 characters).");
      return;
    }
    setErr(null);
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  }
  function back() { setErr(null); setStep(Math.max(0, step - 1)); }

  function toggleInterest(id: string) {
    setInterests((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleTrack(id: string) {
    setTracks((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function finish() {
    setErr(null);
    start(async () => {
      // Persist interests/tracks under signup_signals.visitor_prefs.
      try { await saveVisitorPreferences({ interests, tracks }); } catch {/* non-fatal */}
      // Persist the typed profile fields onto users.headline / bio /
      // location so they show on /visitor/profile and on the user's
      // public profile pages. Errors here are non-fatal — the user is
      // already authenticated and onboarded, missing profile copy is
      // a minor UX issue not a blocker.
      try {
        await updateMyProfile({
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          interests: interests,
          skills: tracks,
        });
      } catch {/* non-fatal */}
      try {
        localStorage.setItem("cios-visitor-welcome", JSON.stringify({
          completedAt: new Date().toISOString(),
          interests, tracks, headline, bio, location, completed: true,
        }));
      } catch {}
      router.replace("/visitor");
    });
  }

  const current = steps[step];

  return (
    <div style={{ minHeight: "100dvh", background: "#0A0E1A", color: "#E8EDF5", fontFamily: "'Nunito', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        {/* Pager dots */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 28 : 8, height: 8, borderRadius: 4,
              background: i <= step ? "#1E88E5" : "rgba(255,255,255,0.10)",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Mascot */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src={LOGO} alt="CIOS" width={80} height={80} style={{ borderRadius: "50%", display: "inline-block", animation: "vw-float 3s ease-in-out infinite" }} />
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
          {current.title}
        </h1>
        <p style={{ textAlign: "center", color: "#8892A4", margin: "0 0 28px", fontSize: 14, lineHeight: 1.5 }}>
          {current.subtitle}
        </p>

        {/* Card */}
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 28, minHeight: 280 }}>
          {step === 0 && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: 15, color: "#B0BEC5", lineHeight: 1.7, marginBottom: 24 }}>
                Hey <span style={{ color: "#1E88E5", fontWeight: 700 }}>{user.firstName || "there"}</span>!
                The visitor portal lets you <strong style={{ color: "#26C6DA" }}>browse, save and apply</strong> across every public surface on CIOS - organization spaces, opportunities, hackathons, mentors, the marketplace - without picking a permanent role.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {[
                  { icon: "🔍", label: "Browse" },
                  { icon: "📨", label: "Apply" },
                  { icon: "🎓", label: "Level up" },
                ].map((it) => (
                  <div key={it.label} style={{ background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 18, textAlign: "center" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{it.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{it.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {INTERESTS.map((it) => {
                const on = interests.includes(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => toggleInterest(it.id)}
                    style={{
                      padding: "14px 14px",
                      background: on ? "rgba(30,136,229,0.15)" : "#0A0E1A",
                      border: `1px solid ${on ? "rgba(30,136,229,0.50)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                      color: on ? "#1E88E5" : "#E8EDF5", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 12,
                      fontSize: 14, fontWeight: on ? 700 : 500,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{it.emoji}</span>
                    {it.label}
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {TRACKS.map((t) => {
                const on = tracks.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTrack(t.id)}
                    style={{
                      padding: "16px 8px", background: on ? "rgba(38,198,218,0.15)" : "#0A0E1A",
                      border: `1px solid ${on ? "rgba(38,198,218,0.50)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                      color: on ? "#26C6DA" : "#E8EDF5", textAlign: "center",
                      fontSize: 12, fontWeight: on ? 700 : 500, display: "flex",
                      flexDirection: "column", alignItems: "center", gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{t.emoji}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label htmlFor="vw-headline" style={vwLabel}>One-line headline *</label>
                <input
                  id="vw-headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Aspiring product designer · Lagos"
                  maxLength={120}
                  style={vwInput}
                />
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 4 }}>
                  Shown at the top of your profile. Keep it short — one breath.
                </div>
              </div>

              <div>
                <label htmlFor="vw-bio" style={vwLabel}>About you (optional)</label>
                <textarea
                  id="vw-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A couple of sentences — what you're working on, what you want to learn."
                  rows={4}
                  maxLength={500}
                  style={{ ...vwInput, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
                />
                <div style={{ fontSize: 11, color: "#5A6478", marginTop: 4 }}>
                  {bio.length}/500
                </div>
              </div>

              <div>
                <label htmlFor="vw-location" style={vwLabel}>Location (optional)</label>
                <input
                  id="vw-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Lagos, Nigeria"
                  maxLength={80}
                  style={vwInput}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ padding: "8px 0" }}>
              {[
                { icon: "🏫", title: "Join an organization", body: "Browse Creative Spaces hosted by vetted organizations and instructors. Join a tenant portal, watch lessons, do assignments, chat, and access files from one workspace." },
                { icon: "🎓", title: "Find a mentor", body: "Connect 1:1 with mentors and alumni who've walked the same path. Book sessions, get feedback, ship better work." },
                { icon: "💼", title: "Apply for opportunities", body: "Internships, gigs, hackathons. Track every application from your visitor dashboard." },
              ].map((b) => (
                <div key={b.title} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{b.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.6 }}>{b.body}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div style={{ textAlign: "center", padding: "36px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <p style={{ fontSize: 15, color: "#B0BEC5", lineHeight: 1.7, margin: 0 }}>
                You&apos;re in, <strong style={{ color: "#E8EDF5" }}>{user.firstName || "friend"}</strong>. Your visitor portal is tuned to{" "}
                {interests.length > 0 ? <strong style={{ color: "#1E88E5" }}>{interests.length} interest{interests.length === 1 ? "" : "s"}</strong> : "general browsing"}
                {tracks.length > 0 ? <> and <strong style={{ color: "#26C6DA" }}>{tracks.length} track{tracks.length === 1 ? "" : "s"}</strong></> : null}.
                Hit Continue to land on your dashboard.
              </p>
            </div>
          )}
        </div>

        {err && <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(239,83,80,0.10)", color: "#FF8A80", border: "1px solid rgba(239,83,80,0.30)", borderRadius: 8, fontSize: 12, textAlign: "center" }}>{err}</div>}

        {/* Footer nav */}
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "space-between", alignItems: "center" }}>
          <button type="button" onClick={back} disabled={step === 0 || pending} style={{ padding: "12px 22px", background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: step === 0 || pending ? "not-allowed" : "pointer", opacity: step === 0 ? 0.4 : 1, fontFamily: "inherit" }}>
            ← Back
          </button>
          <span style={{ fontSize: 11, color: "#5A6478" }}>{step + 1} of {steps.length}</span>
          <button type="button" onClick={next} disabled={pending} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 8px 22px -8px rgba(30,136,229,0.6)" }}>
            {pending ? "Saving…" : step === steps.length - 1 ? "Continue →" : "Continue →"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button type="button" onClick={() => router.replace("/visitor")} style={{ background: "transparent", border: "none", color: "#5A6478", fontSize: 11, cursor: "pointer", padding: 6, fontFamily: "inherit" }}>
            Skip for now
          </button>
        </div>

        <style>{`@keyframes vw-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
      </div>
    </div>
  );
}

const vwLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#5A6478",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  display: "block",
  marginBottom: 6,
  fontWeight: 700,
};

const vwInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#0A0E1A",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "#E8EDF5",
  fontSize: 14,
  fontFamily: "inherit",
};
