"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary-upload";
import { submitToRound, castVote, type VotingRound, type VotingSubmission } from "@/app/actions/voting";

const C = {
  bg: "#0A0E1A",
  card: "#111827",
  text: "#E8EDF5",
  dim: "#8892A4",
  border: "rgba(255,255,255,0.08)",
  accent: "#FFC107",
};

interface Props {
  round: VotingRound;
  initialSubmissions: VotingSubmission[];
}

export default function VotingClient({ round, initialSubmissions }: Props) {
  const router = useRouter();
  const [subs, setSubs] = useState(initialSubmissions);
  const [showForm, setShowForm] = useState(false);
  const [pending, startTransition] = useTransition();

  const sorted = [...subs].sort((a, b) => b.vote_count - a.vote_count);
  const leader = sorted[0];
  const runners = sorted.slice(1);
  const totalVotes = subs.reduce((s, x) => s + x.vote_count, 0);
  const mySub = subs.find((s) => s.voted_by_me === false && s.user_id); // placeholder

  function handleVote(id: string) {
    startTransition(async () => {
      const res = await castVote(id);
      if (res.ok) {
        setSubs((prev) => prev.map((s) => {
          if (s.id === id) return { ...s, voted_by_me: res.data!.voted, vote_count: s.vote_count + (res.data!.voted ? 1 : -1) };
          return s;
        }));
      }
    });
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, padding: "20px 16px 60px", maxWidth: 1000, margin: "0 auto" }}>
      <style>{`
        .vote-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 800px) { .vote-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px) { .vote-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-block", background: "rgba(255,193,7,0.12)", border: "1px solid rgba(255,193,7,0.3)", padding: "4px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>
            🏆 Project of the Week
          </div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
            Week of {new Date(round.week_start).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – {new Date(round.week_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </h1>
          <p style={{ margin: "6px 0 0", color: C.dim, fontSize: 13 }}>
            Submit your best project this week. Vote for peers. Winner featured on the homepage + bonus points.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} disabled={!!mySub} style={{ padding: "10px 18px", background: mySub ? "#333" : C.accent, color: mySub ? "#888" : "#000", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: mySub ? "not-allowed" : "pointer" }}>
          {mySub ? "✓ Submitted" : "+ Submit Project"}
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 22 }}>
        <Stat label="Submissions" value={String(subs.length)} color={C.accent} />
        <Stat label="Total Votes" value={String(totalVotes)} color="#4DA8FF" />
        <Stat label="Leader" value={leader ? `@${leader.user_name.split(" ")[0].toLowerCase()}` : "—"} color="#66BB6A" />
      </div>

      {showForm && <SubmitForm roundId={round.id} onClose={() => setShowForm(false)} onSubmitted={(s) => { setSubs((p) => [s, ...p]); setShowForm(false); router.refresh(); }} />}

      {/* Leader banner */}
      {leader && leader.vote_count > 0 && (
        <div style={{ background: `linear-gradient(135deg, ${C.accent}22, ${C.card})`, border: `1px solid ${C.accent}44`, borderRadius: 14, padding: 20, marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 40 }}>👑</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Current Leader</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, letterSpacing: -0.3 }}>{leader.title}</div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>by {leader.user_name} · {leader.vote_count} vote{leader.vote_count === 1 ? "" : "s"}</div>
          </div>
          <VoteButton submission={leader} onVote={handleVote} pending={pending} />
        </div>
      )}

      {/* Grid */}
      {subs.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: C.dim, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
          No submissions yet this week. Be the first.
        </div>
      ) : (
        <div className="vote-grid">
          {runners.map((sub) => (
            <SubmissionCard key={sub.id} submission={sub} onVote={handleVote} pending={pending} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ submission, onVote, pending }: { submission: VotingSubmission; onVote: (id: string) => void; pending: boolean }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${submission.voted_by_me ? C.accent + "44" : C.border}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ aspectRatio: "16/9", background: submission.media_url ? `url(${submission.thumbnail_url || submission.media_url}) center/cover` : `linear-gradient(135deg, ${C.accent}22, ${C.card})`, position: "relative" }}>
        {submission.category && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "3px 8px", borderRadius: 999, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            {submission.category}
          </div>
        )}
      </div>
      <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2, marginBottom: 4 }}>{submission.title}</div>
        <div style={{ fontSize: 11, color: C.dim }}>by {submission.user_name}</div>
        {submission.description && <p style={{ fontSize: 12, color: C.dim, margin: "8px 0 0", lineHeight: 1.5 }}>{submission.description.length > 90 ? `${submission.description.slice(0, 90)}…` : submission.description}</p>}
        <div style={{ marginTop: "auto", paddingTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <VoteButton submission={submission} onVote={onVote} pending={pending} />
          {submission.artifact_url && (
            <a href={submission.artifact_url} target="_blank" rel="noreferrer" style={{ padding: "7px 12px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
              View →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function VoteButton({ submission, onVote, pending }: { submission: VotingSubmission; onVote: (id: string) => void; pending: boolean }) {
  return (
    <button
      onClick={() => onVote(submission.id)}
      disabled={pending}
      style={{
        padding: "7px 14px",
        background: submission.voted_by_me ? C.accent : "transparent",
        color: submission.voted_by_me ? "#000" : C.text,
        border: `1px solid ${submission.voted_by_me ? C.accent : C.border}`,
        borderRadius: 7,
        fontSize: 12,
        fontWeight: 700,
        cursor: "pointer",
        flex: 1,
      }}
    >
      {submission.voted_by_me ? "✓ Voted" : "🔺 Vote"} · {submission.vote_count}
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.dim, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 4, letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}

function SubmitForm({ roundId, onClose, onSubmitted }: { roundId: string; onClose: () => void; onSubmitted: (s: VotingSubmission) => void }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("design");
  const [mediaUrl, setMediaUrl] = useState("");
  const [artifactUrl, setArtifactUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const compressed = await compressImage(f, { maxDim: 1400 });
      const up = await uploadToCloudinary(compressed, { folder: "voting/submissions", resourceType: "image" });
      setMediaUrl(up.secureUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    setErr(null);
    if (!title.trim()) { setErr("Title required"); return; }
    startTransition(async () => {
      const res = await submitToRound({ round_id: roundId, title, description: desc, media_url: mediaUrl, category, artifact_url: artifactUrl });
      if (!res.ok) { setErr(res.error); return; }
      if (res.data) onSubmitted(res.data);
    });
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 22, maxWidth: 520, width: "100%" }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 700 }}>Submit Your Project</h2>

        <label style={lbl}>Cover image</label>
        <input type="file" accept="image/*" onChange={onFile} disabled={uploading} style={{ color: C.text, fontSize: 13, marginBottom: 10 }} />
        {mediaUrl && <img src={mediaUrl} alt="" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />}

        <label style={lbl}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What did you build?" style={inp} />

        <label style={lbl}>Description</label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="One paragraph. What you made and why it matters." style={{ ...inp, resize: "vertical" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 8 }}>
          <div>
            <label style={lbl}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={inp}>
              <option value="design">Design</option>
              <option value="coding">Coding</option>
              <option value="marketing">Marketing</option>
              <option value="writing">Writing</option>
              <option value="video">Video</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Artifact URL (optional)</label>
            <input value={artifactUrl} onChange={(e) => setArtifactUrl(e.target.value)} placeholder="Figma, GitHub, published link…" style={inp} />
          </div>
        </div>

        {err && <div style={{ color: "#EF5350", fontSize: 12, marginTop: 8 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 14px", background: "transparent", color: C.dim, border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={pending || uploading} style={{ flex: 2, padding: "10px 14px", background: C.accent, color: "#000", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
            {pending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontSize: 13,
  marginBottom: 10,
  outline: "none",
  boxSizing: "border-box",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  color: C.dim,
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 4,
};
