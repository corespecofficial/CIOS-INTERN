"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { submitRecruiterRequest } from "@/app/actions/recruiter-access";
import { submitWeb3Form } from "@/lib/web3forms";

type Category =
  | "recruiter" | "intern" | "instructor" | "partnership" | "hire-us"
  | "investor" | "support" | "press" | "general"
  | "institution" | "government" | "partner" | "creator" | "mentor";

const CATEGORIES: { id: Category; emoji: string; label: string; blurb: string }[] = [
  // Org-tier inbounds — match the landing-page portal CTAs (every
  // /portals/<slug> page sends the visitor here with ?category=<id>).
  { id: "institution", emoji: "🏛", label: "Institution Portal",   blurb: "Bring your university or training institute on board." },
  { id: "government",  emoji: "🏦", label: "Government Portal",    blurb: "Run state-level skills programmes." },
  { id: "partner",     emoji: "🤝", label: "Partner Programme",    blurb: "Co-host, white-label, revenue share." },
  { id: "creator",     emoji: "👑", label: "Creator access",       blurb: "Founding-team / platform-owner enquiry." },
  { id: "mentor",      emoji: "🎓", label: "Apply as mentor",      blurb: "Coach and advise interns 1:1." },
  // Original categories
  { id: "recruiter",   emoji: "🏢", label: "Become a recruiter",   blurb: "Post opportunities and hire verified talent." },
  { id: "intern",      emoji: "🌱", label: "Join as intern",        blurb: "Apply to the founding cohort." },
  { id: "instructor",  emoji: "👨‍🏫", label: "Become an instructor", blurb: "Teach and mentor on CIOS." },
  { id: "partnership", emoji: "🔗", label: "Strategic partnership", blurb: "Other commercial collaboration." },
  { id: "hire-us",     emoji: "💼", label: "Hire our studio",       blurb: "COSPRONOS Media can build it for you." },
  { id: "investor",    emoji: "📈", label: "Investor inquiry",      blurb: "Learn about our raise and metrics." },
  { id: "support",     emoji: "🛟", label: "Support",               blurb: "Existing user? We've got you." },
  { id: "press",       emoji: "📰", label: "Press / media",         blurb: "Interviews, quotes, logo requests." },
  { id: "general",     emoji: "💬", label: "General inquiry",       blurb: "Something else? Tell us." },
];

