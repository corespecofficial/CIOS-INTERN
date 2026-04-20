"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { submitRecruiterOnboarding, type RecruiterOnboardingInput } from "@/app/actions/recruiter-access";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

const RECRUITER_TYPES: { value: string; label: string }[] = [
  { value: "company_hr", label: "Company HR" },
  { value: "agency", label: "Agency Recruiter" },
  { value: "founder", label: "Startup Founder" },
  { value: "business_owner", label: "Business Owner" },
  { value: "project_client", label: "Project Client" },
  { value: "talent_scout", label: "Talent Scout" },
  { value: "ngo", label: "NGO / Scholarship Manager" },
];

const STEPS = ["Company info", "Your role", "Trust & verification", "Uploads", "Review"];

type P = RecruiterOnboardingInput & { agreedAntiFraud: boolean; agreedFairHiring: boolean };

export function OnboardingClient({ initial }: { initial: Record<string, unknown> | null }) {
  const init = (initial || {}) as Record<string, unknown>;
  const [step, setStep] = useState(0);
  const [p, setP] = useState<P>({
    companyName: (init.company_name as string) || "",
    registeredBusinessName: (init.registered_business_name as string) || "",
    brandName: (init.brand_name as string) || "",
    industry: (init.industry as string) || "",
    website: (init.company_website as string) || "",
    officialEmail: (init.official_email as string) || "",
    phone: (init.phone as string) || "",
    country: (init.country as string) || "",
    officeAddress: (init.office_address as string) || "",
    companySize: (init.company_size as string) || "",
    yearFounded: (init.year_founded as number) || undefined,
    recruiterType: (init.recruiter_type as string) || "company_hr",
    roleTitle: (init.role_title as string) || "",
    linkedinUrl: (init.linkedin_url as string) || "",
    whyHiring: (init.why_hiring as string) || "",
    expectedHiringVolume: (init.expected_hiring_volume as string) || "",
    paymentModel: (init.payment_model as string) || "",
    referralSource: (init.referral_source as string) || "",
    about: (init.about as string) || "",
    companyLogoUrl: (init.company_logo_url as string) || "",
    bannerUrl: (init.banner_url as string) || "",
    idDocumentUrl: (init.id_document_url as string) || "",
    registrationDocUrl: (init.registration_doc_url as string) || "",
    agreedAntiFraud: false,
    agreedFairHiring: false,
  });
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);

  const set = <K extends keyof P>(key: K, v: P[K]) => setP((prev) => ({ ...prev, [key]: v }));

  const upload = async (field: "companyLogoUrl" | "bannerUrl" | "idDocumentUrl" | "registrationDocUrl", file: File) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) return toast.error("Cloudinary not configured");
    setUploading(field);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "Upload failed");
      set(field, data.secure_url);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally { setUploading(null); }
  };

  const canAdvance = () => {
    if (step === 0) return !!p.companyName.trim();
    if (step === 1) return !!p.roleTitle.trim();
    if (step === 2) return !!p.whyHiring.trim() && !!p.expectedHiringVolume.trim() && p.agreedAntiFraud && p.agreedFairHiring;
    return true;
  };

  const submit = () => start(async () => {
    const res = await submitRecruiterOnboarding(p);
    if (!res.ok) return toast.error(res.error);
    toast.success("Submitted! Awaiting Super Admin review.");
    setStep(STEPS.length);
  });

  if (step >= STEPS.length) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 40, background: "#111827", border: "1px solid rgba(255,193,7,0.3)", borderRadius: 16, textAlign: "center", fontFamily: "'Nunito', sans-serif" }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>🕒</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#E8EDF5", margin: "0 0 8px 0" }}>Thanks — you're in the review queue</h1>
        <p style={{ fontSize: 13, color: "#8892A4", lineHeight: 1.6 }}>A Super Admin will review your company details. You'll get an in-app and email notification the moment access is approved.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <span style={{ display: "inline-block", padding: "3px 10px", background: "rgba(30,136,229,0.15)", color: "#1E88E5", fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: 0.5, marginBottom: 6 }}>RECRUITER ONBOARDING</span>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>Let's verify your company</h1>
        <p style={{ fontSize: 13, color: "#8892A4", margin: "2px 0 0 0" }}>Takes ~3 minutes. You can save and come back anytime.</p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i <= step ? "#1E88E5" : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>

      <div style={panel}>
        {step === 0 && (
          <>
            <h2 style={sectionH}>🏢 Company information</h2>
            <Row><Field label="Company name *"><Input value={p.companyName} onChange={(v) => set("companyName", v)} /></Field></Row>
            <Row>
              <Field label="Registered business name"><Input value={p.registeredBusinessName || ""} onChange={(v) => set("registeredBusinessName", v)} /></Field>
              <Field label="Brand name (if different)"><Input value={p.brandName || ""} onChange={(v) => set("brandName", v)} /></Field>
            </Row>
            <Row>
              <Field label="Industry"><Input value={p.industry || ""} onChange={(v) => set("industry", v)} placeholder="SaaS, media, finance…" /></Field>
              <Field label="Website"><Input value={p.website || ""} onChange={(v) => set("website", v)} placeholder="https://…" /></Field>
            </Row>
            <Row>
              <Field label="Official email"><Input value={p.officialEmail || ""} onChange={(v) => set("officialEmail", v)} type="email" /></Field>
              <Field label="Phone"><Input value={p.phone || ""} onChange={(v) => set("phone", v)} /></Field>
            </Row>
            <Row>
              <Field label="Country"><Input value={p.country || ""} onChange={(v) => set("country", v)} /></Field>
              <Field label="Office address"><Input value={p.officeAddress || ""} onChange={(v) => set("officeAddress", v)} /></Field>
            </Row>
            <Row>
              <Field label="Company size">
                <select value={p.companySize || ""} onChange={(e) => set("companySize", e.target.value)} style={inputS}>
                  <option value="">—</option><option value="1-10">1–10</option><option value="11-50">11–50</option>
                  <option value="51-200">51–200</option><option value="201-1000">201–1,000</option><option value="1000+">1,000+</option>
                </select>
              </Field>
              <Field label="Year founded"><Input type="number" value={p.yearFounded?.toString() || ""} onChange={(v) => set("yearFounded", parseInt(v) || undefined)} /></Field>
            </Row>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={sectionH}>👤 Your role</h2>
            <Row>
              <Field label="Recruiter type *">
                <select value={p.recruiterType} onChange={(e) => set("recruiterType", e.target.value)} style={inputS}>
                  {RECRUITER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Your role / title *"><Input value={p.roleTitle} onChange={(v) => set("roleTitle", v)} placeholder="Head of Talent" /></Field>
            </Row>
            <Field label="LinkedIn or professional URL"><Input value={p.linkedinUrl || ""} onChange={(v) => set("linkedinUrl", v)} placeholder="https://linkedin.com/in/…" /></Field>
            <Field label="About your company (shown to candidates)"><Textarea value={p.about || ""} onChange={(v) => set("about", v)} rows={5} /></Field>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={sectionH}>🛡 Trust & verification</h2>
            <Field label="Why do you want to hire on CIOS? *"><Textarea value={p.whyHiring} onChange={(v) => set("whyHiring", v)} rows={4} placeholder="We're looking for junior designers for our Lagos studio…" /></Field>
            <Row>
              <Field label="Expected hiring volume *">
                <select value={p.expectedHiringVolume} onChange={(e) => set("expectedHiringVolume", e.target.value)} style={inputS}>
                  <option value="">—</option><option value="1">1 hire</option><option value="2-5">2–5</option>
                  <option value="6-10">6–10</option><option value="11-25">11–25</option><option value="26+">26+</option>
                </select>
              </Field>
              <Field label="Payment model">
                <select value={p.paymentModel || ""} onChange={(e) => set("paymentModel", e.target.value)} style={inputS}>
                  <option value="">—</option><option value="salary">Full-time salary</option><option value="hourly">Hourly</option>
                  <option value="project">Project-based</option><option value="equity">Equity</option><option value="stipend">Stipend</option>
                </select>
              </Field>
            </Row>
            <Field label="How did you hear about us?">
              <select value={p.referralSource || ""} onChange={(e) => set("referralSource", e.target.value)} style={inputS}>
                <option value="">—</option><option value="referral">Referral</option>
                <option value="search">Web search</option><option value="social">Social media</option>
                <option value="event">Event</option><option value="other">Other</option>
              </select>
            </Field>

            <div style={{ marginTop: 20, padding: 14, background: "rgba(239,83,80,0.06)", border: "1px solid rgba(239,83,80,0.2)", borderRadius: 10 }}>
              <div style={{ fontSize: 12, color: "#EF5350", fontWeight: 700, marginBottom: 8 }}>⚠️ Policies — required</div>
              <label style={checkRow}>
                <input type="checkbox" checked={p.agreedAntiFraud} onChange={(e) => setP({ ...p, agreedAntiFraud: e.target.checked })} />
                <span>I confirm this is a legitimate business and agree to the <a href="/terms" target="_blank" style={{ color: "#1E88E5" }}>anti-fraud policy</a>.</span>
              </label>
              <label style={checkRow}>
                <input type="checkbox" checked={p.agreedFairHiring} onChange={(e) => setP({ ...p, agreedFairHiring: e.target.checked })} />
                <span>I agree to the fair hiring rules: pay on time, respectful communication, no discrimination.</span>
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={sectionH}>📎 Uploads</h2>
            <p style={{ fontSize: 12, color: "#8892A4", marginBottom: 14 }}>All uploads are optional but help us verify your account faster. Max 10 MB each.</p>
            <UploadField label="Company logo" value={p.companyLogoUrl} uploading={uploading === "companyLogoUrl"} onChange={(f) => upload("companyLogoUrl", f)} accept="image/*" />
            <UploadField label="Company banner" value={p.bannerUrl} uploading={uploading === "bannerUrl"} onChange={(f) => upload("bannerUrl", f)} accept="image/*" />
            <UploadField label="Government ID (professional photo or passport)" value={p.idDocumentUrl} uploading={uploading === "idDocumentUrl"} onChange={(f) => upload("idDocumentUrl", f)} accept="image/*,.pdf" />
            <UploadField label="Business registration (CAC / incorporation doc)" value={p.registrationDocUrl} uploading={uploading === "registrationDocUrl"} onChange={(f) => upload("registrationDocUrl", f)} accept=".pdf,image/*" />
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={sectionH}>✅ Review and submit</h2>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", margin: 0 }}>
              <RevRow label="Company">{p.companyName}</RevRow>
              <RevRow label="Industry">{p.industry || "—"}</RevRow>
              <RevRow label="Website">{p.website || "—"}</RevRow>
              <RevRow label="Country">{p.country || "—"}</RevRow>
              <RevRow label="Role">{p.roleTitle}</RevRow>
              <RevRow label="Type">{RECRUITER_TYPES.find((t) => t.value === p.recruiterType)?.label}</RevRow>
              <RevRow label="Volume">{p.expectedHiringVolume || "—"}</RevRow>
              <RevRow label="Documents">{[p.companyLogoUrl, p.bannerUrl, p.idDocumentUrl, p.registrationDocUrl].filter(Boolean).length}/4 uploaded</RevRow>
            </dl>
            <div style={{ marginTop: 18, padding: 14, background: "rgba(30,136,229,0.06)", border: "1px solid rgba(30,136,229,0.2)", borderRadius: 10, fontSize: 12, color: "#8892A4", lineHeight: 1.6 }}>
              A Super Admin will review your submission and grant access within 1–2 business days. You'll be notified immediately.
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
        <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} style={btnGhost}>← Back</button>
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canAdvance()} style={btnPrimary}>Next →</button>
        ) : (
          <button onClick={submit} disabled={pending || !canAdvance()} style={btnPrimary}>{pending ? "Submitting…" : "Submit for review"}</button>
        )}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ minWidth: 0 }}><label style={lbl}>{label}</label>{children}</div>; }
