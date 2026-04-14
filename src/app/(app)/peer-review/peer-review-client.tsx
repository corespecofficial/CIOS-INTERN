"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { getMyPeerReviews, getReviewsOnMe, submitPeerReview, type PeerReviewRow } from "@/app/actions/peer-review";

export function PeerReviewClient() {
  const [tab, setTab] = useState<"todo" | "received">("todo");
  const [todo, setTodo] = useState<PeerReviewRow[] | null>(null);
  const [received, setReceived] = useState<Awaited<ReturnType<typeof getReviewsOnMe>> extends { ok: true; data?: infer D } ? D : never>(null as never);

  useEffect(() => {
    getMyPeerReviews().then((r) => { if (r.ok) setTodo(r.data!); });
    getReviewsOnMe().then((r) => { if (r.ok) setReceived(r.data!); });
  }, []);

  const pendingCount = todo?.filter((r) => r.status === "pending").length || 0;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <TabBtn active={tab === "todo"} onClick={() => setTab("todo")} label={`Reviews to do ${pendingCount > 0 ? `(${pendingCount})` : ""}`} />
        <TabBtn active={tab === "received"} onClick={() => setTab("received")} label="Feedback on my work" />
      </div>

      {tab === "todo" && <TodoList rows={todo} onDone={(id) => setTodo((prev) => prev?.map((r) => r.id === id ? { ...r, status: "submitted" } : r) || null)} />}
      {tab === "received" && <ReceivedList rows={received} />}
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 16px", border: "none", borderRadius: 10,
      background: active ? "linear-gradient(135deg,#1E88E5,#1565C0)" : "transparent",
      color: active ? "#fff" : "#8892A4", fontWeight: 700, fontSize: 13, cursor: "pointer",
    }}>{label}</button>
  );
}

function TodoList({ rows, onDone }: { rows: PeerReviewRow[] | null; onDone: (id: string) => void }) {
  if (!rows) return <div style={{ color: "#8892A4", padding: 24, textAlign: "center" }}>Loading…</div>;
  if (rows.length === 0) {
    return (
      <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
        <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700 }}>No reviews waiting</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>When a peer submits an assignment, you may be picked to review.</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => <ReviewCard key={r.id} row={r} onDone={() => onDone(r.id)} />)}
    </div>
  );
}

function ReviewCard({ row, onDone }: { row: PeerReviewRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [clarity, setClarity] = useState(3);
  const [effort, setEffort] = useState(3);
  const [insight, setInsight] = useState(3);
  const [feedback, setFeedback] = useState("");
  const [pending, start] = useTransition();
  const done = row.status === "submitted";

  const save = () => start(async () => {
    const r = await submitPeerReview({ reviewId: row.id, clarity, effort, insight, feedback });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`+${r.data!.xp} XP · thanks for reviewing`);
    window.dispatchEvent(new CustomEvent("xp-burst", { detail: { amount: r.data!.xp, label: "Peer review" } }));
    onDone(); setOpen(false);
  });

  return (
    <div style={{ background: "#111827", border: `1px solid ${done ? "rgba(102,187,106,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {row.submitter_avatar ? (
          <img src={row.submitter_avatar} alt="" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
            {(row.submitter_name || "?").slice(0, 2).toUpperCase()}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{row.submitter_name || "Peer"}</div>
          <div style={{ fontSize: 11, color: "#8892A4" }}>{row.lesson_title || "Assignment"}</div>
        </div>
        {done ? (
          <span style={{ fontSize: 11, fontWeight: 800, color: "#66BB6A" }}>✓ DONE</span>
        ) : (
          <button onClick={() => setOpen((v) => !v)} style={btnPrimary}>{open ? "Close" : "Review"}</button>
        )}
      </div>

      {open && !done && (
        <div style={{ marginTop: 14, padding: 14, background: "#0A0E1A", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
          {row.assignment_prompt && (
            <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 8 }}>
              <strong style={{ color: "#E8EDF5" }}>Prompt:</strong> {row.assignment_prompt}
            </div>
          )}
          <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", padding: 10, background: "#111827", borderRadius: 8, marginBottom: 14, maxHeight: 200, overflowY: "auto" }}>
            {row.submission_content || <em style={{ color: "#8892A4" }}>(no text — file only)</em>}
          </div>
          {row.submission_file_url && (
            <a href={row.submission_file_url} target="_blank" rel="noreferrer" style={{ color: "#26C6DA", fontSize: 12, marginBottom: 12, display: "inline-block" }}>
              📎 View attached file
            </a>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
            <StarPicker label="Clarity" value={clarity} onChange={setClarity} />
            <StarPicker label="Effort" value={effort} onChange={setEffort} />
            <StarPicker label="Insight" value={insight} onChange={setInsight} />
          </div>

          <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>Feedback (min 20 chars)</div>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder="What did they do well? What could be stronger?"
            style={{ width: "100%", background: "#111827", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 10, color: "#E8EDF5", fontSize: 13, resize: "vertical", outline: "none" }} />

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={save} disabled={pending} style={btnPrimary}>
              {pending ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 18, padding: 2, color: n <= value ? "#FFC107" : "#334155" }}>★</button>
        ))}
      </div>
    </div>
  );
}

function ReceivedList({ rows }: { rows: Array<{ id: string; submitted_at: string | null; scores: { clarity: number | null; effort: number | null; insight: number | null }; feedback: string | null; reviewer_name: string | null; reviewer_avatar: string | null; lesson_title: string | null }> | null }) {
  if (!rows) return <div style={{ color: "#8892A4", padding: 24, textAlign: "center" }}>Loading…</div>;
  if (rows.length === 0) {
    return (
      <div style={{ background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>📬</div>
        <div style={{ fontSize: 14, color: "#E8EDF5", fontWeight: 700 }}>No feedback yet</div>
        <div style={{ fontSize: 12, color: "#8892A4", marginTop: 4 }}>Once peers review your submissions, it shows up here.</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {r.reviewer_avatar ? (
              <img src={r.reviewer_avatar} alt="" width={32} height={32} style={{ borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1E88E5,#AB47BC)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800 }}>
                {(r.reviewer_name || "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E8EDF5" }}>{r.reviewer_name || "Anon"}</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>{r.lesson_title || "Assignment"} · {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: "#FFC107", fontWeight: 700 }}>
              <span>Clarity {r.scores.clarity}/5</span>
              <span>Effort {r.scores.effort}/5</span>
              <span>Insight {r.scores.insight}/5</span>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#E8EDF5", whiteSpace: "pre-wrap", padding: 12, background: "#0A0E1A", borderRadius: 8 }}>
            {r.feedback}
          </div>
        </div>
      ))}
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px", background: "linear-gradient(135deg,#1E88E5,#1565C0)",
  color: "#fff", border: "none", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: "pointer",
};