export function ContactClient() {
  const sp = useSearchParams();
  const initialCat = (sp.get("category") as Category) || "";
  const [step, setStep] = useState<0 | 1 | 2>(initialCat ? 1 : 0);
  const [category, setCategory] = useState<Category | "">(initialCat || "");
  const [f, setF] = useState({
    name: "", email: "", company: "", phone: "", country: "", website: "",
    hiringFor: "", expectedHires: "", budgetRange: "", whyJoin: "",
    skills: "", portfolio: "", availability: "",
    subject: "", message: "", contactMethod: "email" as "email" | "phone",
  });
  const [pending, start] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { if (initialCat) setCategory(initialCat); }, [initialCat]);

  const choose = (c: Category) => { setCategory(c); setStep(1); };

  const submit = () => start(async () => {
    if (!f.name || !f.email) return toast.error("Name and email are required");

    // Dual-write strategy:
    //   1. submitRecruiterRequest writes the row into Supabase so it
    //      shows up in the super-admin queue at
    //      /super-admin/recruiter-requests for in-app review.
    //   2. submitWeb3Form ALSO emails the destination inbox so the
    //      team gets notified immediately without checking the queue.
    // We intentionally don't fail the whole submit if Web3Forms fails
    // — the DB row is the source of truth, the email is the alert.

    const isRecruiter = category === "recruiter";
    const dbRes = await submitRecruiterRequest({
      fullName: f.name,
      companyName: f.company || (isRecruiter ? "(not provided)" : (category as string).toUpperCase()),
      workEmail: f.email,
      phone: f.phone,
      country: f.country,
      website: f.website,
      hiringFor: isRecruiter ? f.hiringFor : (f.subject || category),
      expectedHires: f.expectedHires,
      budgetRange: f.budgetRange,
      whyJoin: isRecruiter
        ? f.whyJoin
        : `[${(category as string).toUpperCase()}] ${f.message || f.whyJoin}\n\nSkills: ${f.skills}\nPortfolio: ${f.portfolio}\nAvailability: ${f.availability}`,
      contactMethod: f.contactMethod,
    });
    if (!dbRes.ok) return toast.error(dbRes.error);

    // Fire-and-forget the email side. Don't block UI on it; if it
    // fails, the DB row still triggers the team to follow up.
    const catLabel = CATEGORIES.find((c) => c.id === category)?.label || category;
    void submitWeb3Form({
      email: f.email,
      name: f.name,
      company: f.company || undefined,
      phone: f.phone || undefined,
      country: f.country || undefined,
      website: f.website || undefined,
      category: catLabel,
      subject: `📥 Contact: ${catLabel} — ${f.name}`,
      from_name: `CIOS Contact (${catLabel})`,
      hiringFor: f.hiringFor || undefined,
      expectedHires: f.expectedHires || undefined,
      budgetRange: f.budgetRange || undefined,
      skills: f.skills || undefined,
      portfolio: f.portfolio || undefined,
      availability: f.availability || undefined,
      message: f.message || f.whyJoin || undefined,
      contactMethod: f.contactMethod,
    }).catch(() => { /* DB row already saved — don't surface */ });

    setSubmitted(true);
    setStep(2);
  });

  const cat = CATEGORIES.find((c) => c.id === category);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "60px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <span style={{ display: "inline-block", padding: "4px 12px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 1, marginBottom: 14 }}>GET IN TOUCH</span>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 44, fontWeight: 800, color: "#E8EDF5", margin: "0 0 12px 0", lineHeight: 1.1 }}>
          {submitted ? "We got it." : "How can we help?"}
        </h1>
        <p style={{ fontSize: 16, color: "#8892A4", maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
          {submitted ? "Thanks — we'll respond within 1 business day." : "We reply to every message. Pick what fits you best."}
        </p>
      </div>

      {step === 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => choose(c.id)} style={{
              background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14,
              padding: 20, textAlign: "left", cursor: "pointer", color: "#E8EDF5",
              transition: "transform 0.15s, border-color 0.15s",
            }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>{c.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8EDF5", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "#8892A4", lineHeight: 1.5 }}>{c.blurb}</div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && cat && (
        <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 30 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 4, background: "#1E88E5", borderRadius: 99 }} />
            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99 }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 28 }}>{cat.emoji}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#E8EDF5" }}>{cat.label}</div>
                <div style={{ fontSize: 11, color: "#8892A4" }}>{cat.blurb}</div>
              </div>
            </div>
            <button onClick={() => setStep(0)} style={{ fontSize: 11, color: "#8892A4", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>← Change</button>
          </div>

          <Row>
            <Field label="Your name *"><Input value={f.name} onChange={(v) => setF({ ...f, name: v })} /></Field>
            <Field label="Email *"><Input type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="you@example.com" /></Field>
          </Row>
          <Row>
            <Field label="Phone"><Input value={f.phone} onChange={(v) => setF({ ...f, phone: v })} /></Field>
            <Field label="Country"><Input value={f.country} onChange={(v) => setF({ ...f, country: v })} /></Field>
          </Row>

          {category === "recruiter" && <>
            <Row>
              <Field label="Company *"><Input value={f.company} onChange={(v) => setF({ ...f, company: v })} /></Field>
              <Field label="Website"><Input value={f.website} onChange={(v) => setF({ ...f, website: v })} placeholder="https://…" /></Field>
            </Row>
            <Field label="What are you hiring for?"><Input value={f.hiringFor} onChange={(v) => setF({ ...f, hiringFor: v })} placeholder="UI designer, backend engineer…" /></Field>
            <Row>
              <Field label="Expected hires"><Select value={f.expectedHires} onChange={(v) => setF({ ...f, expectedHires: v })} options={["", "1", "2-5", "6-10", "11-25", "26+"]} /></Field>
              <Field label="Budget range"><Select value={f.budgetRange} onChange={(v) => setF({ ...f, budgetRange: v })} options={["", "<500", "500-2k", "2k-10k", "10k+", "project"]} /></Field>
            </Row>
            <Field label="Why do you want to join CIOS?"><Textarea value={f.whyJoin} onChange={(v) => setF({ ...f, whyJoin: v })} /></Field>
          </>}

          {category === "intern" && <>
            <Field label="Skills / interests"><Input value={f.skills} onChange={(v) => setF({ ...f, skills: v })} placeholder="UI design, Python, content writing…" /></Field>
            <Field label="Portfolio / links"><Input value={f.portfolio} onChange={(v) => setF({ ...f, portfolio: v })} /></Field>
            <Field label="Availability"><Input value={f.availability} onChange={(v) => setF({ ...f, availability: v })} placeholder="Full-time / evenings / weekends" /></Field>
            <Field label="Tell us about yourself"><Textarea value={f.message} onChange={(v) => setF({ ...f, message: v })} /></Field>
          </>}

          {category === "instructor" && <>
            <Field label="Your expertise"><Input value={f.skills} onChange={(v) => setF({ ...f, skills: v })} placeholder="AI, design, marketing…" /></Field>
            <Field label="LinkedIn / portfolio"><Input value={f.portfolio} onChange={(v) => setF({ ...f, portfolio: v })} /></Field>
            <Field label="Tell us what you want to teach"><Textarea value={f.message} onChange={(v) => setF({ ...f, message: v })} /></Field>
          </>}

          {(category === "partnership" || category === "hire-us" || category === "investor" || category === "press" || category === "support" || category === "general" || category === "institution" || category === "government" || category === "partner" || category === "creator" || category === "mentor") && <>
            <Field label="Company / organization"><Input value={f.company} onChange={(v) => setF({ ...f, company: v })} /></Field>
            <Field label="Subject"><Input value={f.subject} onChange={(v) => setF({ ...f, subject: v })} /></Field>
            <Field label="Tell us more"><Textarea value={f.message} onChange={(v) => setF({ ...f, message: v })} rows={6} /></Field>
          </>}

          <Field label="Preferred contact method">
            <div style={{ display: "flex", gap: 10 }}>
              <label style={radioRow}><input type="radio" checked={f.contactMethod === "email"} onChange={() => setF({ ...f, contactMethod: "email" })} /> Email</label>
              <label style={radioRow}><input type="radio" checked={f.contactMethod === "phone"} onChange={() => setF({ ...f, contactMethod: "phone" })} /> Phone</label>
            </div>
          </Field>

          <button onClick={submit} disabled={pending || !f.name || !f.email} style={{
            width: "100%", padding: "14px", marginTop: 16,
            background: pending ? "#5A6478" : "linear-gradient(135deg, #1E88E5, #1565C0)",
            color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
            cursor: pending ? "wait" : "pointer",
          }}>{pending ? "Sending…" : "📨 Send message"}</button>
          <p style={{ fontSize: 11, color: "#5A6478", textAlign: "center", marginTop: 12 }}>We respond within 1 business day. No spam, ever.</p>
        </div>
      )}

      {step === 2 && submitted && (
        <div style={{ maxWidth: 520, margin: "0 auto", padding: 40, background: "#111827", border: "1px solid rgba(102,187,106,0.3)", borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 14 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 10px 0" }}>Message delivered</h2>
          <p style={{ fontSize: 14, color: "#8892A4", lineHeight: 1.6, marginBottom: 16 }}>
            Thanks <strong style={{ color: "#E8EDF5" }}>{f.name.split(" ")[0] || "there"}</strong> — we'll reply at <strong style={{ color: "#E8EDF5" }}>{f.email}</strong> within 1 business day.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <a href="/" style={{ padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>← Home</a>
            <button onClick={() => { setSubmitted(false); setStep(0); setCategory(""); }} style={{ padding: "10px 22px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Send another</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 40, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        <InfoCard emoji="🕒" title="Response time" lines={["Business: <1 day", "Urgent: <4 hours", "Weekends: within 24h"]} />
        <InfoCard emoji="🌍" title="Where we work" lines={["COSPRONOS Media", "Remote-first, worldwide", "Any timezone, English-default"]} />
        <InfoCard emoji="📧" title="Direct email" lines={["hello@cospronos.media", "support@cios.platform"]} />
        <InfoCard emoji="🔗" title="Social" lines={["@cospronos everywhere"]} />
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ minWidth: 0, marginBottom: 12 }}><label style={lbl}>{label}</label>{children}</div>; }
function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) { return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputS} />; }
function Textarea({ value, onChange, rows = 5 }: { value: string; onChange: (v: string) => void; rows?: number }) { return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={{ ...inputS, fontFamily: "inherit", resize: "vertical" }} />; }
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} style={inputS}>{options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}</select>; }
function InfoCard({ emoji, title, lines }: { emoji: string; title: string; lines: string[] }) {
  return (
    <div style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#E8EDF5", marginBottom: 6 }}>{title}</div>
      {lines.map((l, i) => <div key={i} style={{ fontSize: 11, color: "#8892A4", lineHeight: 1.6 }}>{l}</div>)}
    </div>
  );
}

const inputS: React.CSSProperties = { width: "100%", padding: "10px 14px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 13, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 5, fontWeight: 700 };
const radioRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#E8EDF5", padding: "8px 14px", background: "#0A0E1A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, cursor: "pointer" };
