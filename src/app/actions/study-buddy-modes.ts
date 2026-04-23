"use server";

/* Study Buddy v2 — Phase 2 learning modes.
 *
 * Each mode is one server action that takes the study context + the target
 * concept and returns a typed payload the UI renders. Outputs are cached in
 * study_mode_runs so revisiting a concept doesn't re-bill LLM tokens.
 *
 * Socratic stays in @/app/actions/study-buddy — it's the default "mode".
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { callLLM } from "@/lib/ai-client";
import { checkAIAccess, logUsage } from "@/lib/ai-access";
import { awardXP } from "@/lib/gamification";
import { avatar } from "@/lib/study-buddy/providers";
import type {
  Concept,
  StudyContext,
} from "@/app/actions/study-buddy";
import type {
  ExplainOutput,
  StoryOutput,
  PodcastOutput,
  Flashcard,
  FlashcardsOutput,
  QuizQuestion,
  QuizOutput,
  DebateOutput,
  DebateTurnOutput,
  SimulationOutput,
  SimulationTurnOutput,
  VideoOutput,
} from "@/lib/study-buddy/modes";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/* ─────────── Shared helpers ─────────── */

async function requireAccess() {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false as const, error: "Unauthorized" };
  const access = await checkAIAccess(me.id, "chat").catch(() => ({ allowed: false }));
  if (!access.allowed) return { ok: false as const, error: "AI access required." };
  return { ok: true as const, user: me };
}

function parseJsonSafe<T>(raw: string): T | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

async function cacheGet<T>(
  userId: string,
  sessionId: string,
  conceptId: string,
  mode: string,
): Promise<T | null> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("study_mode_runs")
      .select("output")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .eq("concept_id", conceptId)
      .eq("mode", mode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { output: T } | null)?.output ?? null;
  } catch {
    return null;
  }
}

async function cachePut<T>(
  userId: string,
  sessionId: string,
  conceptId: string,
  mode: string,
  output: T,
  tokensUsed: number,
): Promise<void> {
  try {
    const sb = supabaseAdmin();
    await sb.from("study_mode_runs").insert({
      user_id: userId,
      session_id: sessionId,
      concept_id: conceptId,
      mode,
      output,
      tokens_used: tokensUsed,
    });
  } catch {
    /* non-fatal — cache miss next time */
  }
}

function conceptPrompt(concept: Concept): string {
  return `Concept: ${concept.title}
Summary: ${concept.summary}
Key points:
- ${concept.keyPoints.join("\n- ")}`;
}

/* ─────────── Explain mode ─────────── */

export async function explainMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<ExplainOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<ExplainOutput>(access.user.id, sessionId, concept.id, "explain");
  if (cached) return { ok: true, data: cached };

  const prompt = `You're explaining one concept to a ${ctx.level} student studying "${ctx.topic}".
Use ${ctx.language}. Be warm, clear, and give concrete examples.

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "title": "<concept title>",
  "intro": "<1-2 sentence hook in plain language>",
  "sections": [
    { "heading": "<section name>", "body": "<2-4 sentences, use examples>" }
  ],
  "takeaway": "<1 sentence — the single most important thing to remember>"
}

Rules:
- 3 to 5 sections
- Total body text 250-500 words
- No markdown symbols (no **, no #, no bullets inside body)`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You are CIOS Study Buddy — a warm, precise teacher who loves concrete examples over abstractions.`,
    maxTokens: 1200,
  });
  const parsed = parseJsonSafe<ExplainOutput>(text);
  if (!parsed) return { ok: false, error: "Could not parse Explain output" };

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, "explain", parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

/* ─────────── Story mode ─────────── */

export async function storyMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<StoryOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<StoryOutput>(access.user.id, sessionId, concept.id, "story");
  if (cached) return { ok: true, data: cached };

  const prompt = `Retell this concept as a vivid short story. Use an African or Nigerian setting
(Lagos market, Ibadan campus, Kano, Accra, Nairobi — whichever fits) and
named characters whose actions illustrate the concept. Use ${ctx.language}.

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "title": "<story title>",
  "setting": "<one line — where/when>",
  "story": "<3-5 short paragraphs, \\n\\n separated, 250-450 words total>",
  "moral": "<1 sentence — the concept, made explicit>"
}