function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) { return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputS} />; }
function Textarea({ value, onChange, rows = 4 }: { value: string; onChange: (v: string) => void; rows?: number }) { return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} style={{ ...inputS, fontFamily: "inherit", resize: "vertical" }} />; }
function UploadField({ label, value, uploading, onChange, accept }: { label: string; value?: string; uploading: boolean; onChange: (f: File) => void; accept: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <label style={btnGhost}>
          {uploading ? "Uploading…" : value ? "✓ Replace" : "⬆ Upload"}
          <input type="file" accept={accept} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.currentTarget.value = ""; }} />
        </label>
        {value && <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1E88E5" }}>Preview →</a>}
      </div>
    </div>
  );
}
function RevRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <><dt style={{ fontSize: 11, color: "#8892A4", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</dt><dd style={{ fontSize: 13, color: "#E8EDF5", margin: 0 }}>{children}</dd></>;
}

const panel: React.CSSProperties = { background: "#111827", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: 22 };
const sectionH: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: "#E8EDF5", margin: "0 0 14px 0" };
const inputS: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#0A0E1A", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 10, color: "#8892A4", letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4, marginTop: 4 };
const checkRow: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "#E8EDF5", marginBottom: 8, lineHeight: 1.5, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { padding: "10px 22px", background: "linear-gradient(135deg, #1E88E5, #1565C0)", color: "#fff", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "9px 16px", background: "transparent", color: "#E8EDF5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-block" };
