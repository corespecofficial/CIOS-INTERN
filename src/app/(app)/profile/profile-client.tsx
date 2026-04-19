"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PublicProfile } from "@/lib/db";
import { updateMyProfile, aiSuggestBio } from "@/app/actions/profile";
import { MiniBadgesGrid } from "@/components/engagement/mini-badges-grid";
import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import type { ActivityHeatmap as HeatmapData } from "@/app/actions/activity-heatmap";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import { useIsMobile } from "@/hooks/use-is-mobile";

const ROLE_COLORS: Record<string, string> = {
  intern: "#1E88E5", team_lead: "#66BB6A", instructor: "#AB47BC",
  admin: "#EF5350", super_admin: "#FFC107", moderator: "#AB47BC",
  finance: "#66BB6A", support: "#26C6DA",
};

export function ProfileClient({ profile, editable, heatmap }: { profile: PublicProfile; editable: boolean; heatmap?: HeatmapData | null }) {
  const [p, setP] = useState<PublicProfile>(profile);
  const [editing, setEditing] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  async function uploadImage(kind: "avatar" | "cover", files: FileList | null) {
    if (!files || !files[0]) return;
    const t = toast.loading("Uploading…");
    try {
      const compressed = await compressImage(files[0], {
        maxBytes: 2 * 1024 * 1024,
        maxDim: kind === "cover" ? 1920 : 800,
      });
      const up = await uploadToCloudinary(compressed, {
        folder: `cios-profile/${kind}`, resourceType: "image",
      });
      const patch = kind === "avatar" ? { avatar_url: up.secureUrl } : { cover_url: up.secureUrl };
      const r = await updateMyProfile(patch);
      if (!r.ok) { toast.error(r.error, { id: t }); return; }
      setP((prev) => ({ ...prev, [kind === "avatar" ? "avatar_url" : "cover_url"]: up.secureUrl }));
      toast.success(`${kind === "avatar" ? "Profile photo" : "Cover"} updated`, { id: t });
    } catch (e) {
      toast.error((e as Error).message, { id: t });
    }
  }

  const roleColor = ROLE_COLORS[p.role] || "#1E88E5";
  const initials = (p.name || "?").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
  const avatarSize = isMobile ? 72 : 120;
  const coverHeight = isMobile ? 120 : 180;
  const avatarOffset = Math.floor(avatarSize / 2) + 6;

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", fontFamily: "'Nunito', sans-serif", paddingBottom: isMobile ? 24 : 0 }}>
      {/* Cover + avatar */}
      <div style={{ position: "relative", marginBottom: avatarOffset + 12 }}>
        <div style={{
          width: "100%", height: coverHeight, borderRadius: isMobile ? "12px 12px 0 0" : "16px 16px 0 0",
          background: p.cover_url ? undefined : `linear-gradient(135deg, ${roleColor}, #AB47BC)`,
          backgroundImage: p.cover_url ? `url(${p.cover_url})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
          border: "1px solid rgba(255,255,255,0.07)", borderBottom: "none",
          position: "relative",
        }}>
          {editable && (
            <>
              <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => uploadImage("cover", e.target.files)} />
              <button onClick={() => coverInput.current?.click()} style={coverBtn}>📷 {isMobile ? "" : "Change cover"}</button>
            </>
          )}
        </div>
        <div style={{ position: "absolute", left: isMobile ? 14 : 24, bottom: -avatarOffset }}>
          <div style={{ position: "relative" }}>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt={p.name} style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover", border: "4px solid #0A0E1A" }} />
            ) : (
              <div style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", background: roleColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: isMobile ? 24 : 36, fontWeight: 700, border: "4px solid #0A0E1A" }}>
                {initials}
              </div>
            )}
            {editable && (
              <>
                <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => uploadImage("avatar", e.target.files)} />
                <button onClick={() => avatarInput.current?.click()} style={{ ...avatarEditBtn, width: isMobile ? 26 : 30, height: isMobile ? 26 : 30 }}>📷</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header info */}
      <div style={{ padding: isMobile ? "0 14px" : "0 24px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{p.name}</h1>
              <span style={{ padding: "3px 10px", background: `${roleColor}22`, color: roleColor, fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase", flexShrink: 0 }}>{p.role.replace("_", " ")}</span>
              {(p as { intern_id?: string | null }).intern_id && (
                <span style={{ padding: "3px 8px", background: "rgba(30,136,229,0.12)", color: "#1E88E5", fontSize: 10, fontWeight: 700, borderRadius: 20, letterSpacing: 1, fontFamily: "monospace", border: "1px solid rgba(30,136,229,0.25)", flexShrink: 0 }}>🆔 {(p as unknown as { intern_id: string }).intern_id}</span>
              )}
            </div>
            {p.headline && <p style={{ fontSize: isMobile ? 12 : 14, color: "#8892A4", margin: "4px 0 0 0", fontStyle: "italic" }}>{p.headline}</p>}
            {p.location && <p style={{ fontSize: 12, color: "#5A6478", margin: "4px 0 0 0" }}>📍 {p.location}</p>}
          </div>
          {/* Action buttons — scroll horizontally on mobile */}
          <div style={{ display: "flex", gap: 6, flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "visible", scrollbarWidth: "none", paddingBottom: isMobile ? 4 : 0, flexShrink: 0, maxWidth: isMobile ? "100%" : undefined, width: isMobile ? "100%" : undefined, marginTop: isMobile ? 8 : 0 }}>
            <Link href={`/community/profile/${p.id}`} style={{ ...btnGhost, whiteSpace: "nowrap" }}>View activity</Link>
            {editable && <button onClick={() => setEditing(true)} style={{ ...btnPrimary, whiteSpace: "nowrap" }}>✎ Edit profile</button>}
            {editable && <Link href="/settings" style={{ ...btnGhost, whiteSpace: "nowrap" }}>⚙️ Settings</Link>}
            <button onClick={async () => {
              const url = `${window.location.origin}/profile/${p.id}`;
              try { await navigator.clipboard.writeText(url); toast.success("Profile link copied — share anywhere"); }
              catch { prompt("Copy this link:", url); }
            }} style={{ ...btnGhost, whiteSpace: "nowrap" }}>🔗 Share</button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ margin: isMobile ? "0 14px 16px" : "0 24px 18px", display: "grid", gridTemplateColumns: isMobile ? "repeat(4, 1fr)" : "repeat(auto-fit, minmax(110px, 1fr))", gap: isMobile ? 8 : 10 }}>
        <Stat label="XP" value={p.xp.toLocaleString()} color="#1E88E5" icon="⭐" isMobile={isMobile} />
        <Stat label="Level" value={p.level.toString()} color="#AB47BC" icon="🎖" isMobile={isMobile} />
        <Stat label="Streak" value={`${p.streak}d`} color="#FF7043" icon="🔥" isMobile={isMobile} />
        <Stat label="Score" value={`${p.performance}%`} color="#66BB6A" icon="📈" isMobile={isMobile} />
        {!isMobile && <>
          <Stat label="Reputation" value={p.reputation.toString()} color="#FFC107" icon="🏆" isMobile={false} />
          <Stat label="Courses" value={p.coursesCompleted.toString()} color="#26C6DA" icon="🎓" isMobile={false} />
          <Stat label="Certificates" value={p.certificates.toString()} color="#FFC107" icon="📜" isMobile={false} />
          <Stat label="Posts" value={p.postsCount.toString()} color="#1E88E5" icon="💬" isMobile={false} />
        </>}
      </div>

      {/* Two column */}
      <div className="cios-profile-grid" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 2fr) minmax(0, 1fr)", gap: 14, padding: isMobile ? "0 14px" : "0 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Section title="About">
            {p.bio ? (
              <p style={{ fontSize: 14, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>{p.bio}</p>
            ) : (
              <p style={{ fontSize: 13, color: "#5A6478", margin: 0, fontStyle: "italic" }}>{editable ? "Add a short bio to introduce yourself." : "No bio yet."}</p>
            )}
          </Section>

          {p.goals && (
            <Section title="Goals">
              <p style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>{p.goals}</p>
            </Section>
          )}

          <Section title="Achievements">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {p.coursesCompleted > 0 && <Badge emoji="🎓" label={`${p.coursesCompleted} course${p.coursesCompleted === 1 ? "" : "s"}`} color="#66BB6A" />}
              {p.certificates > 0 && <Badge emoji="📜" label={`${p.certificates} cert${p.certificates === 1 ? "" : "s"}`} color="#FFC107" />}
              {p.streak >= 7 && <Badge emoji="🔥" label={`${p.streak}d streak`} color="#FF7043" />}
              {p.reputation >= 50 && <Badge emoji="🏆" label="Top contributor" color="#FFC107" />}
              {p.level >= 10 && <Badge emoji="🎖" label={`Level ${p.level}`} color="#AB47BC" />}
              {p.xp >= 1000 && <Badge emoji="⭐" label="1K+ XP" color="#1E88E5" />}
              {p.coursesCompleted === 0 && p.certificates === 0 && p.streak < 7 && p.reputation < 50 && (
                <p style={{ fontSize: 12, color: "#5A6478", margin: 0 }}>No achievements yet. Keep going!</p>
              )}
            </div>
          </Section>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {p.skills.length > 0 && (
            <Section title="Skills">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.skills.map((s) => <span key={s} style={pill}>{s}</span>)}
              </div>
            </Section>
          )}
          {p.interests.length > 0 && (
            <Section title="Interests">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.interests.map((s) => <span key={s} style={{ ...pill, background: "rgba(171,71,188,0.1)", color: "#AB47BC" }}>{s}</span>)}
              </div>
            </Section>
          )}
          {Object.keys(p.social_links).length > 0 && (
            <Section title="Links">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(p.social_links).map(([k, v]) => (
                  <a key={k} href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#1E88E5", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {iconFor(k)} {v}
                  </a>
                ))}
              </div>
            </Section>
          )}
          <Section title="Joined">
            <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>
              {new Date(p.joined).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </p>
          </Section>
        </div>
      </div>

      {editing && <EditModal profile={p} isMobile={isMobile} onClose={() => setEditing(false)} onSaved={(np) => { setP(np); setEditing(false); }} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 18 }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", margin: "0 0 10px 0" }}>{title}</h3>
      {children}
    </div>
  );
}
function Stat({ label, value, color, icon, isMobile }: { label: string; value: string; color: string; icon: string; isMobile: boolean }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${color}`, borderRadius: 12, padding: isMobile ? "8px 10px" : "10px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: isMobile ? 9 : 10, color: "#8892A4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: isMobile ? 12 : 14 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: isMobile ? 16 : 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}
function Badge({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", background: `${color}18`, border: `1px solid ${color}40`, color, borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      <span>{emoji}</span> {label}
    </div>
  );
}
function iconFor(k: string): string {
  const key = k.toLowerCase();
  if (key.includes("twitter") || key.includes("x.com")) return "𝕏";
  if (key.includes("github")) return "⚡";
  if (key.includes("linkedin")) return "💼";
  if (key.includes("instagram")) return "📷";
  if (key.includes("youtube")) return "▶️";
  if (key.includes("web") || key.includes("site")) return "🌐";
  return "🔗";
}

function EditModal({ profile, isMobile, onClose, onSaved }: { profile: PublicProfile; isMobile: boolean; onClose: () => void; onSaved: (p: PublicProfile) => void }) {
  const [name, setName] = useState(profile.name);
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [goals, setGoals] = useState(profile.goals);
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [twitter, setTwitter] = useState(profile.social_links.twitter || "");
  const [github, setGithub] = useState(profile.social_links.github || "");
  const [linkedin, setLinkedin] = useState(profile.social_links.linkedin || "");
  const [website, setWebsite] = useState(profile.social_links.website || "");
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  async function onSuggestBio() {
    setSuggesting(true);
    const parsedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const r = await aiSuggestBio({ name, role: profile.role, skills: parsedSkills, existing: bio });
    setSuggesting(false);
    if (!r.ok) { toast.error(r.error); return; }
    if (r.data!.suggestions.length > 0) {
      setBio(r.data!.suggestions[0]);
      toast.success("Bio suggestion applied. Edit to taste.");
    } else toast.error("Couldn't parse AI response");
  }

  async function save() {
    setBusy(true);
    const social: Record<string, string> = {};
    if (twitter) social.twitter = twitter;
    if (github) social.github = github;
    if (linkedin) social.linkedin = linkedin;
    if (website) social.website = website;
    const r = await updateMyProfile({
      name, headline, bio, location, goals,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      social_links: social,
    });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Profile saved");
    onSaved({
      ...profile,
      name, headline, bio, location, goals,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      social_links: social,
    });
  }

  const modalStyle: React.CSSProperties = isMobile ? {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
    background: "#111827", borderRadius: "20px 20px 0 0",
    border: "1px solid rgba(255,255,255,0.1)",
    maxHeight: "92dvh", display: "flex", flexDirection: "column",
  } : {
    background: "#111827", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16, padding: 24, maxWidth: 640, width: "100%",
    maxHeight: "92vh", overflowY: "auto",
  };

  const backdropStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
    zIndex: 200, display: "flex",
    alignItems: isMobile ? "flex-end" : "center",
    justifyContent: isMobile ? "stretch" : "center",
    padding: isMobile ? 0 : 20,
  };

  return (
    <div onClick={onClose} style={backdropStyle}>
      <div onClick={(e) => e.stopPropagation()} style={modalStyle}>
        {/* Mobile drag handle */}
        {isMobile && (
          <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 12px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>Edit profile</h2>
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#E8EDF5", width: 30, height: 30, borderRadius: 8, cursor: "pointer" }}>✕</button>
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: isMobile ? "0 20px 32px" : undefined }}>
          {!isMobile && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#E8EDF5", margin: 0 }}>Edit profile</h2>
              <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#E8EDF5", width: 30, height: 30, borderRadius: 8, cursor: "pointer" }}>✕</button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Full name"><input value={name} onChange={(e) => setName(e.target.value)} style={input} /></Field>
            <Field label="Headline"><input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={140} placeholder="e.g. AI product designer building in Lagos" style={input} /></Field>
            <Field label={(<div style={{ display: "flex", justifyContent: "space-between" }}><span>Bio</span><button onClick={onSuggestBio} disabled={suggesting} style={{ background: "transparent", border: "none", color: "#AB47BC", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{suggesting ? "Thinking…" : "✨ AI suggest"}</button></div>) as unknown as string}>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} placeholder="Short paragraph about you (max 500 chars)" style={{ ...input, minHeight: 90, resize: "vertical" }} />
            </Field>
            {/* 2-col on desktop, stacked on mobile */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" style={input} /></Field>
              <Field label="Skills (comma separated)"><input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="design, AI, product" style={input} /></Field>
            </div>
            <Field label="Interests (comma separated)"><input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="art, fitness, music" style={input} /></Field>
            <Field label="Goals"><textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2} placeholder="What are you trying to achieve?" style={{ ...input, minHeight: 60, resize: "vertical" }} /></Field>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginTop: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>Social links</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <Field label="Twitter / X"><input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="twitter.com/…" style={input} /></Field>
              <Field label="GitHub"><input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="github.com/…" style={input} /></Field>
              <Field label="LinkedIn"><input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" style={input} /></Field>
              <Field label="Website"><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yoursite.com" style={input} /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={onClose} style={btnGhost}>Cancel</button>
              <button onClick={save} disabled={busy} style={btnPrimary}>{busy ? "Saving…" : "Save changes"}</button>
            </div>
          </div>

          {heatmap && (
            <div style={{ marginTop: 18 }}>
              <ActivityHeatmap data={heatmap} title="Activity — last 12 months" />
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <MiniBadgesGrid userId={profile.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#8892A4", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      {children}
    </div>
  );
}

const coverBtn: React.CSSProperties = { position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" };
const avatarEditBtn: React.CSSProperties = { position: "absolute", bottom: 4, right: 4, background: "#1E88E5", color: "#fff", border: "3px solid #0A0E1A", borderRadius: "50%", fontSize: 12, cursor: "pointer", lineHeight: 1, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" };
const btnPrimary: React.CSSProperties = { background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const pill: React.CSSProperties = { padding: "4px 10px", background: "rgba(30,136,229,0.1)", color: "#1E88E5", fontSize: 11, fontWeight: 600, borderRadius: 999 };
const input: React.CSSProperties = { width: "100%", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "#E8EDF5", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