Rules:
- Use at least two named characters
- Include a local detail (food, transport, proverb, song) that makes it memorable
- The concept must be provably illustrated — not just mentioned by name`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You are a griot / storyteller for CIOS interns. Concrete, vivid, culturally grounded.`,
    maxTokens: 1400,
  });
  const parsed = parseJsonSafe<StoryOutput>(text);
  if (!parsed) return { ok: false, error: "Could not parse Story output" };

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, "story", parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

/* ─────────── Podcast mode ─────────── */

export async function podcastMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<PodcastOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<PodcastOutput>(access.user.id, sessionId, concept.id, "podcast");
  if (cached) return { ok: true, data: cached };

  const prompt = `Write a 2-host podcast mini-episode about this concept for a ${ctx.level} audience.
Hosts: one Nigerian (Tunde — direct, curious), one Ghanaian (Ama — warm, analogical).
They speak in ${ctx.language}. Keep turns short, conversational, ~15-30 words each.
Aim for 14-20 turns total. They should disagree once, then resolve.

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "title": "<punchy episode title>",
  "hostA": "Tunde",
  "hostB": "Ama",
  "turns": [
    { "speaker": "A", "text": "<Tunde opens the show>" },
    { "speaker": "B", "text": "<Ama's response>" }
  ],
  "estReadSec": <integer — total spoken seconds, ~150 words per minute>
}

Rules:
- First turn greets the listener and states the topic
- Final turn wraps with the single most important takeaway
- No markdown, no stage directions, just speech`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You write tight, warm, conversational audio scripts. No filler, no platitudes.`,
    maxTokens: 1800,
  });
  const parsed = parseJsonSafe<PodcastOutput>(text);
  if (!parsed || !Array.isArray(parsed.turns) || parsed.turns.length < 4) {
    return { ok: false, error: "Could not parse Podcast output" };
  }

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, "podcast", parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

/* ─────────── Flashcard mode ─────────── */

export async function flashcardMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<FlashcardsOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<FlashcardsOutput>(access.user.id, sessionId, concept.id, "flashcards");
  if (cached) return { ok: true, data: cached };

  const prompt = `Generate 6 to 10 study flashcards for this concept. ${ctx.level} level. Use ${ctx.language}.
Front = a short question or cue (<= 15 words). Back = a concise answer (<= 40 words).

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "title": "<concept title>",
  "cards": [
    { "id": "c1", "front": "<question>", "back": "<answer>", "hint": "<optional one-word hint>" }
  ]
}

Rules:
- Mix card types: definition, fill-in, compare, example, pitfall
- No repetition — each card teaches something different
- No "Who/What is X?" with the same X twice`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You build flashcards a student can actually memorize. Short, specific, atomic.`,
    maxTokens: 1200,
  });
  const parsed = parseJsonSafe<FlashcardsOutput>(text);
  if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length < 3) {
    return { ok: false, error: "Could not parse Flashcards output" };
  }

  // Give each card a stable id if the LLM didn't
  parsed.cards = parsed.cards.map((c: Flashcard, i) => ({ ...c, id: c.id || `c${i + 1}` }));

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, "flashcards", parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

/* ─────────── Quiz mode ─────────── */

/** Adaptive quiz. If priorScore is provided (from study_mastery.last_score),
 *  the prompt nudges the LLM up or down the difficulty curve.
 *  - 0-49  → remedial: walk through basics again with scaffolded questions
 *  - 50-79 → reinforce: moderate difficulty, mix recall + application
 *  - 80+   → stretch: application, edge cases, comparisons
 *
 *  The bucket also decides the cache key — a remedial and a stretch quiz for
 *  the same concept are different artifacts and shouldn't collide. */
