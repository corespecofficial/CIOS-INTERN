/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { applyToOpportunity, toggleSaveOpportunity } from "@/app/actions/opportunities";
import { ConversionGate } from "@/components/portal/conversion-gate";

interface Opp {
  id: string; title: string; description: string; kind: string;
  category: string | null; skills: string[];
  salary_min: number | null; salary_max: number | null; salary_currency: string; salary_period: string | null;
  location: string | null; remote: boolean; requirements: string | null;
  tags: string[]; deadline: string | null; featured: boolean;
  applications_count: number; views: number; created_at: string;
  cover_image_url: string | null; is_promoted: boolean;
  recruiter: { id?: string; name: string; avatar_url: string | null; xp?: number; level?: number; role?: string } | null;
  recruiter_profile: { company_name: string; company_logo_url: string | null; company_website: string | null; verified: boolean; about: string | null; hires_count?: number; rating?: number; plan_tier?: string } | null;
}

const ACCENT = "#FB923C"; // orange — opportunities
const ACCENT_2 = "#F97316";
const INK = "var(--text-primary, #F8FAFC)";
const DIM = "var(--text-tertiary, #94A3B8)";
const MUTED = "var(--text-muted, #64748B)";

const KIND_LABEL: Record<string, string> = {
  job: "Full-time role", gig: "Gig", internship: "Internship", scholarship: "Scholarship", grant: "Grant",
  collaboration: "Collaboration", project: "Project", competition: "Competition", event: "Event", volunteer: "Volunteer",
};

