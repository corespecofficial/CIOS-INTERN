"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { submitAlumniStory, type AlumniStory, type AlumniMember } from "@/app/actions/alumni";

interface Props {
  stories: AlumniStory[];
  alumni: AlumniMember[];
  totalAlumni: number;
}

export function AlumniHubClient({ stories, alumni, totalAlumni }: Props) {
  const [tab, setTab] = useState<"stories" | "directory" | "submit">("stories");

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(255,112,67,0.06))", border: "1px solid rgba(255,193,7,0.25)", borderRadius: 20, padding: 28, marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, fontSize: 80, opacity: 0.06 }}>🎓</div>
        <span style={{ fontSize: 11, color: "#FFC107", fontWeight: 700, letterSpacing: 0.5 }}>ALUMNI NETWORK</span>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#E8EDF5", margin: "4px 0 6px" }}>🎓 CIOS Alumni Hub</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: 0 }}>Celebrating every graduate. A self-reinforcing talent network that grows with every cohort.</p>
        <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
          {[
            { val: totalAlumni, label: "Graduates" },
            { val: stories.length, label: "Success Stories" },
          ].map(({ val, label }) => (
            <div key={label}>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#FFC107", fontFamily: "'Space Grotesk',sans-serif" }}>{val}</span>
              <span style={{ fontSize: 12, color: "#8892A4", marginLeft: 6 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 16 }}>
        {[
          { k: "stories", label: "🌟 Success Stories" },
          { k: "directory", label: `👥 Directory (${totalAlumni})` },
          { k: "submit", label: "✍️ Share Your Story" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as typeof tab)} style={{
            flex: 1, padding: "9px 10px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(255,193,7,0.15)" : "transparent",
            color: tab === t.k ? "#FFC107" : "#8892A4", border: "none",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Stories */}
      {tab === "stories" && (
        <div style={{ display: "grid", gap: 16 }}>
          {stories.length === 0 && <Empty text="No stories yet. Be the first to share yours!" />}
          {stories.map((s) => <StoryCard key={s.id} story={s} />)}
        </div>
      )}

      {/* Directory */}
      {tab === "directory" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {alumni.length === 0 && <Empty text="No alumni yet." />}
            {alumni.map((a) => <AlumniCard key={a.id} member={a} />)}
          </div>
          {totalAlumni > 20 && (
            <Link href="/alumni/directory" style={{ display: "block", textAlign: "center", marginTop: 16, fontSize: 13, color: "#FFC107", fontWeight: 700, textDecoration: "none" }}>
              View full directory ({totalAlumni} graduates) →
            </Link>
          )}
        </>
      )}

      {/* Submit story */}
      {tab === "submit" && <SubmitStoryForm />}
    </div>
  );
}

function StoryCard({ story: s }: { story: AlumniStory }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
      {s.cover_image && <img src={s.cover_image} alt="" style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />}
      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {s.author_avatar
            ? <img src={s.author_avatar} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
            : <span style={{ width: 36, height: 36, borderRadius: "50%", background: "#FFC107", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#0A0E1A" }}>{(s.author_name || "?").charAt(0)}</span>
          }
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{s.author_name || "Alumni"}</div>
            {(s.role || s.company) && <div style={{ fontSize: 11, color: "#FFC107" }}>{[s.role, s.company].filter(Boolean).join(" @ ")}</div>}
          </div>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px" }}>{s.title}</h3>
        <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.body}</p>
        <Link href={`/alumni/stories/${s.id}`} style={{ fontSize: 12, color: "#FFC107", fontWeight: 700, textDecoration: "none" }}>Read full story →</Link>
      </div>
    </div>
  );
}

function AlumniCard({ member: a }: { member: AlumniMember }) {
  return (
    <Link href={`/profile/${a.id}`} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16, textAlign: "center", textDecoration: "none", display: "block", transition: "border-color 0.15s" }}>
      {a.avatar_url
        ? <img src={a.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", margin: "0 auto 8px" }} />
        : <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#FFC107", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0A0E1A", margin: "0 auto 8px" }}>{(a.name || "?").charAt(0)}</span>
      }
      <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5", marginBottom: 2 }}>{a.name || "Alumni"}</div>
      {a.cohort_number && <div style={{ fontSize: 10, color: "#FFC107", marginBottom: 4 }}>Cohort {a.cohort_number}</div>}
      <div style={{ fontSize: 10, color: "#8892A4" }}>Graduated {new Date(a.graduated_at).toLocaleDateString("en", { month: "short", year: "numeric" })}</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
        <span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(30,136,229,0.1)", borderRadius: 4, color: "#1E88E5" }}>{a.xp.toLocaleString()} XP</span>
        <span style={{ fontSize: 10, padding: "2px 7px", background: "rgba(102,187,106,0.1)", borderRadius: 4, color: "#66BB6A" }}>{a.performance}%</span>
      </div>
    </Link>
  );
}

function SubmitStoryForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const r = await submitAlumniStory({ title, body, company: company || undefined, role: role || undefined });
    if (!r.ok) { toast.error(r.error); return; }
    setSubmitted(true);
    toast.success("Story submitted for review! We'll publish it soon.");
  });

  if (submitted) {
    return (
      <div style={{ padding: 40, textAlign: "center", background: "rgba(102,187,106,0.06)", border: "1px solid rgba(102,187,106,0.2)", borderRadius: 14 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>Story submitted!</div>
        <div style={{ fontSize: 13, color: "#8892A4" }}>Our team will review and publish it within 24 hours.</div>
      </div>
    );
  }

  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,193,7,0.2)", borderRadius: 14, padding: 24, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>✍️ Share Your Story</div>
      <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>Inspire the next cohort. Tell them how CIOS helped shape your career. (Alumni only — only visible after graduation.)</div>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={lbl}>Story title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="From intern to full-time designer at Flutterwave" style={inp} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>Current company</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Flutterwave" style={inp} />
          </div>
          <div>
            <label style={lbl}>Your role</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. UI/UX Designer" style={inp} />
          </div>
        </div>
        <div>
          <label style={lbl}>Your story * (min 100 characters)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Share your journey — the struggles, the wins, what you learned, and how CIOS changed your trajectory…" style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          <div style={{ fontSize: 10, color: body.length < 100 ? "#EF5350" : "#66BB6A", marginTop: 4 }}>{body.length} / 100 min characters</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={submit} disabled={pending || body.length < 100 || title.trim().length < 5} style={{ padding: "10px 22px", background: body.length >= 100 ? "rgba(255,193,7,0.15)" : "rgba(255,255,255,0.04)", color: body.length >= 100 ? "#FFC107" : "#5A6478", border: `1px solid ${body.length >= 100 ? "rgba(255,193,7,0.35)" : "transparent"}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: body.length >= 100 ? "pointer" : "default" }}>
            {pending ? "Submitting…" : "🌟 Submit story"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, gridColumn: "1 / -1" }}>{text}</div>;
}

const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
