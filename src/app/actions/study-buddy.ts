"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";
import { sendChat, type ChatMessage } from "@/app/actions/ai-chat";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";
import { cached, cacheKey, TTL } from "@/lib/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/* ─────────── Per-course "Buddy" chat (used by the intern course player) ───────────
   The [courses/id] player surfaces a floating StudyBuddyWidget with a persisted
   thread per (user, course). These exports back that widget — independent of
   the Socratic wizard below. */

export interface BuddyMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

async function getOrCreateThread(userId: string, courseId: string): Promise<string> {
  const sb = supabaseAdmin();
  const { data: existing } = await sb.from("study_buddy_threads")
    .select("id").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const { data } = await sb.from("study_buddy_threads")
    .insert({ user_id: userId, course_id: courseId }).select("id").single();
  return (data as { id: string }).id;
}

export async function getBuddyHistory(courseId: string): Promise<R<BuddyMessage[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.studyBuddy) return { ok: true, data: [] };
    const threadId = await getOrCreateThread(me.id, courseId);
    const sb = supabaseAdmin();
    const { data } = await sb.from("study_buddy_messages")
      .select("id, role, content, created_at").eq("thread_id", threadId)
      .order("created_at", { ascending: true }).limit(50);
    return { ok: true, data: (data || []) as BuddyMessage[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function sendBuddyMessage(courseId: string, userMessage: string): Promise<R<{ reply: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.studyBuddy) return { ok: false, error: "Study buddy disabled" };
    if (!userMessage.trim()) return { ok: false, error: "Say something" };

    const sb = supabaseAdmin();
    const threadId = await getOrCreateThread(me.id, courseId);

    // Course summary is cached for ~1h — it changes very rarely vs. the
    // dozens of buddy messages a user might send per session.
    const ctx = await cached(cacheKey.courseContext(courseId), TTL.long, async () => {
      const [{ data: course }, { data: modules }] = await Promise.all([
        sb.from("courses").select("title, category, difficulty").eq("id", courseId).maybeSingle(),
        sb.from("course_modules").select("title, summary, content_type").eq("course_id", courseId).order("order_index").limit(30),
      ]);
      const c = course as { title: string; category: string; difficulty: string } | null;
      const modList = ((modules || []) as Array<{ title: string; summary: string; content_type: string }>)
        .map((m) => `- ${m.title} [${m.content_type}]${m.summary ? ": " + m.summary.slice(0, 120) : ""}`).join("\n");
      return {
        title: c?.title || "this course",
        difficulty: c?.difficulty || "",
        category: c?.category || "",
        modList: modList || "(no lessons yet)",
      };
    });

    // Per-thread history is fresh every call (writes happen here).
    const { data: history } = await sb.from("study_buddy_messages")
      .select("role, content").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(16);

    const system = `You are the AI Study Buddy for a CIOS intern taking "${ctx.title}" (${ctx.difficulty}, ${ctx.category}).
Course lessons:
${ctx.modList}

Your job: answer the intern's questions about the course content, give hints when they're stuck (not full answers), motivate them, and suggest which lesson to revisit. Be concise (<120 words), warm, and a bit playful. Never invent lessons that aren't listed above.`;

    const priorTurns: ChatMessage[] = ((history || []) as Array<{ role: "user" | "assistant"; content: string }>)
      .map((h) => ({ role: h.role, content: h.content }));
    priorTurns.push({ role: "user", content: userMessage });

    const r = await sendChat({ toolId: "chat", messages: priorTurns, system, maxTokens: 500 });
    if (!r.ok) return { ok: false, error: r.error };

    await sb.from("study_buddy_messages").insert([
      { thread_id: threadId, role: "user", content: userMessage.trim() },
      { thread_id: threadId, role: "assistant", content: r.data!.reply },
    ]);

    return { ok: true, data: { reply: r.data!.reply } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─────────── Socratic wizard (used by /study-buddy/learn) ─────────── */

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
