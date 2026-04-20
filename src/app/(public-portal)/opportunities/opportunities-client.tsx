"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { applyToOpportunity, toggleSaveOpportunity } from "@/app/actions/opportunities";
import { getRecruiterBadges } from "@/lib/talent-match";

interface Opp {
  id: string; title: string; description: string; kind: string; category: string | null;
  skills: string[]; salary_min: number | null; salary_max: number | null; salary_currency: string;
  salary_period: string | null; location: string | null; remote: boolean; requirements: string | null;
  tags: string[]; deadline: string | null; featured: boolean; applications_count: number; views: number;
  created_at: string;
  recruiter: { name: string; avatar_url: string | null } | null;
  recruiter_profile: { company_name: string; company_logo_url: string | null; verified: boolean; hires_count?: number; rating?: number } | null;
}
interface App {
  id: string; opportunity_id: string; status: string; created_at: string;
  opportunity: { id: string; title: string; kind: string; location: string | null; remote: boolean } | null;
}

const KIND_LABEL: Record<string, string> = {
  job: "Job", gig: "Gig", internship: "Internship", scholarship: "Scholarship", grant: "Grant",
  collaboration: "Collaboration", project: "Project", competition: "Competition", event: "Event", volunteer: "Volunteer",
};
const KIND_COLOR: Record<string, string> = {
  job: "#1E88E5", gig: "#26C6DA", internship: "#AB47BC", scholarship: "#66BB6A", grant: "#FFC107",
  collaboration: "#FF7043", project: "#EF5350", competition: "#FFC107", event: "#26C6DA", volunteer: "#66BB6A",
};
const STATUS_COLOR: Record<string, string> = {
  submitted: "#1E88E5", viewed: "#26C6DA", shortlisted: "#FFC107", interview: "#AB47BC",
  accepted: "#66BB6A", rejected: "#EF5350", hired: "#66BB6A",
};

