"use client";

import { useState, useTransition } from "react";
import { createContentItem, createLead, logOutreach } from "@/app/actions/org-growth";

type Row = Record<string, unknown>;
type Props = { orgSlug: string; leads: Row[]; outreach: Row[]; content: Row[]; members: Row[]; isAdmin: boolean };
const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #263248", background: "#0A0E1A", color: "#E8EDF5" };
const card: React.CSSProperties = { background: "#111827", border: "1px solid #1F2937", borderRadius: 12, padding: 18 };

export function GrowthWorkspace({ orgSlug, leads, outreach, content, members, isAdmin }: Props) {
  const [tab, setTab] = useState<"leads"|"outreach"|"content">("leads");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const submit = (action: (slug: string, form: FormData) => Promise<{ok:boolean;error?:string}>) => (form: FormData) => start(async () => { const result = await action(orgSlug, form); setMessage(result.ok ? "Saved successfully." : result.error || "Unable to save"); if (result.ok) window.location.reload(); });
  const memberOptions = members.map((m) => { const users = m.users as {name?:string;email?:string}|Array<{name?:string;email?:string}>|null; const u = Array.isArray(users) ? users[0] : users; return { id: String(m.user_id), label: u?.name || u?.email || "Member" }; });
  return <div>
    <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>{(["leads","outreach","content"] as const).map(t => <button key={t} onClick={()=>setTab(t)} style={{padding:"9px 14px",borderRadius:8,border:"1px solid #263248",background:tab===t?"#1E88E5":"#111827",color:"white",cursor:"pointer",textTransform:"capitalize"}}>{t}</button>)}</div>
    {message && <p role="status" style={{ color: message.startsWith("Saved") ? "#26A69A" : "#EF5350" }}>{message}</p>}
    {tab === "leads" && <div style={{display:"grid",gridTemplateColumns:"minmax(280px,380px) 1fr",gap:16,alignItems:"start"}}>
      <form action={submit(createLead)} style={card}><h2 style={{marginTop:0,fontSize:17}}>Add verified lead</h2><Field name="prospectName" label="Prospect name" required/><Field name="businessName" label="Business name" required/><Field name="industry" label="Industry"/><Field name="email" label="Email" type="email"/><Field name="telephone" label="Telephone"/><Field name="website" label="Website (HTTPS)" type="url"/><Field name="businessProblem" label="Identified business problem"/><Field name="personalizationNote" label="Personalization note"/><Field name="recommendedOffer" label="Recommended offer"/><Field name="estimatedValue" label="Estimated value (NGN)" type="number"/><Select name="assignedTo" label="Assign to" options={memberOptions}/><button disabled={pending} style={button}>{pending?"Saving...":"Create lead"}</button></form>
      <List title={`Pipeline (${leads.length})`} rows={leads} render={(r)=><><strong>{String(r.business_name)}</strong><div style={muted}>{String(r.prospect_name)} · {String(r.stage).replaceAll("_"," ")} · NGN {Number(r.estimated_deal_value||0).toLocaleString()}</div>{r.next_follow_up_at && <div style={{color:"#FFB300",fontSize:12}}>Follow up {new Date(String(r.next_follow_up_at)).toLocaleString("en-NG")}</div>}</>}/>
    </div>}
    {tab === "outreach" && <div style={{display:"grid",gridTemplateColumns:"minmax(280px,380px) 1fr",gap:16,alignItems:"start"}}>
      <form action={submit(logOutreach)} style={card}><h2 style={{marginTop:0,fontSize:17}}>Log outreach evidence</h2><Select name="leadId" label="Lead" options={leads.map(l=>({id:String(l.id),label:`${l.business_name} — ${l.prospect_name}`}))}/><Select name="channel" label="Channel" options={["email","telephone","whatsapp","linkedin","instagram","facebook","x","other"].map(x=>({id:x,label:x}))}/><Select name="messageType" label="Message type" options={["first_contact","follow_up","response","meeting","proposal","other"].map(x=>({id:x,label:x.replaceAll("_"," ")}))}/><Area name="message" label="Personalized message" required/><Area name="response" label="Response"/><Field name="outcome" label="Outcome"/><Field name="followUpAt" label="Next follow-up" type="datetime-local"/><Field name="evidenceUrl" label="Evidence URL (HTTPS)" type="url"/><button disabled={pending} style={button}>Save outreach</button></form>
      <List title={`Activity history (${outreach.length})`} rows={outreach} render={(r)=>{const lead=r.org_leads as {business_name?:string}|null;return <><strong>{lead?.business_name||"Lead"} · {String(r.channel)}</strong><div style={muted}>{String(r.message_type).replaceAll("_"," ")} · {new Date(String(r.created_at)).toLocaleString("en-NG")}</div><div style={{fontSize:13,marginTop:5}}>{String(r.personalized_message)}</div></>}}/>
    </div>}
    {tab === "content" && <div style={{display:"grid",gridTemplateColumns:"minmax(280px,380px) 1fr",gap:16,alignItems:"start"}}>
      <form action={submit(createContentItem)} style={card}><h2 style={{marginTop:0,fontSize:17}}>Create content item</h2><Field name="brand" label="Brand"/><Field name="campaign" label="Campaign"/><Field name="pillar" label="Content pillar"/><Field name="contentType" label="Content type" required/><Field name="topic" label="Topic" required/><Select name="platform" label="First platform" options={["linkedin","instagram","facebook","tiktok","youtube","youtube_shorts","x","threads","whatsapp_status"].map(x=>({id:x,label:x.replaceAll("_"," ")}))}/><Area name="caption" label="Caption"/><Area name="script" label="Script"/><Select name="assignedTo" label="Assign to" options={memberOptions}/><Field name="dueAt" label="Due date" type="datetime-local"/><button disabled={pending} style={button}>Create content</button></form>
      <List title={`Content calendar (${content.length})`} rows={content} render={(r)=><><strong>{String(r.topic)}</strong><div style={muted}>{String(r.content_type)} · {String(r.status).replaceAll("_"," ")}{r.due_at?` · due ${new Date(String(r.due_at)).toLocaleString("en-NG")}`:""}</div></>}/>
    </div>}
    {!isAdmin && <p style={{...muted,marginTop:16}}>You can only see leads and content assigned to you or created by you.</p>}
  </div>;
}