export async function quizMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
  priorScore?: number,
): Promise<R<QuizOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const bucket = typeof priorScore === "number"
    ? (priorScore >= 80 ? "stretch" : priorScore >= 50 ? "reinforce" : "remedial")
    : "baseline";

  // Cache per-bucket so a student who masters a concept and revisits later
  // gets a harder quiz, not the one they've already seen.
  const bucketKey = bucket === "baseline" ? "quiz" : `quiz_${bucket}`;
  const cached = await cacheGet<QuizOutput>(access.user.id, sessionId, concept.id, bucketKey);
  if (cached) return { ok: true, data: cached };

  const ramp =
    bucket === "remedial"  ? "Start easy. Most questions test recall/definition. Build confidence." :
    bucket === "reinforce" ? "Mix recall and application evenly. Distractors realistic." :
    bucket === "stretch"   ? "Push hard. Application, edge cases, compare-contrast. Distractors should trap a student who only half-understands." :
                             "Gentle difficulty ramp q1 easiest, q6 hardest.";

  const prompt = `Generate a 6-question quiz for this concept. ${ctx.level} level. Use ${ctx.language}.
Mix 4 multiple-choice (4 options each, one correct) and 2 short-answer.

Student profile: previously scored ${typeof priorScore === "number" ? `${priorScore}%` : "N/A (first attempt)"} on this concept. Difficulty bucket: ${bucket}.
${ramp}

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "title": "<concept title> · Quiz",
  "passingScore": 4,
  "questions": [
    { "type": "mcq",   "id": "q1", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0, "explanation": "<why>" },
    { "type": "short", "id": "q5", "question": "...", "expectedKeywords": ["key1","key2","key3"], "explanation": "<why>" }
  ]
}

Rules:
- MCQ distractors must be plausible — not obvious wrong answers
- Short-answer expectedKeywords: 3-5 terms that MUST appear for a correct answer
- Explanation: 1 sentence, teaches the point`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You're a rigorous but fair examiner. Good distractors, unambiguous answers.`,
    maxTokens: 1800,
  });
  const parsed = parseJsonSafe<QuizOutput>(text);
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length < 3) {
    return { ok: false, error: "Could not parse Quiz output" };
  }
  parsed.questions = parsed.questions.map((q: QuizQuestion, i) => ({ ...q, id: q.id || `q${i + 1}` }));

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, bucketKey, parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

/** Submit quiz answers. Grades server-side, awards XP, writes mastery. */
export async function gradeQuiz(
  sessionId: string,
  concept: Concept,
  quiz: QuizOutput,
  answers: Array<{ questionId: string; mcqIndex?: number; shortText?: string }>,
): Promise<R<{ score: number; total: number; passed: boolean; perfect: boolean; perQuestion: Array<{ id: string; correct: boolean; explanation: string }>; xpAwarded: number }>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const perQuestion: Array<{ id: string; correct: boolean; explanation: string }> = [];
  let score = 0;

  for (const q of quiz.questions) {
    const a = answers.find((x) => x.questionId === q.id);
    let correct = false;

    if (q.type === "mcq") {
      correct = a?.mcqIndex === q.correctIndex;
    } else {
      // Short-answer: require >=50% of expected keywords present (case-insensitive, whole words)
      const txt = (a?.shortText || "").toLowerCase();
      const hits = q.expectedKeywords.filter((k) => txt.includes(k.toLowerCase())).length;
      correct = hits >= Math.ceil(q.expectedKeywords.length * 0.5);
    }

    if (correct) score += 1;
    perQuestion.push({ id: q.id, correct, explanation: q.explanation });
  }

  const total = quiz.questions.length;
  const passed = score >= (quiz.passingScore ?? Math.ceil(total * 0.6));
  const perfect = score === total;

  // Update mastery (SM-2-lite)
  const scorePct = Math.round((score / total) * 100);
  await upsertMastery(access.user.id, sessionId, concept.id, concept.title, scorePct);

  // Award XP (dedup by session+concept)
  let xpAwarded = 0;
  if (perfect) {
    const r = await awardXP(access.user.id, "perfect_quiz", {
      refType: "study_quiz",
      refId: `${sessionId}:${concept.id}`,
    });
    xpAwarded += r.awarded;
  } else if (passed) {
    const r = await awardXP(access.user.id, "quiz_passed", {
      refType: "study_quiz",
      refId: `${sessionId}:${concept.id}`,
    });
    xpAwarded += r.awarded;
  }

  return { ok: true, data: { score, total, passed, perfect, perQuestion, xpAwarded } };
}

/* ─────────── Debate mode ─────────── */

