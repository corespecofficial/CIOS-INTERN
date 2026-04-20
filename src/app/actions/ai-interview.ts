"use server";

import { getCurrentDbUser } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";
import type { InterviewQuestion } from "@/lib/interview-tracks";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/** Generate 8 mock interview questions for a given track/role (legacy setup flow) */
export async function generateInterviewQuestions(
  track: string,
  role: string,
  difficulty: "entry" | "mid" | "senior",
): Promise<R<InterviewQuestion[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required. Ask your admin to enable it." };

    const prompt = `Generate exactly 8 interview questions for a ${difficulty}-level ${role} position in ${track}. Mix behavioral (2), technical (4), and situational (2) questions. Return ONLY valid JSON array — no markdown, no extra text.

Format:
[
  { "id": "q1", "question": "...", "type": "behavioral", "tip": "Focus on..." },
  { "id": "q2", "question": "...", "type": "technical" },
  ...
]`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: `You are an expert ${track} interviewer. Generate realistic, challenging interview questions appropriate for a ${difficulty}-level candidate.`,
      maxTokens: 1200,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { ok: false, error: "Failed to generate questions. Please try again." };
    const questions: InterviewQuestion[] = JSON.parse(jsonMatch[0]);

    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });

    return { ok: true, data: questions };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Score and give feedback on a single interview answer */
export async function scoreInterviewAnswer(
  question: string,
  answer: string,
  track: string,
): Promise<R<{ score: number; strengths: string; improvements: string; sampleAnswer: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (answer.trim().length < 20) return { ok: false, error: "Answer is too short to evaluate." };

    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const prompt = `Evaluate this interview answer and return ONLY valid JSON — no markdown, no extra text.

Question: ${question}
Candidate's Answer: ${answer}

Return exactly:
{
  "score": <1-10>,
  "strengths": "<1-2 sentences on what was good>",
  "improvements": "<1-2 sentences on what to improve>",
  "sampleAnswer": "<A concise strong answer in 3-4 sentences>"
}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: `You are an expert interview coach specializing in ${track}. Give honest, constructive, specific feedback.`,
      maxTokens: 600,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ok: false, error: "Could not parse feedback." };
    const result = JSON.parse(jsonMatch[0]);

    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });

    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── Live RAG interview flow ─────────── */

export interface InterviewContext {
  interviewType: string;      // behavioural, case, stress, competency_based, panel, group, formal
  interviewStage: string;     // first_round, second_round
  interviewerType: string;    // hr, hiring_manager
  language: string;           // English, Spanish, Chinese, Arabic, etc.
  jobDescription: string;
  lengthMinutes: number;
  cvSummary: string;          // text summary of user's CV
}

export interface InterviewTurn {
  role: "interviewer" | "candidate";
  content: string;
}

/** Pull key facts from a pasted CV so we can ground follow-up questions. */
export async function extractCvSummary(cvText: string): Promise<R<{ summary: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (cvText.trim().length < 60) return { ok: false, error: "CV is too short to parse." };

    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const prompt = `Summarise the following CV into 6-10 short bullet points covering: most recent role & company, years of experience, core skills, notable achievements, education, and any niche strengths. Plain text only, one bullet per line, no markdown.

CV:
${cvText.slice(0, 8000)}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are a professional resume analyst. Produce a tight factual summary only — no prose, no headers.",
      maxTokens: 400,
    });

    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });

    return { ok: true, data: { summary: text.trim() } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** AI opener — the first question the interviewer asks. */
export async function generateInterviewOpener(ctx: InterviewContext): Promise<R<{ opener: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const prompt = buildOpenerPrompt(ctx);
    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: buildInterviewerSystem(ctx),
      maxTokens: 220,
    });
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: { opener: text.trim() } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Continue the interview — given history + latest candidate answer, return the next interviewer line. */
export async function respondToInterviewAnswer(
  ctx: InterviewContext,
  history: InterviewTurn[],
  candidateAnswer: string,
): Promise<R<{ reply: string; done: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const turnsAsked = history.filter((t) => t.role === "interviewer").length;
    // Enforce free-tier 12 question cap
    const MAX_QUESTIONS = 12;
    const shouldWrap = turnsAsked >= MAX_QUESTIONS;

    const transcript = history.map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.content}`).join("\n");
    const directive = shouldWrap
      ? "The interview has reached the question cap. Wrap up with a brief warm closing message (2-3 sentences) in the target language, and end with the literal token [END_INTERVIEW] on its own line."
      : `Ask ONE next question. Make it a natural follow-up if the candidate's last answer raised interesting threads, otherwise move to a new area. Stay in the target language. No greetings, no commentary — just the question. Aim for <= 35 words.`;

    const prompt = `${buildContextBlock(ctx)}
Transcript so far:
${transcript}
Candidate (latest): ${candidateAnswer}

${directive}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: buildInterviewerSystem(ctx),
      maxTokens: 250,
    });

    const replyRaw = text.trim();
    const done = shouldWrap || /\[END_INTERVIEW\]/i.test(replyRaw);
    const reply = replyRaw.replace(/\[END_INTERVIEW\]/ig, "").trim();

    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: { reply, done } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Generate a final debrief after the interview is done. */
export async function debriefInterview(
  ctx: InterviewContext,
  history: InterviewTurn[],
): Promise<R<{ overallScore: number; strengths: string; improvements: string; nextSteps: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const transcript = history
      .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.content}`)
      .join("\n");

    const prompt = `${buildContextBlock(ctx)}
Full transcript:
${transcript}

Return ONLY valid JSON (no markdown) with this shape:
{
  "overallScore": <number 1-10>,
  "strengths": "<2-3 sentences>",
  "improvements": "<2-3 sentences>",
  "nextSteps": "<2-3 practical next actions>"
}
Write in English even if the interview was in another language.`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are an experienced hiring manager writing a post-interview debrief. Be direct, warm, and specific.",
      maxTokens: 450,
    });

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "Could not parse debrief." };
    const parsed = JSON.parse(m[0]);
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ─────────── prompt helpers ─────────── */

