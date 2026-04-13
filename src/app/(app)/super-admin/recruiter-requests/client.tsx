"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  inviteRecruiter, revokeRecruiterInvitation,
  updateRequestStatus, approveRecruiterProfile, rejectRecruiterProfile, suspendRecruiter,
} from "@/app/actions/recruiter-access";

interface Req {
  id: string; full_name: string; company_name: string; work_email: string;
  phone: string | null; country: string | null; website: string | null;
  hiring_for: string | null; expected_hires: string | null; budget_range: string | null;
  why_join: string | null; contact_method: string; status: string;
  created_at: string; admin_notes: string | null;
}
interface Profile {
  user_id: string; company_name: string; recruiter_type: string; approval_status: string; created_at: string;
  users: { name: string; email: string; avatar_url: string | null } | null;
}

const STATUS_COLOR: Record<string, string> = {
  new: "#1E88E5", reviewing: "#FFC107", approved: "#66BB6A", rejected: "#EF5350",
  invited: "#AB47BC", pending: "#FFC107", suspended: "#EF5350",
};

export function RecruiterRequestsClient({ requests, pending }: { requests: Req[]; pending: Profile[] }) {
  const [tab, setTab] = useState<"requests" | "pending">("requests");
  const [rows, setRows] = useState<Req[]>(requests);
  const [pendingRows, setPendingRows] = useState<Profile[]>(pending);
  const [invitingFor, setInvitingFor] = useState<Req | null>(null);
  const [selected, setSelected] = useState<Req | null>(null);
  const [pen, start] = useTransition();

  const onStatus = (id: string, status: Req["status"]) => start(async () => {
    const res = await updateRequestStatus(id, status as "new" | "reviewing" | "approved" | "rejected");
    if (!res.ok) return toast.error(res.error);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    toast.success(`→ ${status}`);
  });

  const onApprove = (userId: string) => start(async () => {
    const res = await approveRecruiterProfile(userId);
    if (!res.ok) return toast.error(res.error);
    setPendingRows((prev) => prev.filter((p) => p.user_id !== userId));
    toast.success("Approved — recruiter notified");
  });

  const onReject = (userId: string) => start(async () => {
    const reason = prompt("Reason for rejection (shown to recruiter):");
    if (!reason) return;
    const res = await rejectRecruiterProfile(userId, reason);
    if (!res.ok) return toast.error(res.error);
    setPendingRows((prev) => prev.map((p) => p.user_id === userId ? { ...p, approval_status: "rejected" } : p));
    toast.success("Rejected");
  });

  const onSuspend = (userId: string) => start(async () => {
    if (!confirm("Suspend this recruiter? They'll lose access immediately.")) return;
    const res = await suspendRecruiter(userId);
    if (!res.ok) return toast.error(res.error);
    toast.success("Suspended");
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(171,71,188,0.15)", color: "#AB47BC", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>RECRUITER ACCESS</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🏢 Recruiter requests & approvals</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Review contact-form requests, invite recruiters, and approve onboarding submissions.</p>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        <button onClick={() => setTab("requests")} style={{ ...tabBtn, ...(tab === "requests" ? tabBtnActive : {}) }}>📨 Public requests ({rows.filter((r) => r.status === "new" || r.status === "reviewing").length})</button>
        <button onClick={() => setTab("pending")} style={{ ...tabBtn, ...(tab === "pending" ? tabBtnActive : {}) }}>🕒 Pending approvals ({pendingRows.filter((p) => p.approval_status === "pending").length})</button>
      </div>

      {tab === "requests" && (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.length === 0 && <Empty text="No recruiter requests yet." />}
          {rows.map((r) => (
            <div key={r.id} style={{ background: "#111827", border: `1px solid ${STATUS_COLOR[r.status] || "#8892A4"}22`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>{r.company_name}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${STATUS_COLOR[r.status] || "#8892A4"}22`, color: STATUS_COLOR[r.status] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{r.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#8892A4", marginTop: 2 }}>{r.full_name} · <a href={`mailto:${r.work_email}`} style={{ color: "#1E88E5" }}>{r.work_email}</a>{r.phone && ` · ${r.phone}`}{r.country && ` · ${r.country}`}</div>
                  {r.website && <div style={{ fontSize: 11, marginTop: 2 }}>🔗 <a href={r.website} target="_blank" rel="noreferrer" style={{ color: "#1E88E5" }}>{r.website}</a></div>}
                  {r.why_join && <div style={{ fontSize: 12, color: "#E8EDF5", marginTop: 8, padding: 10, background: "#0A0E1A", borderRadius: 8 }}>{r.why_join}</div>}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, fontSize: 11, color: "#8892A4" }}>
                    {r.hiring_for && <span>👥 {r.hiring_for}</span>}
                    {r.expected_hires && <span>📊 {r.expected_hires} hires</span>}
                    {r.budget_range && <span>💰 {r.budget_range}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#5A6478", marginTop: 6 }}>Submitted {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {r.status === "new" && <button onClick={() => onStatus(r.id, "reviewing")} disabled={pen} style={btnSmall}>👁 Mark reviewing</button>}
                  {(r.status === "new" || r.status === "reviewing") && <button onClick={() => setInvitingFor(r)} style={btnSmallPrimary}>📧 Invite</button>}
                  {(r.status === "new" || r.status === "reviewing") && <button onClick={() => onStatus(r.id, "rejected")} disabled={pen} style={btnSmallDanger}>✕ Reject</button>}
                  <button onClick={() => setSelected(r)} style={btnSmallGhost}>Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "pending" && (
        <div style={{ display: "grid", gap: 10 }}>
          {pendingRows.length === 0 && <Empty text="No pending approvals." />}
          {pendingRows.map((p) => (
            <div key={p.user_id} style={{ background: "#111827", border: `1px solid ${STATUS_COLOR[p.approval_status] || "#8892A4"}22`, borderRadius: 12, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              {p.users?.avatar_url
                ? <img src={p.users.avatar_url} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1E88E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>{p.users?.name?.slice(0, 1) || "?"}</div>}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{p.company_name}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>{p.users?.name} · {p.users?.email} · {p.recruiter_type?.replace("_", " ")}</div>
              </div>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${STATUS_COLOR[p.approval_status] || "#8892A4"}22`, color: STATUS_COLOR[p.approval_status] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{p.approval_status}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <a href={`/community/profile/${p.user_id}`} target="_blank" style={btnSmallGhost}>View details</a>
                {p.approval_status !== "approved" && <button onClick={() => onApprove(p.user_id)} disabled={pen} style={btnSmallSuccess}>✓ Approve</button>}
                {p.approval_status === "pending" && <button onClick={() => onReject(p.user_id)} disabled={pen} style={btnSmallDanger}>✕ Reject</button>}
                <button onClick={() => onSuspend(p.user_id)} disabled={pen} style={btnSmallDanger}>Suspend</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {invitingFor && <InviteModal req={invitingFor} onClose={() => setInvitingFor(null)} onSent={() => { setRows((prev) => prev.map((r) => r.id === invitingFor.id ? { ...r, status: "invited" } : r)); setInvitingFor(null); }} />}
      {selected && <DetailsModal req={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function InviteModal({ req, onClose, onSent }: { req: Req; onClose: () => void; onSent: () => void }) {
  const [type, setType] = useState("company_hr");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    const res = await inviteRecruiter({ email: req.work_email, recruiterType: type, companyName: req.company_name, note, fromRequestId: req.id });
    if (!res.ok) return toast.error(res.error);
    toast.success("Invitation emailed via Clerk");
    onSent();
  });
  return (
    <div style={modalBack} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalPanel}>
        <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 10px 0", fontWeight: 800 }}>Invite {req.company_name}</h2>
        <p style={{ fontSize: 12, color: "#8892A4", margin: "0 0 14px 0" }}>Sends a Clerk invitation to <strong style={{ color: "#E8EDF5" }}>{req.work_email}</strong>. They'll be pre-assigned the recruiter role.</p>
        <label style={lbl}>Recruiter type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
          <option value="company_hr">Company HR</option><option value="agency">Agency Recruiter</option>
          <option value="founder">Startup Founder</option><option value="business_owner">Business Owner</option>
          <option value="project_client">Project Client</option><option value="talent_scout">Talent Scout</option>
          <option value="ngo">NGO / Scholarship Manager</option>
        </select>
        <label style={lbl}>Internal note (optional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...input, resize: "vertical", fontFamily: "inherit" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={send} disabled={pending} style={btnPrimary}>{pending ? "Sending…" : "📧 Send invitation"}</button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ req, onClose }: { req: Req; onClose: () => void }) {
  return (
    <div style={modalBack} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalPanel, width: 580 }}>
        <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: "0 0 14px 0", fontWeight: 800 }}>{req.company_name}</h2>
        <dl style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px 14px", margin: 0, fontSize: 13 }}>
          <dt style={dt}>Contact</dt><dd style={dd}>{req.full_name}</dd>
          <dt style={dt}>Email</dt><dd style={dd}><a href={`mailto:${req.work_email}`} style={{ color: "#1E88E5" }}>{req.work_email}</a></dd>
          <dt style={dt}>Phone</dt><dd style={dd}>{req.phone || "—"}</dd>
          <dt style={dt}>Country</dt><dd style={dd}>{req.country || "—"}</dd>
          <dt style={dt}>Website</dt><dd style={dd}>{req.website ? <a href={req.website} target="_blank" rel="noreferrer" style={{ color: "#1E88E5" }}>{req.website}</a> : "—"}</dd>
          <dt style={dt}>Hiring for</dt><dd style={dd}>{req.hiring_for || "—"}</dd>
          <dt style={dt}>Expected hires</dt><dd style={dd}>{req.expected_hires || "—"}</dd>
          <dt style={dt}>Budget</dt><dd style={dd}>{req.budget_range || "—"}</dd>
          <dt style={dt}>Preferred contact</dt><dd style={dd}>{req.contact_method}</dd>
        </dl>
        {req.why_join && <div style={{ marginTop: 14, padding: 12, background: "#0A0E1A", borderRadius: 8, fontSize: 13, color: "#E8EDF5", lineHeight: 1.6 }}>{req.why_join}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} style={btnGhost}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>{text}</div>; }

const tabBtn: React.CSSProperties = { flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", background: "transparent", color: "#8892A4", border: "none" };
const tabBtnActive: React.CSSProperties = { background: "rgba(171,71,188,0.15)", color: "#AB47BC" };
const btnSmall: React.CSSProperties = { padding: "5px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, cursor: "pointer" };
const btnSmallPrimary: React.CSSProperties = { ...btnSmall, background: "#AB47BC", color: "#fff", borderColor: "transparent" };
const btnSmallSuccess: React.CSSProperties = { ...btnSmall, background: "#66BB6A", color: "#fff", borderColor: "transparent" };
const btnSmallDanger: React.CSSProperties = { ...btnSmall, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" };
const btnSmallGhost: React.CSSProperties = { ...btnSmall, textDecoration: "none", display: "inline-block" };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #AB47BC, #8E24AA)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const input: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box", marginBottom: 8 };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 4 };
const dt: React.CSSProperties = { color: "#8892A4", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 };
const dd: React.CSSProperties = { color: "#E8EDF5", margin: 0 };
const modalBack: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 480, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto" };