export async function debateMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<DebateOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<DebateOutput>(access.user.id, sessionId, concept.id, "debate");
  if (cached) return { ok: true, data: cached };

  const prompt = `Set up a short debate on this concept. Pick a SPECIFIC, DEFENSIBLE claim the student will defend.
${ctx.level} level. Use ${ctx.language}.

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "prompt": "<Defend: specific claim, 1-2 sentences>",
  "stance": "pro",
  "openingMove": "<AI opens with the strongest counter-argument in <= 60 words>"
}

Rules:
- The claim must have real intellectual content — not a truism
- stance is from the STUDENT's perspective ("pro" = they defend it)
- openingMove is a genuine challenge, not a softball`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You are a rigorous debate partner. Challenge the student — never flatter them.`,
    maxTokens: 600,
  });
  const parsed = parseJsonSafe<DebateOutput>(text);
  if (!parsed) return { ok: false, error: "Could not parse Debate output" };

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, "debate", parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

export async function debateTurn(
  ctx: StudyContext,
  concept: Concept,
  stance: "pro" | "con",
  history: Array<{ role: "user" | "ai"; content: string }>,
  userTurn: string,
): Promise<R<DebateTurnOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const transcript = history.map((h) => `${h.role === "user" ? "Student" : "AI"}: ${h.content}`).join("\n");
  const round = Math.ceil(history.filter((h) => h.role === "user").length / 1) + 1;
  const shouldClose = round >= 4;

  const prompt = `You're debating the student. They defend "${stance}". Concept: ${concept.title}.
${conceptPrompt(concept)}

Transcript:
${transcript}
Student: ${userTurn}

${shouldClose
  ? "Give a final summary: score their overall argument 1-10, one tip, close the round with \"isClosing\": true."
  : "Push back with ONE counter in <=80 words. Score their last argument 1-10."}

Return ONLY valid JSON:
{
  "reply": "<${shouldClose ? "closing summary" : "counter-argument"} in ${ctx.language}>",
  "argumentScore": <1-10 integer>,
  "critique": "<1 sentence on what worked / what didn't>",
  "isClosing": ${shouldClose}
}`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You're a rigorous debate partner. Be tough but fair. Cite the concept's actual content.`,
    maxTokens: 500,
  });
  const parsed = parseJsonSafe<DebateTurnOutput>(text);
  if (!parsed) return { ok: false, error: "Could not parse debate turn" };
  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  return { ok: true, data: parsed };
}

/* ─────────── Simulation mode ─────────── */

export async function simulationMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<SimulationOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<SimulationOutput>(access.user.id, sessionId, concept.id, "simulation");
  if (cached) return { ok: true, data: cached };

  const prompt = `Set up a roleplay scenario that forces the student to apply this concept to a real-world situation.
${ctx.level} level. Use ${ctx.language}. Pick a character (client, teammate, manager, journalist, student, friend)
who doesn't know the concept. The student has to explain / apply it under mild pressure.

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "scenario": "<2-3 sentence setup — where, why, stakes>",
  "characterName": "<realistic West/East African name>",
  "characterRole": "<client | non-technical manager | interested journalist | etc>",
  "openingLine": "<character's first line — a real question or objection in <=40 words>"
}

Rules:
- Scenario must be specific enough to feel real (a city, an industry, a deadline)
- Opening line is not a pleasantry — it's a genuine challenge`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You design realistic professional simulations — the kind that actually build skill.`,
    maxTokens: 500,
  });
  const parsed = parseJsonSafe<SimulationOutput>(text);
  if (!parsed) return { ok: false, error: "Could not parse Simulation output" };

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  await cachePut(access.user.id, sessionId, concept.id, "simulation", parsed, Math.ceil(text.length / 4));
  return { ok: true, data: parsed };
}

export async function simulationTurn(
  ctx: StudyContext,
  concept: Concept,
  sim: SimulationOutput,
  history: Array<{ role: "user" | "character"; content: string }>,
  userTurn: string,
): Promise<R<SimulationTurnOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const transcript = history.map((h) => `${h.role === "user" ? "Student" : sim.characterName}: ${h.content}`).join("\n");
  const round = history.filter((h) => h.role === "user").length + 1;
  const shouldClose = round >= 5;

  const prompt = `You ARE ${sim.characterName}, a ${sim.characterRole}. Scenario: ${sim.scenario}
