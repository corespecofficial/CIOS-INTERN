import { notFound } from "next/navigation";
import { getOperationsDashboard } from "@/app/actions/org-operations";

export const dynamic = "force-dynamic";

export default async function OperationsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const result = await getOperationsDashboard(orgSlug);
  if (!result.ok || !result.data.isAdmin) notFound();
  const { programme, meetings, sessions, members } = result.data;
  const approved = sessions.reduce((sum, s) => sum + Number(s.approved_minutes || 0), 0);
  const pending = sessions.filter((s) => ["submitted", "awaiting_review", "evidence_requested"].includes(s.status));
  const cards = [
    ["Programme members", members.filter((m) => m.status === "active").length],
    ["Position slots", members.filter((m) => !m.user_id).length],
    ["Upcoming classes", meetings.length],
    ["Hours awaiting review", pending.length],
    ["Approved work hours", (approved / 60).toFixed(1)],
  ];
  return <div style={{ maxWidth: 1180 }}>
    <h1 style={{ margin: "0 0 4px", fontSize: 26 }}>Programme Operations</h1>
    <p style={{ color: "#8892A4", marginTop: 0 }}>{programme.name} · {programme.starts_on} to {programme.ends_on} · Africa/Lagos</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12 }}>
      {cards.map(([label,value]) => <div key={String(label)} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 16 }}><div style={{ color: "#8892A4", fontSize: 11 }}>{label}</div><div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{value}</div></div>)}
    </div>
    <section style={{ marginTop: 24, background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>Upcoming compulsory classes</h2>
      {meetings.length === 0 ? <p style={{ color: "#8892A4" }}>No upcoming classes.</p> : meetings.map((m) => <div key={m.id} style={{ padding: "12px 0", borderTop: "1px solid #1F2937", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><strong>{m.title}</strong><div style={{ color: "#8892A4", fontSize: 12 }}>{new Date(m.starts_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" })}</div></div><span style={{ color: "#26A69A", fontSize: 12 }}>20:00–22:00 WAT</span></div>)}
    </section>
    <section style={{ marginTop: 18, background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
      <h2 style={{ marginTop: 0, fontSize: 17 }}>Work sessions awaiting human review</h2>
      {pending.length === 0 ? <p style={{ color: "#8892A4" }}>Nothing is waiting for review.</p> : pending.map((s) => <div key={s.id} style={{ padding: "10px 0", borderTop: "1px solid #1F2937", fontSize: 13 }}>Intern {String(s.user_id).slice(0,8)} · {s.submitted_minutes || 0} minutes · <strong>{s.status}</strong></div>)}
    </section>
  </div>;
}
