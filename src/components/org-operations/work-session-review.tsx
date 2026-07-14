"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewWorkSession } from "@/app/actions/org-operations";

export function WorkSessionReview({orgSlug,sessionId,submittedMinutes}:{orgSlug:string;sessionId:string;submittedMinutes:number}) {
  const router=useRouter(); const [minutes,setMinutes]=useState(submittedMinutes); const [feedback,setFeedback]=useState(""); const [message,setMessage]=useState(""); const [pending,start]=useTransition();
  function review(){start(async()=>{const r=await reviewWorkSession(orgSlug,sessionId,minutes,feedback);setMessage(r.ok?"Review recorded.":r.error);if(r.ok)router.refresh();});}
  const field:React.CSSProperties={padding:8,borderRadius:6,border:"1px solid #293246",background:"#0A0E1A",color:"#E8EDF5"};
  return <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginTop:8}}><input aria-label="Approved minutes" type="number" min={0} max={submittedMinutes} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} style={{...field,width:90}}/><input aria-label="Reviewer feedback" value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Feedback / reason" style={{...field,flex:"1 1 180px"}}/><button disabled={pending} onClick={review} style={{padding:"8px 12px",border:0,borderRadius:6,background:"#26A69A",color:"white",fontWeight:700}}>{pending?"Saving…":"Record review"}</button>{message&&<span style={{fontSize:11,color:message.includes("recorded")?"#66BB6A":"#FF8A80"}}>{message}</span>}</div>;
}