function buildInterviewerSystem(ctx: InterviewContext): string {
  const persona =
    ctx.interviewerType === "hr"
      ? "an HR business partner evaluating culture-add and communication"
      : "a hiring manager probing for technical depth, ownership and decision-making";

  const tone =
    ctx.interviewType === "stress"
      ? "Keep light pressure in your tone; occasionally challenge the candidate's reasoning, but stay professional."
      : ctx.interviewType === "behavioural"
      ? "Dig for STAR stories — Situation, Task, Action, Result."
      : ctx.interviewType === "case"
      ? "Pose structured case problems and ask the candidate to reason out loud."
      : ctx.interviewType === "competency_based"
      ? "Use competency frameworks (e.g. ownership, collaboration, impact) to ground every question."
      : ctx.interviewType === "panel"
      ? "Act as the lead of a 3-person panel. Occasionally mention what a colleague would add."
      : ctx.interviewType === "group"
      ? "Frame questions as group activities; reference other candidates at the table."
      : "Use a formal, structured tone appropriate for a senior role screening.";

  return `You are CIOS, acting as ${persona} conducting a ${ctx.interviewStage.replace("_", " ")} ${ctx.interviewType.replace("_", " ")} interview. Speak entirely in ${ctx.language}. ${tone} Ask one question at a time. Never break character, never explain that you are an AI.`;
}

function buildContextBlock(ctx: InterviewContext): string {
  return `Interview context:
- Type: ${ctx.interviewType}
- Stage: ${ctx.interviewStage}
- Interviewer persona: ${ctx.interviewerType}
- Target language: ${ctx.language}
- Length (approx): ${ctx.lengthMinutes} minutes

Job description:
${ctx.jobDescription.slice(0, 4000)}

Candidate CV summary:
${ctx.cvSummary.slice(0, 3000)}
`;
}

function buildOpenerPrompt(ctx: InterviewContext): string {
  return `${buildContextBlock(ctx)}
Start the interview. Greet the candidate warmly by role (not name), set expectations in 1 sentence, and ask the FIRST question. Stay in ${ctx.language}. Keep the whole message under 60 words.`;
}