export function OpportunityDetailClient({ opp: o, userRole }: { opp: Opp; userRole: string | null }) {
  const isAnon = userRole === null;
  const [applyOpen, setApplyOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const company = o.recruiter_profile?.company_name || o.recruiter?.name || "CIOS Recruiter";
  const logo = o.recruiter_profile?.company_logo_url || o.recruiter?.avatar_url;
  const salary = (o.salary_min || o.salary_max)
    ? `${o.salary_currency || "NGN"} ${[o.salary_min, o.salary_max].filter(Boolean).map((n) => Number(n).toLocaleString()).join(" – ")}${o.salary_period ? ` / ${o.salary_period}` : ""}`
    : null;

  const onSave = () => {
    setSaved((v) => !v);
    toggleSaveOpportunity(o.id).then((r) => { if (!r.ok) { setSaved((v) => !v); toast.error(r.error); } });
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        className="op-hero"
        style={{
          position: "relative",
          height: 260,
          background: o.cover_image_url
            ? `linear-gradient(180deg, rgba(10,14,26,0.25), rgba(10,14,26,0.85)), url(${o.cover_image_url}) center/cover no-repeat, #0F172A`
            : `radial-gradient(900px 300px at 20% 0%, rgba(251,146,60,0.25), transparent 60%), radial-gradient(700px 300px at 85% 15%, rgba(239,68,68,0.16), transparent 60%), #0F172A`,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      />

      <div style={{ maxWidth: 1080, margin: "-90px auto 0", padding: "0 20px 60px", position: "relative", zIndex: 1 }}>
        <Link href="/opportunities" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 999,
          background: "rgba(10,14,26,0.7)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.1)", color: DIM,
          fontSize: 12, fontWeight: 700, textDecoration: "none", marginBottom: 16,
        }}>
          ← Opportunities
        </Link>

        <div className="op-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 26, alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            {/* Title card */}
            <div style={{ padding: 26, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                <div style={{ width: 60, height: 60, borderRadius: 12, overflow: "hidden", background: "rgba(10,14,26,0.8)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {logo ? (
                    <img src={logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 28 }}>🏢</span>
                  )}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, color: ACCENT, fontWeight: 800 }}>{company}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    {o.recruiter_profile?.verified && <span style={{ color: "#60A5FA", fontWeight: 700 }}>✓ CIOS-verified</span>}
                    {typeof o.recruiter_profile?.hires_count === "number" && o.recruiter_profile.hires_count > 0 && <span>{o.recruiter_profile.hires_count} hires made</span>}
                    {typeof o.recruiter_profile?.rating === "number" && o.recruiter_profile.rating > 0 && <span>★ {o.recruiter_profile.rating.toFixed(1)}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span style={pill(ACCENT)}>{KIND_LABEL[o.kind] || o.kind}</span>
                {o.remote && <span style={pill("#34D399")}>🌐 Remote</span>}
                {o.location && <span style={pill(DIM)}>📍 {o.location}</span>}
                {o.featured && <span style={pillSolid("#F59E0B")}>★ Featured</span>}
                {o.is_promoted && <span style={pillSolid("#A855F7")}>◆ Promoted</span>}
                {o.deadline && <span style={pill("#F87171")}>Deadline {new Date(o.deadline).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>}
              </div>

              <h1 className="op-title" style={{ margin: 0, fontSize: 32, lineHeight: 1.1, letterSpacing: -0.9, fontWeight: 900, color: INK, fontFamily: "'Space Grotesk', 'Nunito', sans-serif" }}>
                {o.title}
              </h1>

              {salary && (
                <div style={{ marginTop: 12, display: "inline-block", padding: "5px 12px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, color: "#4ADE80", fontSize: 13, fontWeight: 800 }}>
                  💰 {salary}
                </div>
              )}
            </div>

            {/* Description */}
            <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
              <h2 style={sectionHead}>About the role</h2>
              <p style={{ fontSize: 15, color: INK, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{o.description}</p>
            </div>

            {/* Requirements */}
            {o.requirements && (
              <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
                <h2 style={sectionHead}>Requirements</h2>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{o.requirements}</p>
              </div>
            )}

            {/* Skills */}
            {o.skills?.length > 0 && (
              <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
                <h2 style={sectionHead}>Skills</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {o.skills.map((s) => (
                    <span key={s} style={{ fontSize: 12, padding: "5px 12px", background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.25)", borderRadius: 999, color: ACCENT, fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* About the recruiter */}
            {o.recruiter_profile?.about && (
              <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, marginBottom: 20 }}>
                <h2 style={sectionHead}>About {company}</h2>
                <p style={{ fontSize: 14, color: INK, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap" }}>{o.recruiter_profile.about}</p>
                <Link href={`/opportunities/recruiter/${o.recruiter?.id || ""}`} style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: ACCENT, fontWeight: 700, textDecoration: "none" }}>
                  See all roles from {company} →
                </Link>
              </div>
            )}
          </div>

          {/* Sticky apply card */}
          <aside style={{ position: "sticky", top: 84 }} className="op-aside">
            <div style={{
              padding: 22,
              background: "linear-gradient(180deg, rgba(251,146,60,0.08), rgba(255,255,255,0.02))",
              border: "1px solid rgba(251,146,60,0.28)",
              borderRadius: 20,
              boxShadow: "0 28px 60px -20px rgba(251,146,60,0.35)",
            }}>
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, color: DIM, fontWeight: 800, textTransform: "uppercase" }}>Apply to this role</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: INK, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: -0.5 }}>
                  {o.applications_count || 0} applicant{o.applications_count === 1 ? "" : "s"}
                </div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontWeight: 700 }}>
                  {o.views || 0} views · posted {new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </div>
              </div>

              <ConversionGate
                action={`Apply for "${o.title}"`}
                benefit="Sign up free — your CIOS profile (XP, rank, projects) is shown to the recruiter automatically."
                intendedRole="public_user"
                variant="card"
              >
                <button
                  onClick={() => setApplyOpen(true)}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`,
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    letterSpacing: 0.2,
                    boxShadow: `0 14px 28px -10px rgba(251,146,60,0.55)`,
                  }}
                >
                  ✉ Apply now
                </button>
              </ConversionGate>

              {!isAnon && (
                <button
                  onClick={onSave}
                  style={{ width: "100%", marginTop: 8, padding: "10px 0", background: saved ? "rgba(251,191,36,0.14)" : "transparent", color: saved ? "#FBBF24" : DIM, border: `1px solid ${saved ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {saved ? "★ Saved" : "☆ Save for later"}
                </button>
              )}

              <p style={{ fontSize: 11, color: MUTED, textAlign: "center", lineHeight: 1.55, margin: "12px 0 0" }}>
                Applications include your verified CIOS performance data — no separate CV upload needed.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {applyOpen && !isAnon && <ApplyModal opp={o} onClose={() => setApplyOpen(false)} />}

      <style>{`
        @media (max-width: 820px) {
          .op-grid { grid-template-columns: 1fr !important; }
          .op-aside { position: static !important; }
          .op-hero { height: 180px !important; }
          .op-title { font-size: 24px !important; letter-spacing: -0.5px !important; }
        }
      `}</style>
    </div>
  );
}

function ApplyModal({ opp, onClose }: { opp: Opp; onClose: () => void }) {
  const [cover, setCover] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [availability, setAvailability] = useState("");
  const [expected, setExpected] = useState<number | "">("");
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const r = await applyToOpportunity({
      opportunityId: opp.id,
      coverLetter: cover,
      portfolioUrl: portfolio || undefined,
      availability: availability || undefined,
      expectedSalary: typeof expected === "number" ? expected : undefined,
    });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Application submitted");
    onClose();
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 24, width: 540, maxWidth: "96vw", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, color: INK, margin: 0, fontWeight: 900, letterSpacing: -0.3 }}>Apply to {opp.title}</h2>
            <p style={{ fontSize: 12, color: MUTED, margin: "4px 0 0" }}>{opp.recruiter_profile?.company_name || "Recruiter"}</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: DIM, borderRadius: 8, width: 32, height: 32, fontSize: 14, cursor: "pointer" }}>✕</button>
        </div>
        <Label>Cover letter</Label>
        <textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={5} placeholder="Why are you a great fit? (Your CIOS portfolio is automatically attached.)" style={textarea} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div><Label>Portfolio / links</Label><input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://…" style={input} /></div>
          <div><Label>Availability</Label><input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Immediate / 2 weeks" style={input} /></div>
        </div>
        <Label>Expected salary ({opp.salary_currency || "NGN"})</Label>
        <input type="number" value={expected} onChange={(e) => setExpected(e.target.value ? parseInt(e.target.value) : "")} style={input} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", background: "transparent", color: DIM, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button onClick={submit} disabled={pending} style={{ padding: "10px 20px", background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_2})`, color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: pending ? "wait" : "pointer" }}>
            {pending ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: MUTED, letterSpacing: 1, textTransform: "uppercase", fontWeight: 800, marginTop: 10, marginBottom: 6 }}>{children}</div>;
}

function pill(color: string): React.CSSProperties {
  return { padding: "3px 10px", fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", background: `${color}22`, color, border: `1px solid ${color}55`, borderRadius: 999, whiteSpace: "nowrap" };
}
function pillSolid(color: string): React.CSSProperties {
  return { padding: "3px 10px", fontSize: 10, letterSpacing: 0.8, fontWeight: 800, textTransform: "uppercase", background: color, color: "#1A1205", borderRadius: 999, whiteSpace: "nowrap" };
}

const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "rgba(0,0,0,0.35)", color: INK,
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 13, outline: "none",
  fontFamily: "inherit", boxSizing: "border-box",
};
const textarea: React.CSSProperties = { ...input, minHeight: 110, resize: "vertical" };

const sectionHead: React.CSSProperties = {
  fontSize: 10, letterSpacing: 2, fontWeight: 800, color: MUTED, textTransform: "uppercase", margin: "0 0 12px",
};
