import { notFound } from "next/navigation";
import { getOperationsDashboard } from "@/app/actions/org-operations";
import { AttendanceActions } from "@/components/org-operations/attendance-actions";

export const dynamic = "force-dynamic";
export default async function MyDayPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params; const result = await getOperationsDashboard(orgSlug); if (!result.ok) notFound();
  const { programme, meetings, sessions } = result.data; const next = meetings[0]; const approved = sessions.reduce((n,s) => n + Number(s.approved_minutes || 0),0);
  const remaining = Math.max(0, Math.ceil((new Date(`${programme.ends_on}T23:59:59+01:00`).getTime() - new Date(result.data.serverNow).getTime()) / 86400000));
  return <div style={{ maxWidth: 960 }}><h1 style={{ margin: "0 0 4px" }}>My Day</h1><p style={{ color: "#8892A4", marginTop: 0 }}>{remaining} programme days remaining · Africa/Lagos</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 18 }}>{[["Approved hours",(approved/60).toFixed(1)],["Pending sessions",sessions.filter(s=>s.status==='awaiting_review').length],["Daily target","5 hours"]].map(([l,v])=><div key={String(l)} style={{ padding:16,background:"#111827",border:"1px solid #1F2937",borderRadius:12 }}><div style={{fontSize:11,color:"#8892A4"}}>{l}</div><strong style={{fontSize:24}}>{v}</strong></div>)}</div>
    <section style={{ padding: 18, background: "#111827", border: "1px solid #1F2937", borderRadius: 12 }}><h2 style={{ marginTop: 0, fontSize: 17 }}>Next compulsory class</h2>{next ? <><strong>{next.title}</strong><p style={{color:"#8892A4"}}>{new Date(next.starts_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos",dateStyle:"full",timeStyle:"short"})}</p><AttendanceActions orgSlug={orgSlug} meetingId={next.id}/></> : <p style={{color:"#8892A4"}}>No upcoming class.</p>}</section>
  </div>;
}
