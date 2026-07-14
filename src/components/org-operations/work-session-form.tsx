"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWorkSession, submitWorkSession } from "@/app/actions/org-operations";

export function WorkSessionForm({ orgSlug, activeSessionId }: { orgSlug: string; activeSessionId?: string }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  const [planned, setPlanned] = useState(""); const [output, setOutput] = useState(""); const [minutes, setMinutes] = useState(60);
  const [summary, setSummary] = useState(""); const [produced, setProduced] = useState(""); const [next, setNext] = useState(""); const [evidence, setEvidence] = useState("");
  function begin() { start(async () => { const r = await startWorkSession(orgSlug, { plannedActivity: planned, expectedOutput: output, estimatedMinutes: minutes }); setMessage(r.ok ? "Work session started." : r.error); if (r.ok) router.refresh(); }); }
  function finish() { if (!activeSessionId) return; start(async () => { const r = await submitWorkSession(orgSlug, activeSessionId, { summary, output: produced, nextAction: next, evidenceUrl: evidence }); setMessage(r.ok ? "Submitted for review. Hours count only after approval." : r.error); if (r.ok) router.refresh(); }); }
  const field: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: 11, borderRadius: 8, border: "1px solid #293246", background: "#0A0E1A", color: "#E8EDF5", marginTop: 5 };
  return <div style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
    <h2 style={{ marginTop: 0, fontSize: 17 }}>{activeSessionId ? "Complete active work session" : "Start a structured work session"}</h2>
    {!activeSessionId ? <><label>Planned activity<textarea value={planned} onChange={e => setPlanned(e.target.value)} style={field}/></label><label>Expected output<textarea value={output} onChange={e => setOutput(e.target.value)} style={field}/></label><label>Estimated minutes<input type="number" min={15} max={720} value={minutes} onChange={e => setMinutes(Number(e.target.value))} style={field}/></label><button disabled={pending} onClick={begin} style={cta}>{pending ? "Starting…" : "Start session"}</button></> : <><label>Work summary<textarea value={summary} onChange={e => setSummary(e.target.value)} style={field}/></label><label>Output produced<textarea value={produced} onChange={e => setProduced(e.target.value)} style={field}/></label><label>Next action<input value={next} onChange={e => setNext(e.target.value)} style={field}/></label><label>Evidence URL<input type="url" value={evidence} onChange={e => setEvidence(e.target.value)} style={field}/></label><button disabled={pending} onClick={finish} style={cta}>{pending ? "Submitting…" : "Submit for review"}</button></>}
    {message && <p role="status" style={{ color: message.includes("review") || message.includes("started") ? "#66BB6A" : "#FF8A80", fontSize: 12 }}>{message}</p>}
  </div>;
}
const cta: React.CSSProperties = { marginTop: 14, padding: "11px 16px", borderRadius: 8, border: 0, background: "#1E88E5", color: "#fff", fontWeight: 800, cursor: "pointer" };