export function OpportunitiesClient({ opps, applications, savedIds, userRole }: { opps: Opp[]; applications: App[]; savedIds: string[]; userRole: string | null }) {
  const isAnon = userRole === null;
  const [tab, setTab] = useState<"browse" | "gigs" | "applications" | "saved">("browse");
  const [kind, setKind] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds));
  const [applying, setApplying] = useState<Opp | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set(applications.map((a) => a.opportunity_id)));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return opps.filter((o) => {
      if (kind !== "all" && o.kind !== kind) return false;
      if (remoteOnly && !o.remote) return false;
      if (q && !(o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || o.skills.some((s) => s.toLowerCase().includes(q)))) return false;
      return true;
    });
  }, [opps, kind, remoteOnly, search]);

  const gigs = useMemo(() => {
    const q = search.toLowerCase();
    return opps.filter((o) => {
      if (o.kind !== "gig") return false;
      if (remoteOnly && !o.remote) return false;
      if (q && !(o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || o.skills.some((s) => s.toLowerCase().includes(q)))) return false;
      return true;
    });
  }, [opps, remoteOnly, search]);

  const savedList = opps.filter((o) => saved.has(o.id));
  const canPost = userRole === "recruiter" || userRole === "admin" || userRole === "super_admin";

  const onToggleSave = (id: string) => {
    // Optimistic
    const next = new Set(saved);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSaved(next);
    toggleSaveOpportunity(id).then((res) => { if (!res.ok) { setSaved(saved); toast.error(res.error); } });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, rgba(255,112,67,0.15), rgba(239,83,80,0.05))", border: "1px solid rgba(255,112,67,0.25)", borderRadius: 16, padding: 22, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(255,112,67,0.15)", color: "#FF7043", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 4 }}>OPPORTUNITIES</span>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>💼 Find your next move</h1>
          <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Jobs · gigs · internships · scholarships · collaborations</p>
        </div>
        {canPost && <Link href="/recruiter" style={btnPrimary}>📣 Recruiter portal</Link>}
      </div>

      {/* Tabs — anonymous visitors only see Browse + Gigs; Applications + Saved unlock after sign-up. */}
      <div style={{ display: "flex", gap: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {(isAnon ? [
          { k: "browse", label: `🔍 Browse (${filtered.length})` },
          { k: "gigs", label: `⚡ Gig Board (${gigs.length})` },
        ] : [
          { k: "browse", label: `🔍 Browse (${filtered.length})` },
          { k: "gigs", label: `⚡ Gig Board (${gigs.length})` },
          { k: "applications", label: `📨 Applications (${applications.length})` },
          { k: "saved", label: `🔖 Saved (${saved.size})` },
        ]).map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as "browse" | "gigs" | "applications" | "saved")} style={{
            flex: 1, padding: "9px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: tab === t.k ? (t.k === "gigs" ? "rgba(38,198,218,0.15)" : "rgba(255,112,67,0.15)") : "transparent",
            color: tab === t.k ? (t.k === "gigs" ? "#26C6DA" : "#FF7043") : "#8892A4",
            border: "none", whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      {/* Search + filter bar (shared for browse + gigs) */}
      {(tab === "browse" || tab === "gigs") && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search title, skills, description…" style={{ ...input, flex: 1, minWidth: 200 }} />
          {tab === "browse" && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={input}>
              <option value="all">All kinds</option>
              {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#E8EDF5", padding: "8px 10px", background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} /> Remote only
          </label>
        </div>
      )}

      {tab === "browse" && renderList(filtered)}

      {tab === "gigs" && (
        <>
          {/* Gig board header */}
          <div style={{ background: "rgba(38,198,218,0.08)", border: "1px solid rgba(38,198,218,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#26C6DA" }}>Gig Board</div>
              <div style={{ fontSize: 11, color: "#8892A4" }}>Short-term freelance projects · Apply fast · Get paid</div>
            </div>
          </div>
          {renderGigList(gigs)}
        </>
      )}

      {tab === "applications" && (
        <div style={{ display: "grid", gap: 10 }}>
          {applications.length === 0 && <Empty text="No applications yet. Browse opportunities to apply." />}
          {applications.map((a) => (
            <div key={a.id} style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EDF5" }}>{a.opportunity?.title || "(Deleted)"}</div>
                  <div style={{ fontSize: 11, color: "#8892A4", marginTop: 2 }}>
                    Applied {new Date(a.created_at).toLocaleDateString()} · {a.opportunity?.remote ? "Remote" : a.opportunity?.location || "—"}
                  </div>
                </div>
                <span style={{ padding: "4px 12px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${STATUS_COLOR[a.status] || "#8892A4"}22`, color: STATUS_COLOR[a.status] || "#8892A4", textTransform: "uppercase" }}>{a.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "saved" && renderList(savedList)}

      {applying && <ApplyModal opp={applying} onClose={() => setApplying(null)} onApplied={(id) => { setAppliedIds((prev) => new Set(prev).add(id)); setApplying(null); }} />}
    </div>
  );

  function renderGigList(list: Opp[]) {
    if (list.length === 0) return <Empty text="No gigs available right now. Check back soon." />;
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {list.map((o) => {
          const logo = o.recruiter_profile?.company_logo_url || o.recruiter?.avatar_url;
          const company = o.recruiter_profile?.company_name || o.recruiter?.name || "Client";
          const isApplied = appliedIds.has(o.id);
          const isSaved = saved.has(o.id);
          const salary = o.salary_min || o.salary_max
            ? `${o.salary_currency || "NGN"} ${[o.salary_min, o.salary_max].filter(Boolean).join("–")}`
            : null;
          return (
            <div key={o.id} style={{ background: "#111827", border: "1px solid rgba(38,198,218,0.15)", borderRadius: 14, padding: 16, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "start" }}>
              {/* Logo */}
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#0A0E1A", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18 }}>⚡</span>}
              </div>
              {/* Body */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 3 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{o.title}</h3>
                  {o.featured && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(255,193,7,0.2)", color: "#FFC107", fontWeight: 700 }}>★ FEATURED</span>}
                  {o.remote && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontWeight: 700 }}>REMOTE</span>}
                </div>
                <div style={{ fontSize: 11, color: "#8892A4", marginBottom: 5 }}>
                  {company}
                  {salary && <span style={{ color: "#26C6DA", fontWeight: 700, marginLeft: 6 }}>{salary}</span>}
                  {o.deadline && <span> · Deadline {new Date(o.deadline).toLocaleDateString()}</span>}
                </div>
                <div style={{ fontSize: 12, color: "#E8EDF5", lineHeight: 1.5, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {o.description}
                </div>
                {o.skills?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {o.skills.slice(0, 5).map((s) => (
                      <span key={s} style={{ fontSize: 10, padding: "2px 7px", background: "rgba(38,198,218,0.08)", border: "1px solid rgba(38,198,218,0.2)", borderRadius: 4, color: "#26C6DA" }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                {isApplied
                  ? <span style={{ ...btnSmall, background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderColor: "rgba(102,187,106,0.3)", cursor: "default", whiteSpace: "nowrap" }}>✓ Applied</span>
                  : isAnon
                    ? <Link href={`/opportunities/${o.id}`} style={{ ...btnSmallPrimary, background: "#26C6DA", borderColor: "transparent", whiteSpace: "nowrap", textDecoration: "none" }}>Sign up to apply</Link>
                    : <button onClick={() => setApplying(o)} style={{ ...btnSmallPrimary, background: "#26C6DA", borderColor: "transparent", whiteSpace: "nowrap" }}>⚡ Apply</button>}
                {!isAnon && (
                  <button onClick={() => onToggleSave(o.id)} style={{ ...btnSmall, background: isSaved ? "rgba(255,193,7,0.15)" : "transparent", color: isSaved ? "#FFC107" : "#8892A4", borderColor: isSaved ? "rgba(255,193,7,0.3)" : "rgba(255,255,255,0.1)" }}>
                    {isSaved ? "★" : "☆"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderList(list: Opp[]) {
    if (list.length === 0) return <Empty text="No opportunities match." />;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {list.map((o) => {
          const logo = o.recruiter_profile?.company_logo_url || o.recruiter?.avatar_url;
          const company = o.recruiter_profile?.company_name || o.recruiter?.name || "Recruiter";
          const isApplied = appliedIds.has(o.id);
          const isSaved = saved.has(o.id);
          const salary = o.salary_min || o.salary_max ? `${o.salary_currency || ""} ${[o.salary_min, o.salary_max].filter(Boolean).join("–")}${o.salary_period ? ` / ${o.salary_period}` : ""}` : "";
          return (
            <div key={o.id} style={{ background: "#111827", border: `1px solid ${o.featured ? "rgba(255,193,7,0.3)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: 18, display: "flex", gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: "#0A0E1A", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {logo ? <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🏢</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>{o.title}</h3>
                  {o.featured && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: "rgba(255,193,7,0.2)", color: "#FFC107", fontWeight: 700 }}>★ FEATURED</span>}
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${KIND_COLOR[o.kind] || "#8892A4"}22`, color: KIND_COLOR[o.kind] || "#8892A4", fontWeight: 700, textTransform: "uppercase" }}>{KIND_LABEL[o.kind] || o.kind}</span>
                  {o.remote && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "rgba(102,187,106,0.15)", color: "#66BB6A", fontWeight: 700 }}>REMOTE</span>}
                  {o.recruiter_profile?.verified && <span style={{ fontSize: 10, color: "#1E88E5" }}>✓ verified</span>}
                  {(() => {
                    const badges = getRecruiterBadges({
                      hires_count: o.recruiter_profile?.hires_count,
                      rating: o.recruiter_profile?.rating,
                      verified: o.recruiter_profile?.verified,
                    });
                    const top = badges.filter((b) => b.id !== "verified").slice(0, 1);
                    return top.map((b) => <span key={b.id} title={b.description} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 99, background: `${b.color}22`, color: b.color, fontWeight: 700 }}>{b.emoji} {b.label}</span>);
                  })()}
                </div>
                <div style={{ fontSize: 12, color: "#8892A4", marginBottom: 6 }}>
                  {company} · {o.location || "Anywhere"}{salary && ` · ${salary}`}{o.deadline && ` · Deadline ${new Date(o.deadline).toLocaleDateString()}`}
                </div>
                <div style={{ fontSize: 13, color: "#E8EDF5", lineHeight: 1.5, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {o.description}
                </div>
                {o.skills?.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                    {o.skills.slice(0, 6).map((s) => <span key={s} style={{ fontSize: 10, padding: "2px 7px", background: "rgba(255,255,255,0.05)", borderRadius: 4, color: "#8892A4" }}>{s}</span>)}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Link href={`/opportunities/${o.id}`} style={{ ...btnSmall, textDecoration: "none", color: "#E8EDF5" }}>Details →</Link>
                  {isApplied
                    ? <span style={{ ...btnSmall, background: "rgba(102,187,106,0.15)", color: "#66BB6A", borderColor: "rgba(102,187,106,0.3)", cursor: "default" }}>✓ Applied</span>
                    : isAnon
                      ? <Link href={`/opportunities/${o.id}`} style={{ ...btnSmallPrimary, textDecoration: "none" }}>Sign up to apply</Link>
                      : <button onClick={() => setApplying(o)} style={btnSmallPrimary}>Apply</button>}
                  {!isAnon && (
                    <button onClick={() => onToggleSave(o.id)} style={{ ...btnSmall, background: isSaved ? "rgba(255,193,7,0.15)" : "transparent", color: isSaved ? "#FFC107" : "#8892A4", borderColor: isSaved ? "rgba(255,193,7,0.3)" : "rgba(255,255,255,0.1)" }}>
                      {isSaved ? "★ Saved" : "☆ Save"}
                    </button>
                  )}
                  <span style={{ fontSize: 11, color: "#5A6478", marginLeft: "auto" }}>{o.applications_count} applied · {o.views} views</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
}

function ApplyModal({ opp, onClose, onApplied }: { opp: Opp; onClose: () => void; onApplied: (id: string) => void }) {
  const [cover, setCover] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [availability, setAvailability] = useState("");
  const [expected, setExpected] = useState<number | "">("");
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const res = await applyToOpportunity({
      opportunityId: opp.id, coverLetter: cover, portfolioUrl: portfolio || undefined,
      availability: availability || undefined, expectedSalary: typeof expected === "number" ? expected : undefined,
    });
    if (!res.ok) { toast.error(res.error); return; }
    toast.success("Application submitted");
    onApplied(opp.id);
  });

  return (
    <div style={modalBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalPanel}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, color: "#E8EDF5", margin: 0, fontWeight: 800 }}>Apply to {opp.title}</h2>
            <p style={{ fontSize: 11, color: "#8892A4", margin: "2px 0 0 0" }}>{opp.recruiter_profile?.company_name || "Recruiter"}</p>
          </div>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>
        <label style={lbl}>Cover letter</label>
        <textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={5} placeholder="Why are you a great fit?" style={{ ...input, width: "100%", fontFamily: "inherit", resize: "vertical", marginBottom: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div><label style={lbl}>Portfolio / links</label><input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" style={{ ...input, width: "100%" }} /></div>
          <div><label style={lbl}>Availability</label><input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Immediate / 2 weeks" style={{ ...input, width: "100%" }} /></div>
        </div>
        <label style={lbl}>Expected salary ({opp.salary_currency || "NGN"})</label>
        <input type="number" value={expected} onChange={(e) => setExpected(e.target.value ? parseInt(e.target.value) : "")} style={{ ...input, width: "100%", marginBottom: 14 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={pending} style={btnPrimary}>{pending ? "Submitting…" : "📨 Submit application"}</button>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 40, textAlign: "center", color: "#8892A4", background: "#111827", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14 }}>{text}</div>;
}

const input: React.CSSProperties = { padding: "8px 10px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 6 };
const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg, #FF7043, #EF5350)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", display: "inline-block" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSmall: React.CSSProperties = { padding: "6px 14px", fontSize: 11, fontWeight: 700, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, cursor: "pointer" };
const btnSmallPrimary: React.CSSProperties = { ...btnSmall, background: "#1E88E5", color: "#fff", borderColor: "transparent" };
const btnClose: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "transparent", color: "#8892A4", border: "1px solid rgba(255,255,255,0.08)", fontSize: 14, cursor: "pointer" };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 };
const modalPanel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, width: 520, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto" };
