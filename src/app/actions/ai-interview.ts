"use server";

import { getCurrentDbUser } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface InterviewQuestion {
  id: string;
  question: string;
  type: "behavioral" | "technical" | "situational";
  tip?: string;
}

export interface QuestionFeedback {
  questionId: string;
  score: number;      // 1–10
  strengths: string;
  improvements: string;
  sampleAnswer: string;
}

export const TRACKS = [
  "UI/UX Design",
  "Web Development",
  "Digital Marketing",
  "Data Analytics",
  "Video Editing",
  "Copywriting",
  "AI & Automation",
  "Business Development",
] as const;

/** Generate 8 mock interview questions for a given track/role */
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

    // Extract JSON array from response
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