Stay in character. Use ${ctx.language}. Test whether the student really understands "${concept.title}".
${conceptPrompt(concept)}

Transcript:
${transcript}
Student: ${userTurn}

${shouldClose
  ? "Close the scene: thank the student, say whether you'd trust them with this topic now, set \"isClosing\": true."
  : "Respond in character — ask one sharper follow-up question in <=60 words. Score clarity 1-10."}

Return ONLY valid JSON:
{
  "reply": "<in character>",
  "clarityScore": <1-10>,
  "tip": "<1 sentence meta feedback — what they could explain better>",
  "isClosing": ${shouldClose}
}`;

  const t0 = Date.now();
  const { text, model } = await callLLM(prompt, {
    system: `You roleplay professionally realistic characters and coach the student through skilled application of ideas.`,
    maxTokens: 500,
  });
  const parsed = parseJsonSafe<SimulationTurnOutput>(text);
  if (!parsed) return { ok: false, error: "Could not parse simulation turn" };
  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(prompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });
  return { ok: true, data: parsed };
}

/* ─────────── Mastery (SM-2-lite) ─────────── */

/** Upsert a mastery row using an SM-2-lite scheduler. scorePct is 0..100.
 *  Passing (>=70) grows the interval; failing resets it. */
async function upsertMastery(
  userId: string,
  sessionId: string,
  conceptId: string,
  conceptTitle: string,
  scorePct: number,
): Promise<void> {
  try {
    const sb = supabaseAdmin();
    const { data: prior } = await sb
      .from("study_mastery")
      .select("ease, interval_days, repetitions")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .eq("concept_id", conceptId)
      .maybeSingle();

    const prev = prior as { ease: number; interval_days: number; repetitions: number } | null;
    const passed = scorePct >= 70;

    let ease = prev?.ease ?? 2.5;
    let repetitions = prev?.repetitions ?? 0;
    let intervalDays = prev?.interval_days ?? 0;

    if (passed) {
      repetitions += 1;
      intervalDays =
        repetitions === 1 ? 1 :
        repetitions === 2 ? 3 :
        Math.round(intervalDays * ease);
      // Ease drifts up on perfect, down on just-barely-pass
      const q = scorePct >= 95 ? 5 : scorePct >= 85 ? 4 : 3;
      ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    } else {
      repetitions = 0;
      intervalDays = 0;
      ease = Math.max(1.3, ease - 0.2);
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + intervalDays * 86400_000);

    await sb.from("study_mastery").upsert(
      {
        user_id: userId,
        session_id: sessionId,
        concept_id: conceptId,
        concept_title: conceptTitle,
        ease,
        interval_days: intervalDays,
        repetitions,
        last_score: scorePct,
        due_at: dueAt.toISOString(),
        last_reviewed_at: now.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id,session_id,concept_id" },
    );
  } catch {
    /* non-fatal — mastery write should never break the quiz flow */
  }
}

/** Called by the Flashcards UI when the user rates a card. Score: 1=hard, 3=okay, 5=easy. */
export async function rateFlashcard(
  sessionId: string,
  conceptId: string,
  conceptTitle: string,
  quality: 1 | 3 | 5,
): Promise<R> {
  const access = await requireAccess();
  if (!access.ok) return access;
  const scorePct = quality === 5 ? 95 : quality === 3 ? 75 : 40;
  await upsertMastery(access.user.id, sessionId, conceptId, conceptTitle, scorePct);
  return { ok: true };
}

/* ─────────── Video mode (Phase 5) ─────────── */

/** Generate a short video lecture via the avatar provider. When no avatar
 *  provider is configured (dev default) we still write a clean script and
 *  return `status: "requires_launch_provider"` so the UI can show a polished
 *  "Ships at launch" state without breaking. */
export async function videoMode(
  ctx: StudyContext,
  concept: Concept,
  sessionId: string,
): Promise<R<VideoOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  const cached = await cacheGet<VideoOutput>(access.user.id, sessionId, concept.id, "video");
  // If the cached run was "ready" we can return it immediately. If it was
  // processing or a launch-gated stub, we re-run so the UI reflects current
  // provider state (super-admin may have enabled HeyGen since the cache).
  if (cached?.status === "ready" && cached.videoUrl) return { ok: true, data: cached };

  // 1) Build a ~130-word script (60 seconds at ~2 words/sec spoken rate)
  const scriptPrompt = `Write a 60-second spoken-style video script that teaches one concept crisply. ${ctx.level} level. Use ${ctx.language}.
