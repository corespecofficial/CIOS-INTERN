"use server";

import { getCurrentDbUser } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";
import { getRegion, type RegionId, type TemplateId } from "@/lib/cv-standards";
import { saveDocument } from "@/app/actions/documents";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface CvExperience {
  role: string;
  company: string;
  location: string;
  startDate: string;          // free text: "Jan 2023", "2023-01", etc.
  endDate: string;            // "Present" accepted
  bullets: string[];          // user-provided achievements
}

export interface CvEducation {
  level: "primary" | "secondary" | "tertiary" | "postgraduate";
  institution: string;
  qualification: string;      // e.g. "WAEC", "B.Sc Computer Science"
  startDate: string;
  endDate: string;
  grade: string;              // e.g. "Second Class Upper", "GPA 3.8"
  location: string;
}

export interface CvReferee {
  name: string;
  title: string;
  organisation: string;
  email: string;
  phone: string;
}

export interface CvLanguage {
  name: string;
  // CEFR for EU; free text otherwise
  level: string;              // "Native", "Fluent", "C2", "B1"...
}

export interface CvFormPayload {
  region: RegionId;
  template: TemplateId;

  // Identity
  fullName: string;
  headline: string;           // e.g. "Frontend Engineer"
  photoUrl: string;           // optional; "" when absent
  dob: string;                // optional free text
  nationality: string;
  maritalStatus: string;
  gender: string;
  stateOfOrigin: string;
  nyscStatus: string;

  // Contact
  email: string;
  phone: string;
  location: string;
  links: { label: string; url: string }[];

  // Summary / personal statement (UK)
  summary: string;

  // Arrays
  experience: CvExperience[];
  education: CvEducation[];
  skills: string[];
  languages: CvLanguage[];
  interests: string[];
  referees: CvReferee[];

  // Optional extras
  certifications: string[];
  projects: { name: string; blurb: string; url: string }[];
  volunteering: { role: string; organisation: string; period: string; blurb: string }[];
}

export interface CvPolished {
  summary: string;                           // polished summary paragraph
  experience: { role: string; company: string; location: string; startDate: string; endDate: string; bullets: string[] }[];
  skillsGrouped: { group: string; items: string[] }[];
  achievements: string[];                    // top 3-5 quantified bullets surfaced
  regionWarnings: string[];                  // passthrough + any AI-flagged issues
}

/** Polish a candidate's raw CV payload via the LLM. Also surfaces any region-specific warnings. */
export async function polishCvDraft(payload: CvFormPayload): Promise<R<CvPolished>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const region = getRegion(payload.region);
    if (!region) return { ok: false, error: "Unknown region" };

    // Minimum completeness so we don't waste tokens
    if (!payload.fullName || payload.experience.length === 0 || payload.education.length === 0) {
      return { ok: false, error: "Fill your name, at least one experience and one education entry." };
    }

    const prompt = `You are a senior recruiter polishing a candidate CV for the ${region.label} market. Return ONLY valid JSON — no markdown.

Region conventions:
${region.warnings.map((w) => `- ${w}`).join("\n")}

Candidate-provided payload (raw):
${JSON.stringify(
  {
    headline: payload.headline,
    summary: payload.summary,
    experience: payload.experience,
    skills: payload.skills,
    certifications: payload.certifications,
    projects: payload.projects,
  },
  null,
  2,
)}

Do the following:
1. Rewrite the summary into a tight 2-3 sentence professional paragraph (or a 1-2 sentence personal statement if the region is UK).
2. Rewrite each experience's bullets into punchy achievement-led lines. Start with a strong verb. Quantify where the candidate hinted at numbers. Keep 3-5 bullets per role. Don't invent numbers.
3. Group the flat skills list into sensible groups (e.g. "Languages", "Tools", "Soft skills").
4. Surface the top 3-5 career achievements across the entire CV as a separate "achievements" array.
5. Add any region-specific warnings you spot (missing NYSC for a Nigerian CV, photo on an ATS CV, etc.) to "regionWarnings".

Return this exact JSON shape:
{
  "summary": "...",
  "experience": [ { "role": "...", "company": "...", "location": "...", "startDate": "...", "endDate": "...", "bullets": ["..."] } ],
  "skillsGrouped": [ { "group": "...", "items": ["..."] } ],
  "achievements": ["..."],
  "regionWarnings": ["..."]
}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You polish CVs for global markets. Be accurate, don't invent facts or numbers, never add opinions.",
      maxTokens: 2200,
    });

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "Couldn't parse the polished CV." };
    const polished: CvPolished = JSON.parse(m[0]);

    // Region-wide warnings always come along for the ride
    polished.regionWarnings = [...region.warnings, ...(polished.regionWarnings || [])].slice(0, 8);

    await logUsage({
      userId: me.id, toolId: "chat", model,
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(text.length / 4),
      latencyMs: Date.now() - t0, status: "ok",
    });

    return { ok: true, data: polished };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Save the final CV package (payload + polished) as a JSON document in the user's library so they can re-open/edit it later. */
export async function saveCvDraft(payload: CvFormPayload, polished: CvPolished): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };

    const doc = JSON.stringify({ payload, polished, savedAt: new Date().toISOString() }, null, 2);
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(doc)}`;

    const name = `${payload.fullName.replace(/\s+/g, "-")}-CV-${new Date().toISOString().slice(0, 10)}.json`;

    const res = await saveDocument({
      name,
      kind: "cv",
      mime: "application/json",
      sizeBytes: doc.length,
      url: dataUrl,
      description: `CV draft — ${payload.region}/${payload.template}`,
      isGenerated: true,
      generatedBy: "cv_wizard",
    });
    if (!res.ok) return { ok: false, error: res.error };
    return { ok: true, data: { id: res.data!.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