const button: React.CSSProperties={...input,marginTop:8,background:"#1E88E5",fontWeight:800,cursor:"pointer"}; const muted: React.CSSProperties={color:"#8892A4",fontSize:12,marginTop:4};
function Field({name,label,type="text",required=false}:{name:string;label:string;type?:string;required?:boolean}) { return <label style={{display:"block",fontSize:12,color:"#A9B4C7",marginBottom:10}}>{label}<input name={name} type={type} required={required} style={{...input,marginTop:5}}/></label> }
function Area({name,label,required=false}:{name:string;label:string;required?:boolean}) { return <label style={{display:"block",fontSize:12,color:"#A9B4C7",marginBottom:10}}>{label}<textarea name={name} required={required} rows={3} style={{...input,marginTop:5,resize:"vertical"}}/></label> }
function Select({name,label,options}:{name:string;label:string;options:Array<{id:string;label:string}>}) { return <label style={{display:"block",fontSize:12,color:"#A9B4C7",marginBottom:10}}>{label}<select name={name} required style={{...input,marginTop:5}}><option value="">Select...</option>{options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label> }
function List({title,rows,render}:{title:string;rows:Row[];render:(r:Row)=>React.ReactNode}) { return <section style={card}><h2 style={{marginTop:0,fontSize:17}}>{title}</h2>{rows.length===0?<p style={muted}>No records yet.</p>:rows.map(r=><div key={String(r.id)} style={{padding:"12px 0",borderTop:"1px solid #1F2937"}}>{render(r)}</div>)}</section> }
