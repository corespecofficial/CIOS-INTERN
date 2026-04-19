// Local, deterministic grader — works offline, no API keys.
// Scores each section against objective signals:
//   - Completeness (all required fields filled)
//   - Depth (word count vs target, unique word ratio)
//   - Specificity (numbers, proper nouns, evidence markers)
//   - Structure (right answer type in right field)
//
// Returns the same shape as the AI grader so the UI is identical.

import type { SectionConfig } from "@/app/actions/custom-projects-types";

export interface HeuristicSuggestion {
  section_id: string;
  suggested_score: number;
  max_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  source: "heuristic";
}

// ── Text analysis helpers ─────────────────────────────────────────────────────

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 4).length;
}

function uniqueWordRatio(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (words.length === 0) return 0;
  return new Set(words).size / words.length;
}

function hasSpecifics(text: string): { count: number; samples: string[] } {
  // Looks for numbers, proper nouns (capitalized mid-sentence), and quoted strings
  const numbers = text.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
  const propers = text.match(/(?<=[.?!]\s|^)[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) ?? [];
  const quotes = text.match(/["“][^"”]{6,}["”]/g) ?? [];
  const combined = [...numbers.slice(0, 3), ...propers.slice(0, 2), ...quotes.slice(0, 1)];
  return { count: numbers.length + propers.length + quotes.length, samples: combined };
}

function evidenceSignals(text: string): number {
  // Heuristic "evidence" markers: "because", "for example", "specifically", percentages, links
  const re = /\b(because|specifically|for example|for instance|in particular|i.e\.|e\.g\.)\b|https?:\/\/|\d+%/gi;
  return (text.match(re) ?? []).length;
}

// ── Essay scorer ──────────────────────────────────────────────────────────────

function scoreEssay(
  section: SectionConfig,
  answer: unknown,
): { score: number; strengths: string[]; weaknesses: string[]; feedback: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = (section as any).config ?? {};
  const questions: Array<{ id: string; text: string; wordTarget?: number }> = cfg.questions ?? [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!answer || typeof answer !== "object") {
    return {
      score: 0,
      strengths: [],
      weaknesses: ["No answer submitted."],
      feedback: "Intern has not answered any of the prompts in this section.",
    };
  }

  const answerObj = answer as Record<string, unknown>;
  const perQuestion: Array<{ id: string; pct: number; text: string; target: number }> = [];

  for (const q of questions) {
    const raw = answerObj[q.id];
    const text = typeof raw === "string" ? raw.trim() : "";
    const target = q.wordTarget ?? 120;
    const wc = wordCount(text);
    const pct = target > 0 ? Math.min(1, wc / target) : text.length > 0 ? 1 : 0;
    perQuestion.push({ id: q.id, pct, text, target });
  }

  if (perQuestion.length === 0) {
    // Section has no structured questions — treat whole answer as one essay
    const text = typeof answer === "string" ? answer : JSON.stringify(answer);
    const wc = wordCount(text);
    return {
      score: Math.min(1, wc / 200),
      strengths: wc > 50 ? [`Wrote ${wc} words.`] : [],
      weaknesses: wc < 50 ? ["Response is very short — develop the argument further."] : [],
      feedback:
        wc < 50
          ? "This answer needs more substance — aim for at least 150 words with specific examples."
          : `Decent length (${wc} words). Add specific examples and numbers to strengthen it.`,
    };
  }

  // Compute per-question pct and combine
  const avgPct = perQuestion.reduce((s, q) => s + q.pct, 0) / perQuestion.length;
  const allText = perQuestion.map((q) => q.text).join(" ");
  const totalWc = wordCount(allText);
  const uwr = uniqueWordRatio(allText);
  const specifics = hasSpecifics(allText);
  const evidence = evidenceSignals(allText);
  const sc = sentenceCount(allText);

  // Build scoring factors
  let raw = avgPct; // 0–1

  // Boost for uniqueness, specificity, evidence
  if (uwr > 0.55) raw += 0.05;
  if (specifics.count >= 3) raw += 0.05;
  if (evidence >= 2) raw += 0.05;
  if (sc >= perQuestion.length * 3) raw += 0.03; // roughly 3+ sentences per prompt

  // Penalty for poor uniqueness (repetitive/filler)
  if (uwr < 0.35 && totalWc > 80) raw -= 0.1;
  if (totalWc < 50) raw -= 0.15;

  // Count answered vs unanswered prompts
  const answered = perQuestion.filter((q) => wordCount(q.text) >= 15).length;
  const answeredRatio = answered / perQuestion.length;
  raw = raw * (0.4 + 0.6 * answeredRatio); // Missing prompts heavily penalized

  raw = Math.max(0, Math.min(1, raw));

  // Build strengths/weaknesses
  if (answered === perQuestion.length && answered > 0) {
    strengths.push(`Answered all ${perQuestion.length} prompts.`);
  }
  if (totalWc >= perQuestion.reduce((s, q) => s + q.target, 0) * 0.9) {
    strengths.push(`Hit the word-count target (${totalWc} total words).`);
  }
  if (specifics.count >= 3) {
    strengths.push(`Uses specific evidence — ${specifics.count} concrete references (numbers, names, quotes).`);
  }
  if (uwr > 0.55 && totalWc > 100) {
    strengths.push(`Varied vocabulary — ${Math.round(uwr * 100)}% unique words.`);
  }
  if (evidence >= 2) {
    strengths.push(`Gives reasoning — uses evidence/causal markers like "because", "for example".`);
  }

  if (answered < perQuestion.length) {
    weaknesses.push(`Missed ${perQuestion.length - answered} prompt(s) — only ${answered} of ${perQuestion.length} answered meaningfully.`);
  }
  if (totalWc < perQuestion.reduce((s, q) => s + q.target, 0) * 0.6) {
    weaknesses.push(`Too short — write closer to the word targets for each prompt.`);
  }
  if (specifics.count < 2) {
    weaknesses.push(`Lacks specifics — add numbers, dates, names, or real examples.`);
  }
  if (uwr < 0.4 && totalWc > 60) {
    weaknesses.push(`Repetitive — vary your vocabulary and avoid recycling the same phrases.`);
  }
  if (evidence === 0 && totalWc > 80) {
    weaknesses.push(`Asserts without explaining why — add reasoning (because, for example).`);
  }

  // Feedback
  const pct = Math.round(raw * 100);
  let feedback: string;
  if (raw >= 0.85) {
    feedback = `Strong work. ${totalWc} words, good specificity, clear structure across ${answered}/${perQuestion.length} prompts. Keep pushing this bar.`;
  } else if (raw >= 0.7) {
    feedback = `Solid effort (${pct}%). ${totalWc} words covered ${answered}/${perQuestion.length} prompts. The essay is there; layer in more concrete examples and numbers to move into the top tier.`;
  } else if (raw >= 0.5) {
    feedback = `Partial credit. The intern engaged with the prompts but the response is thin — ${totalWc} words across ${answered}/${perQuestion.length} prompts. Coach them to expand with specific evidence and more depth per prompt.`;
  } else if (raw >= 0.25) {
    feedback = `Below expectations. Only ${totalWc} total words and ${answered}/${perQuestion.length} prompts meaningfully answered. Needs a rewrite with proper effort — point out specific missing pieces.`;
  } else {
    feedback = `Near-empty submission — ${totalWc} words, ${answered}/${perQuestion.length} prompts answered. Return for a complete rewrite.`;
  }

  return {
    score: raw,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    feedback,
  };
}

// ── Rating-scale scorer ───────────────────────────────────────────────────────

function scoreRatingScale(section: SectionConfig, answer: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = (section as any).config ?? {};
  const pillars: Array<{ id: string; label: string }> = cfg.pillars ?? [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (!answer || typeof answer !== "object") {
    return { score: 0, strengths: [], weaknesses: ["No rating data submitted."], feedback: "Empty section." };
  }

  const answerObj = answer as Record<string, unknown>;
  let filled = 0;
  let explanations = 0;
  let totalExpWords = 0;

  for (const p of pillars) {
    const row = answerObj[p.id] as Record<string, unknown> | undefined;
    if (!row) continue;
    if (typeof row.rating === "number" || typeof row.score === "number") filled++;
    const exp = typeof row.explanation === "string" ? row.explanation : typeof row.reason === "string" ? row.reason : "";
    if (exp && exp.trim().length > 20) { explanations++; totalExpWords += wordCount(exp); }
  }

  const completeness = pillars.length > 0 ? filled / pillars.length : 0;
  const explanationRate = pillars.length > 0 ? explanations / pillars.length : 0;
  const avgExpWords = explanations > 0 ? totalExpWords / explanations : 0;

  let raw = 0.4 * completeness + 0.4 * explanationRate + 0.2 * Math.min(1, avgExpWords / 40);

  if (completeness === 1) strengths.push(`Rated all ${pillars.length} pillars.`);
  if (explanationRate >= 0.8) strengths.push(`Explained reasoning on ${explanations}/${pillars.length} pillars.`);
  if (avgExpWords > 30) strengths.push(`Explanations average ${Math.round(avgExpWords)} words — good depth.`);

  if (completeness < 1) weaknesses.push(`Skipped ${pillars.length - filled} pillar rating(s).`);
  if (explanationRate < 0.5) weaknesses.push(`Most pillars lack written reasoning — ratings alone aren't enough.`);
  if (avgExpWords < 20 && explanations > 0) weaknesses.push(`Explanations are too short — one line per pillar isn't enough.`);

  const feedback = raw >= 0.8
    ? `Thoughtful self-audit. All pillars rated with substantial written reasoning.`
    : raw >= 0.5
    ? `Good effort but uneven. ${explanations}/${pillars.length} pillars have solid explanations. Push for consistent depth.`
    : `Self-audit is incomplete or shallow. Needs more effort — rate every pillar AND explain why in at least 30 words each.`;

  return { score: Math.max(0, Math.min(1, raw)), strengths, weaknesses, feedback };
}

// ── Text-fields scorer ────────────────────────────────────────────────────────

function scoreTextFields(section: SectionConfig, answer: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg = (section as any).config ?? {};
  const fields: Array<{ id: string; label: string }> = cfg.fields ?? [];

  if (!answer || typeof answer !== "object") {
    return { score: 0, strengths: [], weaknesses: ["No answers provided."], feedback: "Empty section." };
  }
  const obj = answer as Record<string, unknown>;
  let filled = 0;
  let totalWords = 0;
  for (const f of fields) {
    const v = obj[f.id];
    const text = typeof v === "string" ? v.trim() : "";
    if (text.length >= 3) filled++;
    totalWords += wordCount(text);
  }

  const completeness = fields.length > 0 ? filled / fields.length : 0;
  const avgWords = filled > 0 ? totalWords / filled : 0;
  let raw = completeness * 0.7 + Math.min(1, avgWords / 15) * 0.3;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (completeness === 1) strengths.push(`Filled all ${fields.length} fields.`);
  if (avgWords > 10) strengths.push(`Provides context in answers (~${Math.round(avgWords)} words each).`);
  if (completeness < 1) weaknesses.push(`${fields.length - filled} field(s) empty.`);
  if (avgWords < 5 && filled > 0) weaknesses.push(`Answers are one-word — expand with context.`);

  return {
    score: Math.max(0, Math.min(1, raw)),
    strengths,
    weaknesses,
    feedback:
      raw >= 0.85
        ? `All fields filled with substantive answers.`
        : raw >= 0.5
        ? `${filled}/${fields.length} fields filled. Push for complete, detailed answers.`
        : `Section is mostly empty or too brief — needs a real attempt.`,
  };
}

// ── Planner / goal-grid scorer ────────────────────────────────────────────────

function scoreStructured(section: SectionConfig, answer: unknown) {
  if (!answer) {
    return { score: 0, strengths: [], weaknesses: ["No data submitted."], feedback: "Empty section." };
  }
  const flat = JSON.stringify(answer);
  const wc = wordCount(flat);
  const uwr = uniqueWordRatio(flat);

  let raw = Math.min(1, wc / 150);
  if (uwr > 0.5) raw += 0.05;
  if (wc < 30) raw -= 0.15;
  raw = Math.max(0, Math.min(1, raw));

  return {
    score: raw,
    strengths: wc > 100 ? [`Detailed plan (${wc} words of content).`] : [],
    weaknesses: wc < 50 ? ["Plan is sparse — fill in more cells with real intent."] : [],
    feedback:
      raw >= 0.8
        ? `Solid planning effort. Structured, detailed, reasonable variety.`
        : raw >= 0.5
        ? `Partial plan. Fill in every row/day with specific tasks, not placeholders.`
        : `Plan is mostly empty or vague. Needs a real attempt — specific daily tasks with times.`,
  };
}

// ── Covenant / free-form / default ────────────────────────────────────────────

function scoreFreeForm(section: SectionConfig, answer: unknown) {
  const text = typeof answer === "string" ? answer : JSON.stringify(answer ?? "");
  const wc = wordCount(text);
  const raw = Math.min(1, wc / 100);
  return {
    score: raw,
    strengths: wc >= 80 ? [`Thoughtful ${wc}-word response.`] : [],
    weaknesses: wc < 40 ? ["Response is too brief."] : [],
    feedback:
      raw >= 0.8
        ? "Clear, committed response."
        : raw >= 0.5
        ? `OK effort (${wc} words). Push for more specifics.`
        : `Too brief (${wc} words) — write more intentionally.`,
  };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export function heuristicGradeSection(
  section: SectionConfig,
  answer: unknown,
): HeuristicSuggestion {
  let result: { score: number; strengths: string[]; weaknesses: string[]; feedback: string };
  switch (section.type) {
    case "essay":
      result = scoreEssay(section, answer);
      break;
    case "rating_scale":
      result = scoreRatingScale(section, answer);
      break;
    case "text_fields":
      result = scoreTextFields(section, answer);
      break;
    case "planner":
    case "goal_grid":
      result = scoreStructured(section, answer);
      break;
    case "covenant":
    case "free_form":
    case "file_upload":
    default:
      result = scoreFreeForm(section, answer);
  }

  const suggested = Math.round(result.score * section.points);
  return {
    section_id: section.id,
    suggested_score: Math.max(0, Math.min(section.points, suggested)),
    max_score: section.points,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    feedback: result.feedback,
    source: "heuristic",
  };
}