Tone: warm, confident, one teacher addressing one student. Plain prose, no stage directions, no section headings, no markdown. Start with a hook sentence. End with the single most important takeaway.

${conceptPrompt(concept)}

Return ONLY valid JSON:
{
  "title": "<short, punchy title (<= 8 words)>",
  "script": "<120-150 words of spoken prose>",
  "estDurationSec": <integer, likely 55-70>
}`;

  const t0 = Date.now();
  const { text, model } = await callLLM(scriptPrompt, {
    system: "You write tight, spoken-style scripts for AI-avatar video lectures. Conversational, no filler.",
    maxTokens: 700,
  });
  const parsedScript = parseJsonSafe<{ title: string; script: string; estDurationSec?: number }>(text);
  if (!parsedScript?.script) return { ok: false, error: "Could not parse video script" };

  await logUsage({
    userId: access.user.id, toolId: "chat", model,
    promptTokens: Math.ceil(scriptPrompt.length / 4),
    completionTokens: Math.ceil(text.length / 4),
    latencyMs: Date.now() - t0, status: "ok",
  });

  // 2) Hand the script to the avatar provider. Dev default is "off" which
  // returns status="requires_launch_provider" — the UI renders the "ships at
  // launch" state with the rendered script visible.
  let gen;
  try {
    gen = await avatar.generate({ script: parsedScript.script, language: ctx.language });
  } catch (e) {
    return { ok: false, error: `Avatar generate failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const output: VideoOutput = {
    title: parsedScript.title || concept.title,
    script: parsedScript.script,
    status: gen.status,
    videoUrl: gen.videoUrl || undefined,
    videoId: gen.videoId,
    providerId: avatar.id,
    estDurationSec: parsedScript.estDurationSec ?? 60,
    note: gen.status === "requires_launch_provider"
      ? "Your super-admin hasn't enabled a video avatar provider yet. At launch — or any time your admin configures HeyGen — this turns into a real avatar video."
      : gen.status === "processing"
      ? "Your avatar is recording the lecture. This usually takes 30-90 seconds."
      : undefined,
  };

  await cachePut(access.user.id, sessionId, concept.id, "video", output, Math.ceil(text.length / 4));
  return { ok: true, data: output };
}

/** Poll an in-progress HeyGen video. Called by the UI every ~5 seconds while
 *  status === "processing". Returns a fresh VideoOutput so the UI just swaps. */
export async function pollVideo(
  sessionId: string,
  concept: Concept,
  videoId: string,
): Promise<R<VideoOutput>> {
  const access = await requireAccess();
  if (!access.ok) return access;

  if (!avatar.pollStatus) {
    return { ok: false, error: "Current avatar provider doesn't support polling" };
  }
  const status = await avatar.pollStatus(videoId);

  // Pull the cached script so we can echo it back on every poll response
  const cached = await cacheGet<VideoOutput>(access.user.id, sessionId, concept.id, "video");
  const scriptText = cached?.script || "";
  const title = cached?.title || concept.title;

  if (status.status === "ready") {
    const ready: VideoOutput = {
      title, script: scriptText,
      status: "ready",
      videoUrl: status.videoUrl,
      videoId,
      providerId: avatar.id,
      estDurationSec: cached?.estDurationSec,
    };
    await cachePut(access.user.id, sessionId, concept.id, "video", ready, 0);
    return { ok: true, data: ready };
  }

  if (status.status === "failed") {
    return { ok: false, error: status.error || "Video generation failed" };
  }

  return {
    ok: true,
    data: {
      title, script: scriptText,
      status: "processing",
      videoId,
      providerId: avatar.id,
      estDurationSec: cached?.estDurationSec,
      note: "Still rendering your lecture — hang tight.",
    },
  };
}
