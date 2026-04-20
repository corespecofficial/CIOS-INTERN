"use server";

import { getCurrentDbUser } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface Concept {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
}

export interface KnowledgeMap {
  mainTopic: string;
  overview: string;
  concepts: Concept[];
}

export interface StudyContext {
  topic: string;
  level: "beginner" | "intermediate" | "advanced";
  style: "visual" | "auditory" | "reading" | "mixed";
  language: string;
}

export interface StudyTurn {
  role: "tutor" | "student";
  content: string;
}

/** Generate a compact reading when the student has no source material. */
export async function generateStudyContent(
  topic: string,
  level: StudyContext["level"],
): Promise<R<{ title: string; content: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const prompt = `Write a clear, accurate ${level} study primer on "${topic}". Aim for ~500-800 words. Use plain prose — no markdown headings. Start with a one-sentence overview, then cover 4-6 key ideas in short paragraphs, and finish with a brief recap.`;
    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are a patient, accurate teacher. Use simple examples and avoid jargon unless necessary.",
      maxTokens: 1200,
    });
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: { title: topic, content: text.trim() } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Extract a knowledge map from source material. */
export async function buildKnowledgeMap(
  source: string,
  topic: string,
): Promise<R<KnowledgeMap>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (source.trim().length < 80) return { ok: false, error: "Source is too short to map." };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const prompt = `Extract a structured knowledge map from the study material below. Return ONLY valid JSON — no markdown, no extra text.

{
  "mainTopic": "<short title based on topic: ${topic}>",
  "overview": "<2-sentence summary>",
  "concepts": [
    { "id": "c1", "title": "<concept>", "summary": "<1 sentence>", "keyPoints": ["<3-5 bullet points>"] }
  ]
}

Rules:
- 4 to 7 concepts total
- Each concept should be answerable in 30-90 seconds
- Cover breadth before depth
- keyPoints: 3 to 5 short bullet points (<= 14 words each)

Study material:
${source.slice(0, 9000)}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are a curriculum designer. Produce structured JSON knowledge maps that cover a topic end-to-end.",
      maxTokens: 1400,
    });

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "Could not parse map. Try again." };
    const parsed: KnowledgeMap = JSON.parse(m[0]);
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Ask a Socratic question about a concept, aware of prior turns. */
export async function askStudyQuestion(
  ctx: StudyContext,
  concept: Concept,
  history: StudyTurn[],
): Promise<R<{ question: string; done: boolean }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const asked = history.filter((t) => t.role === "tutor").length;
    const MAX_QUESTIONS_PER_CONCEPT = 3;
    const shouldWrap = asked >= MAX_QUESTIONS_PER_CONCEPT;

    const transcript = history.map((t) => `${t.role === "tutor" ? "Tutor" : "Student"}: ${t.content}`).join("\n");
    const directive = shouldWrap
      ? "Offer a warm one-sentence recap of this concept and end with the literal token [CONCEPT_DONE]."
      : `Ask ONE ${ctx.level} question about this concept that builds on prior turns. Keep it under 30 words. Speak in ${ctx.language}.`;

    const prompt = `Concept: ${concept.title}
Concept summary: ${concept.summary}
Key points: ${concept.keyPoints.join("; ")}

Transcript so far:
${transcript || "(empty — this is the first question)"}

${directive}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: `You are CIOS Study Buddy — a warm, Socratic tutor. Ask one question at a time. Never give the answer before the student tries.`,
      maxTokens: 220,
    });

    const reply = text.trim();
    const done = shouldWrap || /\[CONCEPT_DONE\]/i.test(reply);
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: { question: reply.replace(/\[CONCEPT_DONE\]/ig, "").trim(), done } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Grade a student answer and explain. */
export async function gradeStudyAnswer(
  ctx: StudyContext,
  concept: Concept,
  question: string,
  answer: string,
): Promise<R<{ correct: boolean; score: number; explanation: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
    if (!access.allowed) return { ok: false, error: "AI access required." };

    const prompt = `Grade the student's answer. Return ONLY valid JSON — no markdown.

Concept: ${concept.title}
Concept summary: ${concept.summary}
Key points: ${concept.keyPoints.join("; ")}

Question: ${question}
Student answer: ${answer}

Return exactly:
{
  "correct": <boolean>,
  "score": <1-10>,
  "explanation": "<2-3 sentences explaining what was right/wrong and reinforcing the correct idea in ${ctx.language}>"
}`;

    const t0 = Date.now();
    const { text, model } = await callLLM(prompt, {
      system: "You are a warm, accurate tutor. Explain mistakes without being condescending.",
      maxTokens: 350,
    });

    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return { ok: false, error: "Could not parse feedback." };
    const parsed = JSON.parse(m[0]);
    await logUsage({ userId: me.id, toolId: "chat", model, promptTokens: Math.ceil(prompt.length / 4), completionTokens: Math.ceil(text.length / 4), latencyMs: Date.now() - t0, status: "ok" });
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
