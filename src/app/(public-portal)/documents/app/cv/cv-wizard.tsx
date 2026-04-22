"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { polishCvDraft, saveCvDraft, type CvFormPayload, type CvPolished, type CvExperience, type CvEducation, type CvReferee, type CvLanguage } from "@/app/actions/cv-builder";
import { REGIONS, TEMPLATES, getRegion, type RegionId, type TemplateId } from "@/lib/cv-standards";
import { ThemeToggle } from "@/components/theme-toggle";

const CIOS_LOGO = "https://res.cloudinary.com/detsk6uql/image/upload/v1775646964/Adobe_Express_-_file_lydnbc.png";

const A1 = "#EC4899";
const A2 = "#8B5CF6";

type Phase =
  | "welcome" | "region" | "template" | "identity" | "summary"
  | "experience" | "education" | "skills" | "extras"
  | "review" | "result";

const ORDER: Phase[] = ["welcome", "region", "template", "identity", "summary", "experience", "education", "skills", "extras", "review", "result"];

export function CvWizard({ firstName, seedEmail }: { firstName: string; seedEmail: string }) {
  const [phase, setPhase] = useState<Phase>("welcome");

  // form state
  const [region, setRegion] = useState<RegionId>("ats");
  const [template, setTemplate] = useState<TemplateId>("standard");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [gender, setGender] = useState("");
  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [nyscStatus, setNyscStatus] = useState("");
  const [email, setEmail] = useState(seedEmail || "");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [links, setLinks] = useState<{ label: string; url: string }[]>([{ label: "linkedin", url: "" }, { label: "portfolio", url: "" }]);
  const [summary, setSummary] = useState("");

  const [experience, setExperience] = useState<CvExperience[]>([emptyExp(), emptyExp(), emptyExp()]);
  const [education, setEducation] = useState<CvEducation[]>([emptyEdu("tertiary"), emptyEdu("secondary")]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [languages, setLanguages] = useState<CvLanguage[]>([{ name: "English", level: "Native" }]);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestDraft, setInterestDraft] = useState("");
  const [referees, setReferees] = useState<CvReferee[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certDraft, setCertDraft] = useState("");

  const [polished, setPolished] = useState<CvPolished | null>(null);
  const [polishing, startPolish] = useTransition();
  const [saving, startSave] = useTransition();
  const [downloading, setDownloading] = useState(false);

  const spec = getRegion(region)!;

  // Progress bar position
  const visibleOrder = useMemo(() => ORDER.filter((p) => p !== "welcome" && p !== "result"), []);
  const progressIdx = useMemo(() => visibleOrder.indexOf(phase), [visibleOrder, phase]);
  const pct = phase === "welcome" ? 0 : phase === "result" ? 100 : ((progressIdx + 1) / visibleOrder.length) * 100;

  const payload: CvFormPayload = useMemo(() => ({
    region, template, fullName, headline, photoUrl, dob, nationality, maritalStatus, gender,
    stateOfOrigin, nyscStatus, email, phone, location, links, summary,
    experience: experience.filter((e) => e.role || e.company),
    education: education.filter((e) => e.institution || e.qualification),
    skills, languages, interests, referees, certifications,
    projects: [], volunteering: [],
  }), [region, template, fullName, headline, photoUrl, dob, nationality, maritalStatus, gender,
      stateOfOrigin, nyscStatus, email, phone, location, links, summary, experience, education, skills,
      languages, interests, referees, certifications]);

  const advance = () => {
    // Validation gates per phase
    if (phase === "identity" && !fullName.trim()) return toast.error("Add your full name");
    if (phase === "identity" && !email.trim()) return toast.error("Add your email");
    if (phase === "experience" && payload.experience.length < 1) return toast.error("Add at least one experience");
    if (phase === "education" && payload.education.length < 1) return toast.error("Add at least one education entry");
    if (phase === "extras" && spec.requiresReferees && referees.filter((r) => r.name).length < spec.refereesMin) {
      return toast.error(`${spec.label} CVs need at least ${spec.refereesMin} referees`);
    }
    const i = ORDER.indexOf(phase);
    if (i < ORDER.length - 1) setPhase(ORDER[i + 1]);
  };

  const back = () => {
    const i = ORDER.indexOf(phase);
    if (i > 0) setPhase(ORDER[i - 1]);
  };

  const runPolish = () => {
    startPolish(async () => {
      const res = await polishCvDraft(payload);
      if (!res.ok) return toast.error(res.error);
      setPolished(res.data!);
      setPhase("result");
    });
  };

  const saveToLibrary = () => {
    if (!polished) return;
    startSave(async () => {
      const res = await saveCvDraft(payload, polished);
      if (!res.ok) return toast.error(res.error);
      toast.success("Saved to your library");
    });
  };

  const downloadPdf = async () => {
    if (!polished) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/cv/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payload, polished }),
      });
      if (!res.ok) { toast.error("Couldn't build the PDF"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fullName.replace(/\s+/g, "-") || "CV"}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div data-workspace="cv-wizard" style={{ position: "fixed", inset: 0, background: "var(--ws-canvas, #fff)", color: "var(--ws-text, #0F172A)", overflow: "auto", fontFamily: "'Nunito', sans-serif", zIndex: 9999 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #F1F5F9", background: "var(--ws-canvas, #fff)" }}>
        <Link href="/documents" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <img src={CIOS_LOGO} alt="CIOS" width={28} height={28} style={{ borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>CIOS CV Builder</div>
            <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)" }}>Region-aware · AI-polished</div>
          </div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ThemeToggle compact />
          <Link href="/documents/app" style={{ padding: "8px 14px", background: "var(--ws-chip, #F1F5F9)", color: "var(--ws-text, #0F172A)", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
            ← Tools
          </Link>
        </div>
      </div>

      {/* Progress */}
      {phase !== "welcome" && phase !== "result" && (
        <div style={{ maxWidth: 720, margin: "20px auto 0", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--ws-chip-hover, #E2E8F0)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${A1}, ${A2})`, width: `${pct}%`, transition: "width .25s ease" }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ws-text-faint, #64748B)" }}>
              {progressIdx + 1} / {visibleOrder.length}
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ maxWidth: 720, margin: "20px auto", padding: "24px 20px 80px", animation: "popIn .3s ease both" }}>
        {phase === "welcome" && <Welcome firstName={firstName} onStart={() => setPhase("region")} />}

        {phase === "region" && (
          <Step title="Which regional standard?" subtitle="Different markets expect different things — pick the one you're applying into.">
            <div style={{ display: "grid", gap: 10 }}>
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setRegion(r.id); setTimeout(advance, 120); }}
                  style={regionCard(region === r.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{r.flag}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ws-text, #0F172A)" }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 2 }}>{r.tagline}</div>
                    </div>
                  </div>
                  <div style={{ color: "var(--ws-text-faint, #64748B)", fontSize: 12, marginTop: 6 }}>{r.summary}</div>
                </button>
              ))}
            </div>
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "template" && (
          <Step title="Pick a template" subtitle="Visual style. You can try different templates later without redoing your answers.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              {TEMPLATES.map((t) => {
                const disabled = t.status === "soon";
                return (
                  <button
                    key={t.id}
                    disabled={disabled}
                    onClick={() => { if (!disabled) { setTemplate(t.id); setTimeout(advance, 120); } }}
                    style={{
                      padding: 16, borderRadius: 16,
                      background: template === t.id ? `${A1}0F` : "#fff",
                      border: `1.5px solid ${template === t.id ? A1 : "#E2E8F0"}`,
                      textAlign: "left", cursor: disabled ? "not-allowed" : "pointer",
                      fontFamily: "inherit", opacity: disabled ? 0.55 : 1,
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{t.emoji}</div>
                    <div style={{ fontWeight: 800, color: "var(--ws-text, #0F172A)", fontSize: 15 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 4, lineHeight: 1.5 }}>{t.blurb}</div>
                    {disabled && (
                      <span style={{ position: "absolute", top: 10, right: 10, fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "var(--ws-chip, #F1F5F9)", color: "var(--ws-text-faint, #64748B)", fontWeight: 800, letterSpacing: 0.3 }}>SOON</span>
                    )}
                  </button>
                );
              })}
            </div>
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "identity" && (
          <Step title="About you" subtitle={spec.summary}>
            <Grid2>
              <Field label="Full name *"><Input value={fullName} onChange={setFullName} placeholder="Ada Lovelace" /></Field>
              <Field label="Headline"><Input value={headline} onChange={setHeadline} placeholder="Frontend Engineer" /></Field>
              <Field label="Email *"><Input value={email} onChange={setEmail} placeholder="you@domain.com" type="email" /></Field>
              <Field label="Phone"><Input value={phone} onChange={setPhone} placeholder="+234 800 000 0000" /></Field>
              <Field label="Location"><Input value={location} onChange={setLocation} placeholder="Lagos, Nigeria" /></Field>
              {spec.photo !== "forbidden" && (
                <Field label={`Photo URL ${spec.photo === "required" ? "(required)" : "(optional)"}`}>
                  <Input value={photoUrl} onChange={setPhotoUrl} placeholder="https://…/photo.jpg" />
                </Field>
              )}
              {spec.includesDob && <Field label="Date of birth"><Input value={dob} onChange={setDob} placeholder="15 March 1999" /></Field>}
              {spec.includesNationality && <Field label="Nationality"><Input value={nationality} onChange={setNationality} placeholder="Nigerian" /></Field>}
              {spec.includesMaritalStatus && <Field label="Marital status"><Input value={maritalStatus} onChange={setMaritalStatus} placeholder="Single / Married" /></Field>}
              {spec.includesGender && <Field label="Gender"><Input value={gender} onChange={setGender} placeholder="Male / Female" /></Field>}
              {spec.includesStateOfOrigin && <Field label="State of origin"><Input value={stateOfOrigin} onChange={setStateOfOrigin} placeholder="Benue State" /></Field>}
              {spec.requiresNysc && <Field label="NYSC status"><Input value={nyscStatus} onChange={setNyscStatus} placeholder="Completed · Discharge 2025" /></Field>}
            </Grid2>

            <div style={{ marginTop: 18 }}>
              <LabelRow label="Profile links" />
              {links.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 1fr 32px", gap: 8, marginBottom: 8 }}>
                  <Input value={l.label} onChange={(v) => setLinks(links.map((x, j) => j === i ? { ...x, label: v } : x))} placeholder="github" />
                  <Input value={l.url} onChange={(v) => setLinks(links.map((x, j) => j === i ? { ...x, url: v } : x))} placeholder="https://github.com/you" />
                  <button onClick={() => setLinks(links.filter((_, j) => j !== i))} style={removeBtn}>✕</button>
                </div>
              ))}
              <button onClick={() => setLinks([...links, { label: "", url: "" }])} style={addMoreBtn}>+ Add link</button>
            </div>

            <RegionWarnings spec={spec} />
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "summary" && (
          <Step
            title={spec.requiresPersonalStatement ? "Personal statement" : "Professional summary"}
            subtitle={spec.requiresPersonalStatement
              ? "2–3 sentences that open your CV. Who are you, what are you after, one achievement?"
              : "2–3 sentences. CIOS will polish it — write it in your own words first."}
          >
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={6}
              placeholder="e.g. Frontend engineer with 4 years building accessible web apps. Shipped a design system used across 7 products. Looking for a senior role at a product-led team…"
              style={textAreaStyle}
            />
            <div style={{ fontSize: 12, color: "var(--ws-text-faint, #64748B)", marginTop: 6 }}>{summary.length} characters</div>
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "experience" && (
          <Step title="Experience" subtitle="Aim for three. CIOS will turn your notes into achievement-led bullets.">
            {experience.map((x, i) => (
              <div key={i} style={cardLight}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: A1, letterSpacing: 1, textTransform: "uppercase" }}>Role {i + 1}</div>
                  {experience.length > 1 && (
                    <button onClick={() => setExperience(experience.filter((_, j) => j !== i))} style={removeBtn}>✕</button>
                  )}
                </div>
                <Grid2>
                  <Field label="Role"><Input value={x.role} onChange={(v) => updateAt(experience, setExperience, i, { role: v })} placeholder="Frontend Engineer" /></Field>
                  <Field label="Company"><Input value={x.company} onChange={(v) => updateAt(experience, setExperience, i, { company: v })} placeholder="Acme Inc." /></Field>
                  <Field label="Location"><Input value={x.location} onChange={(v) => updateAt(experience, setExperience, i, { location: v })} placeholder="Remote / Lagos" /></Field>
                  <Field label="Dates">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <Input value={x.startDate} onChange={(v) => updateAt(experience, setExperience, i, { startDate: v })} placeholder="Jan 2023" />
                      <Input value={x.endDate} onChange={(v) => updateAt(experience, setExperience, i, { endDate: v })} placeholder="Present" />
                    </div>
                  </Field>
                </Grid2>
                <Field label="What did you do? (one bullet per line — achievements, metrics, scope)">
                  <textarea
                    rows={4}
                    value={x.bullets.join("\n")}
                    onChange={(e) => updateAt(experience, setExperience, i, { bullets: e.target.value.split("\n") })}
                    placeholder={"Led migration from CRA to Vite → 40% faster rebuilds\nShipped the design system used by 7 products"}
                    style={textAreaStyle}
                  />
                </Field>
              </div>
            ))}
            <button onClick={() => setExperience([...experience, emptyExp()])} style={addMoreBtn}>+ Add another role</button>
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "education" && (
          <Step
            title="Education"
            subtitle={spec.includesPrimaryEducation
              ? `${spec.label} CVs typically include primary, secondary and tertiary education.`
              : `${spec.label} CVs usually cover tertiary (and optionally secondary).`}
          >
            {education.map((e, i) => (
              <div key={i} style={cardLight}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: A1, letterSpacing: 1, textTransform: "uppercase" }}>Education {i + 1}</div>
                  <button onClick={() => setEducation(education.filter((_, j) => j !== i))} style={removeBtn}>✕</button>
                </div>
                <Grid2>
                  <Field label="Level">
                    <select value={e.level} onChange={(ev) => updateAt(education, setEducation, i, { level: ev.target.value as CvEducation["level"] })} style={inputStyle}>
                      <option value="postgraduate">Postgraduate</option>
                      <option value="tertiary">Tertiary / University</option>
                      <option value="secondary">Secondary / High school</option>
                      <option value="primary">Primary</option>
                    </select>
                  </Field>
                  <Field label="Qualification"><Input value={e.qualification} onChange={(v) => updateAt(education, setEducation, i, { qualification: v })} placeholder="B.Sc Computer Science" /></Field>
                  <Field label="Institution"><Input value={e.institution} onChange={(v) => updateAt(education, setEducation, i, { institution: v })} placeholder="University of Lagos" /></Field>
                  <Field label="Grade / classification"><Input value={e.grade} onChange={(v) => updateAt(education, setEducation, i, { grade: v })} placeholder="Second Class Upper / GPA 3.8" /></Field>
                  <Field label="Dates">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <Input value={e.startDate} onChange={(v) => updateAt(education, setEducation, i, { startDate: v })} placeholder="2019" />
                      <Input value={e.endDate} onChange={(v) => updateAt(education, setEducation, i, { endDate: v })} placeholder="2023" />
                    </div>
                  </Field>
                  <Field label="Location"><Input value={e.location} onChange={(v) => updateAt(education, setEducation, i, { location: v })} placeholder="Akoka, Lagos" /></Field>
                </Grid2>
              </div>
            ))}
            <button onClick={() => setEducation([...education, emptyEdu("tertiary")])} style={addMoreBtn}>+ Add another</button>
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "skills" && (
          <Step title="Skills & languages" subtitle="Press Enter to add. CIOS will group them sensibly.">
            <Field label="Skills">
              <ChipInput values={skills} draft={skillDraft} onDraft={setSkillDraft} onAdd={(v) => setSkills([...skills, v])} onRemove={(i) => setSkills(skills.filter((_, j) => j !== i))} placeholder="Type a skill and press Enter" />
            </Field>
            <Field label="Certifications">
              <ChipInput values={certifications} draft={certDraft} onDraft={setCertDraft} onAdd={(v) => setCertifications([...certifications, v])} onRemove={(i) => setCertifications(certifications.filter((_, j) => j !== i))} placeholder="Add a certificate and press Enter" />
            </Field>
            <Field label={spec.requiresCefrLanguages ? "Languages (CEFR levels A1–C2)" : "Languages"}>
              {languages.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 32px", gap: 8, marginBottom: 8 }}>
                  <Input value={l.name} onChange={(v) => setLanguages(languages.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="English" />
                  <Input value={l.level} onChange={(v) => setLanguages(languages.map((x, j) => j === i ? { ...x, level: v } : x))} placeholder={spec.requiresCefrLanguages ? "C2" : "Fluent"} />
                  <button onClick={() => setLanguages(languages.filter((_, j) => j !== i))} style={removeBtn}>✕</button>
                </div>
              ))}
              <button onClick={() => setLanguages([...languages, { name: "", level: "" }])} style={addMoreBtn}>+ Add language</button>
            </Field>
            <FooterNav onBack={back} onNext={advance} />
          </Step>
        )}

        {phase === "extras" && (
          <Step title="Region-specific extras" subtitle={`${spec.label} CVs often include these. You can skip fields that don't apply.`}>
            {spec.allowsInterests && (
              <Field label="Interests (optional)">
                <ChipInput values={interests} draft={interestDraft} onDraft={setInterestDraft} onAdd={(v) => setInterests([...interests, v])} onRemove={(i) => setInterests(interests.filter((_, j) => j !== i))} placeholder="e.g. long-distance running, African jazz" />
              </Field>
            )}

            {spec.requiresReferees && (
              <div style={{ marginTop: 10 }}>
                <LabelRow label={`Referees (minimum ${spec.refereesMin})`} />
                {referees.map((r, i) => (
                  <div key={i} style={cardLight}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: A1, letterSpacing: 1, textTransform: "uppercase" }}>Referee {i + 1}</div>
                      <button onClick={() => setReferees(referees.filter((_, j) => j !== i))} style={removeBtn}>✕</button>
                    </div>
                    <Grid2>
                      <Field label="Name"><Input value={r.name} onChange={(v) => updateAt(referees, setReferees, i, { name: v })} placeholder="Prof. Ngozi Eze" /></Field>
                      <Field label="Title"><Input value={r.title} onChange={(v) => updateAt(referees, setReferees, i, { title: v })} placeholder="Senior Lecturer" /></Field>
                      <Field label="Organisation"><Input value={r.organisation} onChange={(v) => updateAt(referees, setReferees, i, { organisation: v })} placeholder="University of Lagos" /></Field>
                      <Field label="Email"><Input value={r.email} onChange={(v) => updateAt(referees, setReferees, i, { email: v })} placeholder="ngozi@unilag.edu.ng" /></Field>
                      <Field label="Phone"><Input value={r.phone} onChange={(v) => updateAt(referees, setReferees, i, { phone: v })} placeholder="+234 …" /></Field>
                    </Grid2>
                  </div>
                ))}
                <button onClick={() => setReferees([...referees, { name: "", title: "", organisation: "", email: "", phone: "" }])} style={addMoreBtn}>+ Add referee</button>
              </div>
            )}

            {!spec.allowsInterests && !spec.requiresReferees && (
              <div style={{ color: "var(--ws-text-faint, #64748B)", fontSize: 14, padding: "24px 0" }}>
                Nothing region-specific for {spec.label}. You&apos;re good to review.
              </div>
            )}
            <RegionWarnings spec={spec} />
            <FooterNav onBack={back} onNext={advance} nextLabel="Review →" />
          </Step>
        )}

        {phase === "review" && (
          <Step title="Review & polish" subtitle="We&apos;ll polish your summary and experience bullets with AI, keep everything else exactly as you wrote it.">
            <Summary payload={payload} />
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "space-between", flexWrap: "wrap" }}>
              <button onClick={back} style={ghostBtn}>← Edit</button>
              <button onClick={runPolish} disabled={polishing} style={primaryBtn(polishing)}>
                {polishing ? "Polishing with AI…" : "✨ Polish my CV"}
              </button>
            </div>
          </Step>
        )}

        {phase === "result" && polished && (
          <div>
            <Step title="Your CV is ready 🎉" subtitle={`${spec.label} · ${TEMPLATES.find((t) => t.id === template)?.label || "Standard"} template`}>
              <Preview polished={polished} payload={payload} />
              <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={downloadPdf} disabled={downloading} style={primaryBtn(downloading)}>
                  {downloading ? "Building PDF…" : "⬇︎ Download PDF"}
                </button>
                <button onClick={saveToLibrary} disabled={saving} style={ghostBtn}>
                  {saving ? "Saving…" : "💾 Save draft to library"}
                </button>
                <button onClick={() => { setPolished(null); setPhase("review"); }} style={ghostBtn}>↺ Re-polish</button>
              </div>
              <div style={{ marginTop: 18, padding: 14, background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 12, fontSize: 13, color: "#9A3412", lineHeight: 1.55 }}>
                <strong>Region tips for {spec.label}:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {polished.regionWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </Step>
          </div>
        )}
      </div>

      <style>{`
        @keyframes popIn { 0%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─────────── primitives ─────────── */

function Welcome({ firstName, onStart }: { firstName: string; onStart: () => void }) {
  return (
    <div style={{ textAlign: "center", paddingTop: 20 }}>
      <img src={CIOS_LOGO} alt="CIOS" width={72} height={72} style={{ display: "block", margin: "0 auto 18px", borderRadius: 18, boxShadow: `0 6px 20px ${A1}40` }} />
      <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.4 }}>
        Hi {firstName} 👋 let&apos;s build your CV
      </h1>
      <p style={{ fontSize: 16, color: "var(--ws-text-muted, #475569)", lineHeight: 1.6, marginTop: 10, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
        10 short steps. You pick your region and template, answer a few questions,
        and CIOS polishes everything into a clean, downloadable PDF.
      </p>
      <button onClick={onStart} style={{ marginTop: 22, padding: "16px 30px", background: `linear-gradient(135deg, ${A1}, ${A2})`, color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: `0 10px 24px ${A1}44`, fontFamily: "inherit" }}>
        Start →
      </button>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "var(--ws-text, #0F172A)", letterSpacing: -0.3 }}>{title}</h2>
      <p style={{ color: "var(--ws-text-faint, #64748B)", fontSize: 14, marginTop: 6, lineHeight: 1.55 }}>{subtitle}</p>
      <div style={{ marginTop: 18 }}>{children}</div>
    </div>
  );
}

function FooterNav({ onBack, onNext, nextLabel = "Continue →" }: { onBack: () => void; onNext: () => void; nextLabel?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
      <button onClick={onBack} style={ghostBtn}>← Back</button>
      <button onClick={onNext} style={primaryBtn(false)}>{nextLabel}</button>
    </div>
  );
}

function RegionWarnings({ spec }: { spec: ReturnType<typeof getRegion> }) {
  if (!spec?.warnings?.length) return null;
  return (
    <div style={{ marginTop: 16, padding: "12px 14px", background: "#FDF2F8", border: `1px solid ${A1}33`, borderRadius: 12, fontSize: 13, color: "#831843", lineHeight: 1.5 }}>
      <strong>{spec.label} tips</strong>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {spec.warnings.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

function Summary({ payload }: { payload: CvFormPayload }) {
  return (
    <div style={{ ...cardLight, padding: 16 }}>
      <Line label="Region" value={REGIONS.find((r) => r.id === payload.region)?.label || payload.region} />
      <Line label="Template" value={TEMPLATES.find((t) => t.id === payload.template)?.label || payload.template} />
      <Line label="Name" value={payload.fullName} />
      <Line label="Headline" value={payload.headline} />
      <Line label="Contact" value={[payload.email, payload.phone, payload.location].filter(Boolean).join(" · ")} />
      <Line label="Experience" value={`${payload.experience.length} role${payload.experience.length === 1 ? "" : "s"}`} />
      <Line label="Education" value={`${payload.education.length} entr${payload.education.length === 1 ? "y" : "ies"}`} />
      <Line label="Skills" value={payload.skills.join(" · ") || "—"} />
      <Line label="Languages" value={payload.languages.map((l) => `${l.name} (${l.level})`).join(", ") || "—"} />
      {payload.referees.length > 0 && <Line label="Referees" value={payload.referees.map((r) => r.name).filter(Boolean).join(", ") || "—"} />}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, padding: "6px 0", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--ws-text, #0F172A)" }}>{value || "—"}</div>
    </div>
  );
}

function Preview({ polished, payload }: { polished: CvPolished; payload: CvFormPayload }) {
  return (
    <div style={{ ...cardLight, padding: 22 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: "var(--ws-text, #0F172A)" }}>{payload.fullName}</div>
      <div style={{ color: A1, fontWeight: 700, fontSize: 13, marginTop: 2 }}>{payload.headline}</div>
      <div style={{ fontSize: 12, color: "var(--ws-text-muted, #475569)", marginTop: 4 }}>
        {[payload.email, payload.phone, payload.location].filter(Boolean).join(" · ")}
      </div>
      <PreviewSection title="Summary">
        <div style={{ fontSize: 13, color: "var(--ws-text, #0F172A)", lineHeight: 1.65 }}>{polished.summary}</div>
      </PreviewSection>
      <PreviewSection title="Experience">
        {polished.experience.map((x, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <strong style={{ color: "var(--ws-text, #0F172A)" }}>{x.role}</strong>
              <span style={{ color: "var(--ws-text-faint, #64748B)", fontSize: 12 }}>{x.startDate} — {x.endDate}</span>
            </div>
            <div style={{ color: "var(--ws-text-muted, #475569)", fontSize: 12, margin: "2px 0 4px" }}>
              {[x.company, x.location].filter(Boolean).join(" · ")}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ws-text, #0F172A)", fontSize: 13, lineHeight: 1.55 }}>
              {x.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}
      </PreviewSection>
      <PreviewSection title="Skills">
        {polished.skillsGrouped.map((g, i) => (
          <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
            <strong>{g.group}:</strong> <span style={{ color: "var(--ws-text-muted, #475569)" }}>{g.items.join(" · ")}</span>
          </div>
        ))}
      </PreviewSection>
      {polished.achievements.length > 0 && (
        <PreviewSection title="Key achievements">
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ws-text, #0F172A)", fontSize: 13, lineHeight: 1.6 }}>
            {polished.achievements.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </PreviewSection>
      )}
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: A1, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <LabelRow label={label} />
      {children}
    </div>
  );
}

function LabelRow({ label }: { label: string }) {
  return <div style={{ fontSize: 11, color: "var(--ws-text-faint, #64748B)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>;
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type || "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

function ChipInput({
  values, draft, onDraft, onAdd, onRemove, placeholder,
}: {
  values: string[]; draft: string; onDraft: (v: string) => void;
  onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder: string;
}) {
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onAdd(v); onDraft("");
  };
  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {values.map((v, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, background: `${A1}14`, color: "#831843", fontSize: 12, fontWeight: 700 }}>
            {v}
            <button onClick={() => onRemove(i)} style={{ border: "none", background: "transparent", color: "#831843", cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
        }}
        onBlur={add}
        placeholder={placeholder}
        style={inputStyle}
      />
    </div>
  );
}

/* ─────────── helpers ─────────── */

function emptyExp(): CvExperience {
  return { role: "", company: "", location: "", startDate: "", endDate: "", bullets: [] };
}
function emptyEdu(level: CvEducation["level"]): CvEducation {
  return { level, institution: "", qualification: "", startDate: "", endDate: "", grade: "", location: "" };
}
function updateAt<T>(arr: T[], setter: (next: T[]) => void, i: number, patch: Partial<T>) {
  setter(arr.map((x, j) => j === i ? { ...x, ...patch } : x));
}

/* ─────────── styles ─────────── */

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 12,
  border: "1px solid var(--ws-border, #E2E8F0)", background: "var(--ws-canvas, #fff)", color: "var(--ws-text, #0F172A)",
  fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const textAreaStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 14,
  border: "1px solid var(--ws-border, #E2E8F0)", background: "var(--ws-chip, #F8FAFC)", color: "var(--ws-text, #0F172A)",
  fontSize: 14, lineHeight: 1.55, outline: "none", fontFamily: "inherit",
  resize: "vertical", boxSizing: "border-box",
};

const cardLight: React.CSSProperties = {
  padding: 14, borderRadius: 14, background: "var(--ws-canvas, #fff)",
  border: "1px solid var(--ws-border, #E2E8F0)", marginBottom: 10,
};

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    padding: "12px 22px", borderRadius: 12,
    background: busy ? "#E2E8F0" : `linear-gradient(135deg, ${A1}, ${A2})`,
    color: busy ? "#94A3B8" : "#fff", border: "none", fontSize: 13, fontWeight: 800,
    cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
    boxShadow: busy ? "none" : `0 10px 22px ${A1}33`,
  };
}
const ghostBtn: React.CSSProperties = {
  padding: "12px 20px", borderRadius: 12,
  background: "var(--ws-canvas, #fff)", color: "var(--ws-text, #0F172A)",
  border: "1.5px solid var(--ws-border, #E2E8F0)", fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit",
};
const removeBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  background: "#FEF2F2", color: "#B91C1C",
  border: "1px solid #FECACA", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const addMoreBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10,
  background: "var(--ws-chip, #F1F5F9)", color: "var(--ws-text, #0F172A)",
  border: "1px dashed #CBD5E1", fontSize: 13, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", marginTop: 4,
};

function regionCard(active: boolean): React.CSSProperties {
  return {
    padding: 16, borderRadius: 16,
    background: active ? `${A1}0F` : "#fff",
    border: `1.5px solid ${active ? A1 : "#E2E8F0"}`,
    textAlign: "left", cursor: "pointer", fontFamily: "inherit",
    transition: "border-color .15s, background .15s",
  };
}
