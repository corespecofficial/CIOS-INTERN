"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import {
  createOpportunity, updateOpportunity, deleteOpportunity,
  updateApplicationStatus, upsertRecruiterProfile,
} from "@/app/actions/opportunities";
import { getMatchedApplicants, type MatchedApplicant } from "@/app/actions/talent";
import { getRecruiterBadges } from "@/lib/talent-match";
import { scheduleInterview } from "@/app/actions/recruiter";

interface Listing {
  id: string; title: string; kind: string; status: string;
  applications_count: number; views: number; created_at: string; deadline: string | null;
  featured: boolean; remote: boolean; location: string | null;
}
type App = MatchedApplicant;
interface Profile { company_name: string; company_website: string | null; industry: string | null; company_size: string | null; about: string | null; verified: boolean; company_logo_url: string | null }

const STATUSES = ["submitted", "viewed", "shortlisted", "interview", "hired", "rejected"];
const STATUS_COLOR: Record<string, string> = {
  submitted: "#1E88E5", viewed: "#26C6DA", shortlisted: "#FFC107", interview: "#AB47BC",
  accepted: "#66BB6A", rejected: "#EF5350", hired: "#66BB6A",
};

export function RecruiterClient({ profile, listings, stats }: { profile: Profile | null; listings: Array<Record<string, unknown>>; stats: { open: number; applications: number; shortlisted: number; hires: number } }) {
  const [tab, setTab] = useState<"dashboard" | "listings" | "profile">(profile ? "dashboard" : "profile");
  const [rows, setRows] = useState<Listing[]>(listings as unknown as Listing[]);
  const [editingListing, setEditingListing] = useState<Partial<Listing> | null>(null);
  const [viewingApps, setViewingApps] = useState<{ listing: Listing; apps: App[] } | null>(null);
  const [pending, start] = useTransition();

  if (!profile) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "'Nunito', sans-serif" }}>
        <ProfileEditor initial={null} onSaved={() => window.location.reload()} />
      </div>
    );
  }

  const openApps = async (l: Listing) => {
    const res = await getMatchedApplicants(l.id);
    if (!res.ok) return toast.error(res.error);
    setViewingApps({ listing: l, apps: res.data!.applicants });
  };

  const onListingSave = (d: Partial<Listing>) => start(async () => {
    const payload = {
      title: d.title || "",
      description: (d as { description?: string }).description || "",
      kind: d.kind || "job",
      remote: d.remote || false,
      location: d.location || undefined,
      deadline: d.deadline || undefined,
      featured: d.featured || false,
    };
    if (d.id) {
      const res = await updateOpportunity(d.id, payload);
      if (!res.ok) return toast.error(res.error);
      setRows((prev) => prev.map((r) => r.id === d.id ? { ...r, ...payload } as Listing : r));
      toast.success("Listing updated");
    } else {
      const res = await createOpportunity(payload);
      if (!res.ok) return toast.error(res.error);
      const newRow: Listing = {
        id: res.data!.id, title: payload.title, kind: payload.kind, status: "open",
        applications_count: 0, views: 0, created_at: new Date().toISOString(),
        deadline: payload.deadline || null, featured: payload.featured, remote: payload.remote,
        location: payload.location || null,
      };
      setRows((prev) => [newRow, ...prev]);
      toast.success("Listing published");
    }
    setEditingListing(null);
  });

  const onCloseListing = (id: string, close: boolean) => start(async () => {
    const res = await updateOpportunity(id, { status: close ? "closed" : "open" } as never);
    if (!res.ok) return toast.error(res.error);
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: close ? "closed" : "open" } : r));
    toast.success(close ? "Closed" : "Reopened");
  });
  const onDeleteListing = (id: string) => start(async () => {
    if (!confirm("Delete this listing permanently?")) return;
    const res = await deleteOpportunity(id);
    if (!res.ok) return toast.error(res.error);
    setRows((prev) => prev.filter((r) => r.id !== id));
    toast.success("Deleted");
  });

  const onStatusChange = (appId: string, status: string) => start(async () => {
    const res = await updateApplicationStatus(appId, status);
    if (!res.ok) return toast.error(res.error);
    if (viewingApps) setViewingApps({ ...viewingApps, apps: viewingApps.apps.map((a) => a.id === appId ? { ...a, status } : a) });
    toast.success(`→ ${status}`);
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(30,136,229,0.15), rgba(171,71,188,0.08))", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 16, padding: 22, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>RECRUITER PORTAL</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🏢 {profile.company_name}{profile.verified && <span style={{ fontSize: 14, color: "#1E88E5", marginLeft: 8 }}>✓ verified</span>}</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Manage listings · review applicants · hire talent</p>
          {/* Badges */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {getRecruiterBadges({ hires_count: stats.hires, verified: profile.verified, listings_count: rows.length }).map((b) => (
              <span key={b.id} title={b.description} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 99, background: `${b.color}22`, color: b.color, fontWeight: 700, border: `1px solid ${b.color}44` }}>{b.emoji} {b.label}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button onClick={() => setEditingListing({ kind: "job" })} style={btnPrimary}>+ Post opportunity</button>
          <a href="/talent" style={{ ...btnGhost, textAlign: "center" }}>🌟 Browse talent</a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <Stat label="Open listings" value={stats.open} color="#1E88E5" />
        <Stat label="Applications" value={stats.applications} color="#AB47BC" />
        <Stat label="Shortlisted" value={stats.shortlisted} color="#FFC107" />
        <Stat label="Hires" value={stats.hires} color="#66BB6A" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 14 }}>
        {[{ k: "dashboard", label: "📊 Dashboard" }, { k: "listings", label: `📋 Listings (${rows.length})` }, { k: "profile", label: "🏢 Company profile" }].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as "dashboard" | "listings" | "profile")} style={{
            flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? "rgba(30,136,229,0.15)" : "transparent",
            color: tab === t.k ? "#1E88E5" : "#8892A4",
            border: "none",
          }}>{t.label}</button>
        ))}
      </div>

      {(tab === "dashboard" || tab === "listings") && (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>No listings yet. Click "Post opportunity" to create one.</div>}
          {rows.map((l) => (
            <div key={l.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#E8EDF5" }}>{l.title}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: l.status === "open" ? "rgba(102,187,106,0.15)" : "rgba(136,146,164,0.15)", color: l.status === "open" ? "#66BB6A" : "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{l.status}</span>
                    {l.featured && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "rgba(255,193,7,0.2)", color: "#FFC107", fontWeight: 700 }}>★</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 4 }}>
                    {l.kind} · {l.remote ? "Remote" : l.location || "—"} · {l.applications_count} applications · {l.views} views{l.deadline && ` · Deadline ${new Date(l.deadline).toLocaleDateString()}`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => openApps(l)} style={btnSmallPrimary}>👥 Applicants ({l.applications_count})</button>
                  <button onClick={() => setEditingListing(l)} style={btnSmall}>Edit</button>
                  <button onClick={() => onCloseListing(l.id, l.status === "open")} style={btnSmall}>{l.status === "open" ? "Close" : "Reopen"}</button>
                  <button onClick={() => onDeleteListing(l.id)} style={{ ...btnSmall, color: "#EF5350", borderColor: "rgba(239,83,80,0.3)" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "profile" && <ProfileEditor initial={profile} onSaved={() => toast.success("Profile saved")} />}

      {editingListing && <ListingEditor draft={editingListing} onCancel={() => setEditingListing(null)} onSave={onListingSave} pending={pending} />}
      {viewingApps && <ApplicantsModal listing={viewingApps.listing} apps={viewingApps.apps} onClose={() => setViewingApps(null)} onStatus={onStatusChange} pending={pending} />}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#111827", border: `1px solid ${color}33`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'Space Grotesk', sans-serif", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ProfileEditor({ initial, onSaved }: { initial: Profile | null; onSaved: () => void }) {
  const [p, setP] = useState<Profile>(initial || { company_name: "", company_website: null, industry: null, company_size: null, about: null, verified: false, company_logo_url: null });
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const res = await upsertRecruiterProfile({
      companyName: p.company_name, companyWebsite: p.company_website || undefined,
      industry: p.industry || undefined, companySize: p.company_size || undefined,
      about: p.about || undefined, companyLogoUrl: p.company_logo_url || undefined,
    });
    if (!res.ok) return toast.error(res.error);
    onSaved();
  });
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5", margin: "0 0 4px 0" }}>Company profile</h2>
      <p style={{ fontSize: 12, color: "#8892A4", marginBottom: 16 }}>Visible to applicants on every listing you post.</p>
      <label style={lbl}>Company name *</label>
      <input value={p.company_name} onChange={(e) => setP({ ...p, company_name: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div><label style={lbl}>Website</label><input value={p.company_website || ""} onChange={(e) => setP({ ...p, company_website: e.target.value })} placeholder="https://…" style={{ ...input, width: "100%" }} /></div>
        <div><label style={lbl}>Industry</label><input value={p.industry || ""} onChange={(e) => setP({ ...p, industry: e.target.value })} placeholder="SaaS, finance…" style={{ ...input, width: "100%" }} /></div>
      </div>
      <label style={lbl}>Company size</label>
      <select value={p.company_size || ""} onChange={(e) => setP({ ...p, company_size: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }}>
        <option value="">—</option><option value="1-10">1–10</option><option value="11-50">11–50</option>
        <option value="51-200">51–200</option><option value="201-1000">201–1,000</option><option value="1000+">1,000+</option>
      </select>
      <label style={lbl}>About</label>
      <textarea value={p.about || ""} onChange={(e) => setP({ ...p, about: e.target.value })} rows={4} style={{ ...input, width: "100%", fontFamily: "inherit", resize: "vertical", marginBottom: 14 }} />
      <button onClick={save} disabled={pending || !p.company_name.trim()} style={btnPrimary}>{pending ? "Saving…" : "Save profile"}</button>
    </div>
  );
}

function ListingEditor({ draft, onCancel, onSave, pending }: { draft: Partial<Listing>; onCancel: () => void; onSave: (d: Partial<Listing>) => void; pending: boolean }) {
  const [d, setD] = useState<Partial<Listing & { description: string }>>(draft);
  const toLocal = (iso?: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : "";
  return (
    <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div style={modalPanel}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>{d.id ? "Edit listing" : "New opportunity"}</h2>
          <button onClick={onCancel} style={btnClose}>✕</button>
        </div>
        <label style={lbl}>Title *</label>
        <input value={d.title || ""} onChange={(e) => setD({ ...d, title: e.target.value })} style={{ ...input, width: "100%", marginBottom: 10 }} />
        <label style={lbl}>Description</label>
        <textarea value={d.description || ""} onChange={(e) => setD({ ...d, description: e.target.value })} rows={5} style={{ ...input, width: "100%", fontFamily: "inherit", resize: "vertical", marginBottom: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div><label style={lbl}>Kind</label>
            <select value={d.kind || "job"} onChange={(e) => setD({ ...d, kind: e.target.value })} style={{ ...input, width: "100%" }}>
              <option value="job">Job</option><option value="gig">Gig</option><option value="internship">Internship</option>
              <option value="scholarship">Scholarship</option><option value="grant">Grant</option>
              <option value="collaboration">Collaboration</option><option value="project">Project</option>
              <option value="competition">Competition</option><option value="event">Event</option><option value="volunteer">Volunteer</option>
            </select>
          </div>
          <div><label style={lbl}>Deadline</label>
            <input type="datetime-local" value={toLocal(d.deadline)} onChange={(e) => setD({ ...d, deadline: e.target.value ? new Date(e.target.value).toISOString() : null })} style={{ ...input, width: "100%" }} />
          </div>
          <div><label style={lbl}>Location</label><input value={d.location || ""} onChange={(e) => setD({ ...d, location: e.target.value })} placeholder="City / Country" style={{ ...input, width: "100%" }} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 18 }}>
            <label style={{ fontSize: 12, color: "#E8EDF5", display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={d.remote || false} onChange={(e) => setD({ ...d, remote: e.target.checked })} /> Remote</label>
            <label style={{ fontSize: 12, color: "#FFC107", display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={d.featured || false} onChange={(e) => setD({ ...d, featured: e.target.checked })} /> Featured ★</label>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
          <button onClick={onCancel} style={btnGhost}>Cancel</button>
          <button onClick={() => onSave(d)} disabled={pending || !d.title} style={btnPrimary}>{pending ? "Saving…" : "Publish"}</button>
        </div>
      </div>
    </div>
  );
}

function ApplicantsModal({ listing, apps, onClose, onStatus, pending }: { listing: Listing; apps: App[]; onClose: () => void; onStatus: (id: string, status: string) => void; pending: boolean }) {
  return (
    <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalPanel, width: 720 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>Applicants — {listing.title}</h2>
            <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0" }}>{apps.length} total</p>
          </div>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>
        {apps.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#8892A4" }}>No applicants yet.</div>}
        {apps.map((a) => {
          const m = a.match;
          const gradeColor = m.grade === "excellent" ? "#66BB6A" : m.grade === "strong" ? "#1E88E5" : m.grade === "average" ? "#FFC107" : "#EF5350";
          return (
          <div key={a.id} style={{ padding: 14, background: "#0A0E1A", borderRadius: 10, border: `1px solid ${gradeColor}33`, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{a.applicant?.name || "Unknown"}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${gradeColor}22`, color: gradeColor, fontWeight: 700, textTransform: "uppercase" }}>
                    🤖 {m.score}% · {m.grade}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>{(a.applicant as { headline?: string })?.headline || a.applicant?.email}</div>
                {/* Match breakdown */}
                <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, color: "#8892A4" }}>
                  <span>💡 skills {m.skillsMatched.length}/{m.skillsMatched.length + m.skillsMissing.length}</span>
                  <span>📈 perf {m.signals.performance}/15</span>
                  <span>⭐ rep {m.signals.reputation}/15</span>
                  <span>⚡ level {m.signals.levelSignal}/15</span>
                </div>
                {m.skillsMissing.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 10, color: "#EF5350" }}>Missing: {m.skillsMissing.join(", ")}</div>
                )}
                {(a.applicant as { skills?: string[] })?.skills?.length && <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>{((a.applicant as { skills: string[] }).skills || []).slice(0, 8).map((s) => {
                  const matched = m.skillsMatched.map((x) => x.toLowerCase()).includes(s.toLowerCase());
                  return <span key={s} style={{ fontSize: 10, padding: "2px 7px", background: matched ? "rgba(102,187,106,0.15)" : "rgba(255,255,255,0.05)", borderRadius: 4, color: matched ? "#66BB6A" : "#8892A4", fontWeight: matched ? 700 : 500 }}>{matched ? "✓ " : ""}{s}</span>;
                })}</div>}
                {a.cover_letter && <p style={{ fontSize: 12, color: "#E8EDF5", marginTop: 8, lineHeight: 1.5 }}>{a.cover_letter}</p>}
                {(a.portfolio_url || a.availability || a.expected_salary) && (
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {a.portfolio_url && <a href={a.portfolio_url} target="_blank" rel="noreferrer" style={{ color: "#1E88E5" }}>🔗 Portfolio</a>}
                    {a.availability && <span>🕒 {a.availability}</span>}
                    {a.expected_salary && <span>💰 {a.expected_salary.toLocaleString()}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                <select value={a.status} onChange={(e) => onStatus(a.id, e.target.value)} disabled={pending} style={{
                  ...input, fontSize: 11, fontWeight: 700,
                  background: `${STATUS_COLOR[a.status] || "#8892A4"}22`,
                  color: STATUS_COLOR[a.status] || "#8892A4",
                  textTransform: "uppercase",
                }}>
                  {STATUSES.map((s) => <option key={s} value={s} style={{ background: "#0A0E1A", color: "#E8EDF5" }}>{s}</option>)}
                </select>
                <InterviewScheduler applicationId={a.id} />
                <span style={{ fontSize: 10, color: "#5A6478" }}>Applied {new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

const input: React.CSSProperties = { padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 6 };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSmall: React.CSSProperties = { padding: "6px 12px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer" };
const btnSmallPrimary: React.CSSProperties = { ...btnSmall, background: "#1E88E5", color: "#fff", borderColor: "transparent" };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 560, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto" };

function InterviewScheduler({ applicationId }: { applicationId: string }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [mode, setMode] = useState<"video" | "phone" | "onsite">("video");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    if (!when) return toast.error("Pick a date/time");
    const res = await scheduleInterview({
      applicationId, scheduledAt: new Date(when).toISOString(),
      mode, meetingLink: link || undefined, note: note || undefined,
    });
    if (!res.ok) return toast.error(res.error);
    toast.success("Interview scheduled · applicant notified");
    setOpen(false); setWhen(""); setLink(""); setNote("");
  });

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, background: "rgba(171,71,188,0.15)", color: "#AB47BC", border: "1px solid rgba(171,71,188,0.3)", borderRadius: 6, cursor: "pointer" }}>🎯 Interview</button>
      {open && (
        <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div style={{ ...modalPanel, width: 420 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 15, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>Schedule interview</h2>
              <button onClick={() => setOpen(false)} style={btnClose}>✕</button>
            </div>
            <label style={lbl}>Date & time</label>
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} style={{ ...input, width: "100%", marginBottom: 10 }} />
            <label style={lbl}>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as "video" | "phone" | "onsite")} style={{ ...input, width: "100%", marginBottom: 10 }}>
              <option value="video">Video</option><option value="phone">Phone</option><option value="onsite">On-site</option>
            </select>
            <label style={lbl}>{mode === "onsite" ? "Location" : "Meeting link"}</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder={mode === "onsite" ? "Office address" : "https://meet.google.com/…"} style={{ ...input, width: "100%", marginBottom: 10 }} />
            <label style={lbl}>Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ ...input, width: "100%", fontFamily: "inherit", resize: "vertical", marginBottom: 14 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setOpen(false)} style={btnGhost}>Cancel</button>
              <button onClick={submit} disabled={pending || !when} style={btnPrimary}>{pending ? "Scheduling…" : "📅 Schedule"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
