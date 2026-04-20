// Eagle-specific helpers for the admin grading panel:
//   1. formatEagleSection — renders each section's JSON as readable text
//   2. heuristicGradeEagleSection — local deterministic scorer, no API keys needed
//
// Both are pure functions so they work in client OR server components.

import type {
  SectionA, SectionB, SectionC, SectionD, SectionE,
  SectionF, SectionG, SectionH,
} from "@/app/actions/eagle";

// ─── Text helpers ──────────────────────────────────────────────────────────────

function wc(s: string | undefined | null): number {
  if (!s) return 0;
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function hasEvidence(s: string | undefined | null): boolean {
  if (!s) return false;
  return /\b(because|for example|specifically|e\.g\.|i\.e\.|in particular)\b|https?:\/\/|\d+/i.test(s);
}

function hasSpecifics(s: string | undefined | null): number {
  if (!s) return 0;
  const numbers = (s.match(/\b\d+(?:\.\d+)?%?\b/g) ?? []).length;
  const propers = (s.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/g) ?? []).length;
  return numbers + propers;
}

// ─── Section-by-section formatters ────────────────────────────────────────────

const QUESTIONS_A: Record<string, string> = {
  q1: "Why did you apply for this internship, honestly?",
  q2: "What does discipline mean to you?",
  q3: "Describe a moment you failed — what did you learn?",
  q4: "What scares you most about this 6-month journey?",
  q5: "Who are you becoming?",
  q6: "What will make this internship a waste for you?",
  q7: "What promise do you make to yourself?",
};

export function formatSectionA(data: SectionA | null | undefined): string {
  if (!data) return "_No response yet._";
  const parts: string[] = [];
  for (const [key, question] of Object.entries(QUESTIONS_A)) {
    const answer = (data as Record<string, string | undefined>)[key];
    parts.push(`**${question}**\n${answer?.trim() || "_(no answer)_"}`);
  }
  return parts.join("\n\n");
}

export function formatSectionB(data: SectionB | null | undefined): string {
  if (!data) return "_No response yet._";
  const pillars = [
    { key: "sincerity" as const, label: "Sincerity" },
    { key: "dedication" as const, label: "Dedication" },
    { key: "sacrifice" as const, label: "Sacrifice" },
  ];
  return pillars.map(({ key, label }) => {
    const p = data[key];
    if (!p) return `**${label}** — _(not answered)_`;
    return [
      `**${label}**`,
      `  • Self-score: ${p.score ?? "—"}/10`,
      `  • Action: ${p.action?.trim() || "_(none)_"}`,
      `  • Explanation: ${p.explanation?.trim() || "_(none)_"}`,
    ].join("\n");
  }).join("\n\n");
}

export function formatSectionC(data: SectionC | null | undefined): string {
  if (!data) return "_No response yet._";
  const parts: string[] = [];
  parts.push(`**Person studied:** ${data.person_studied?.trim() || "_(none)_"}`);
  if (data.sources && data.sources.length > 0) {
    parts.push(`**Sources:**\n${data.sources.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`);
  }
  parts.push("**5 disciplines identified:**");
  for (let i = 1; i <= 5; i++) {
    const d = (data as Record<string, string | undefined>)[`discipline_${i}`];
    parts.push(`  ${i}. ${d?.trim() || "_(none)_"}`);
  }
  parts.push(`**Hardest season:** ${data.hardest_season?.trim() || "_(none)_"}`);
  parts.push(`**Parallel to own life:** ${data.parallel?.trim() || "_(none)_"}`);
  return parts.join("\n\n");
}

const DAY_SLOTS: Array<[keyof import("@/app/actions/eagle").DaySlots, string]> = [
  ["morning", "🌅 Morning"],
  ["mid_morning", "☀️ Mid-morning"],
  ["afternoon", "🌞 Afternoon"],
  ["mid_afternoon", "🌤️ Mid-afternoon"],
  ["evening", "🌇 Evening"],
  ["night", "🌙 Night"],
  ["win", "🏆 Win"],
  ["struggle", "⚠️ Struggle"],
];

export function formatSectionD(data: SectionD | null | undefined): string {
  if (!data) return "_No response yet._";
  const parts: string[] = [];
  parts.push(`**4-day goal:** ${data.d1_goal?.trim() || "_(none)_"}`);
  parts.push(`**Non-negotiables:** ${data.d2_nonnegotiables?.trim() || "_(none)_"}`);
  const days = data.days ?? [];
  for (let i = 0; i < 4; i++) {
    const day = days[i];
    parts.push(`**Day ${i + 1}**`);
    if (!day) {
      parts.push("  _(not filled in)_");
      continue;
    }
    for (const [key, label] of DAY_SLOTS) {
      const v = day[key];
      parts.push(`  ${label}: ${v?.trim() || "_—_"}`);
    }
  }
  return parts.join("\n\n");
}

export function formatSectionE(data: SectionE | null | undefined): string {
  if (!data) return "_No response yet._";
  const horizons = [
    { key: "horizon_1" as const, label: "30 days" },
    { key: "horizon_2" as const, label: "90 days" },
    { key: "horizon_3" as const, label: "6 months" },
    { key: "horizon_4" as const, label: "1 year" },
  ];
  return horizons.map(({ key, label }) => {
    const goals = data[key] ?? [];
    if (goals.length === 0) return `**Horizon — ${label}**\n  _(no goals)_`;
    return [`**Horizon — ${label}**`, ...goals.map((g, i) => {
      return `  ${i + 1}. ${g.goal || "(unnamed goal)"} — due ${g.deadline || "—"}\n     How: ${g.how || "_(no plan)_"}`;
    })].join("\n");
  }).join("\n\n");
}

export function formatSectionF(data: SectionF | null | undefined): string {
  if (!data) return "_No response yet._";
  const parts: string[] = [];
  parts.push(`**Tagline:** ${data.tagline?.trim() || "_(none)_"}`);
  parts.push(`**Symbol/icon:** ${data.symbol?.trim() || "_(none)_"}`);
  parts.push(`**Colors:** ${(data.colors ?? []).join(", ") || "_(none)_"}`);
  parts.push(`**Values:** ${(data.values ?? []).join(", ") || "_(none)_"}`);
  parts.push(`**North star:** ${data.north_star?.trim() || "_(none)_"}`);
  parts.push(`**Design URL:** ${data.design_url?.trim() || "_(none uploaded)_"}`);
  parts.push(`**Rationale:** ${data.rationale?.trim() || "_(none)_"}`);
  return parts.join("\n\n");
}

export function formatSectionG(data: SectionG | null | undefined): string {
  if (!data) return "_No response yet._";
  const parts: string[] = [];
  parts.push(`**Current position:** ${data.current_position?.trim() || "_(none)_"}`);
  parts.push(`**30-day target:** ${data.target_30d?.trim() || "_(none)_"}`);
  parts.push(`**6-month target:** ${data.target_6m?.trim() || "_(none)_"}`);
  parts.push(`**Current XP:** ${data.current_xp ?? "—"} · **Target XP:** ${data.target_xp ?? "—"}`);
  if (data.actions && data.actions.length > 0) {
    parts.push(`**Action steps:**\n${data.actions.map((a, i) => `  ${i + 1}. ${a}`).join("\n")}`);
  }
  if (data.g1) parts.push(`**g1:** ${data.g1}`);
  if (data.g2) parts.push(`**g2:** ${data.g2}`);
  return parts.join("\n\n");
}

export function formatSectionH(data: SectionH | null | undefined): string {
  if (!data) return "_No response yet._";
  return [
    `**Agreed to covenant:** ${data.agreed ? "✅ yes" : "❌ no"}`,
    `**Signature:** ${data.signature_name?.trim() || "_(not signed)_"}`,
    `**Witness:** ${data.witness_name?.trim() || "_(none)_"}`,
    `**Signed at:** ${data.signed_at ? new Date(data.signed_at).toLocaleString() : "_(none)_"}`,
  ].join("\n");
}

export function formatEagleSection(sectionId: string, data: unknown): string {
  switch (sectionId) {
    case "A": return formatSectionA(data as SectionA);
    case "B": return formatSectionB(data as SectionB);
    case "C": return formatSectionC(data as SectionC);
    case "D": return formatSectionD(data as SectionD);
    case "E": return formatSectionE(data as SectionE);
    case "F": return formatSectionF(data as SectionF);
    case "G": return formatSectionG(data as SectionG);
    case "H": return formatSectionH(data as SectionH);
    default: return "_(unknown section)_";
  }
}

// ─── Heuristic grader (one per section) ───────────────────────────────────────

export interface EagleHeuristicSuggestion {
  section_id: string;
  suggested_score: number;
  max_score: number;
  strengths: string[];
  weaknesses: string[];
  feedback: string;
  source: "heuristic";
}

function gradeSectionA(data: SectionA | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const keys = Object.keys(QUESTIONS_A);
  const answered = keys.filter((k) => wc((data as Record<string, string>)?.[k]) >= 15);
  const totalWords = keys.reduce((a, k) => a + wc((data as Record<string, string>)?.[k]), 0);
  const avgWords = totalWords / keys.length;

  if (answered.length === keys.length) strengths.push(`Answered all ${keys.length} reflection prompts.`);
  if (avgWords >= 80) strengths.push("Strong depth — responses are well-developed.");
  if (answered.length < keys.length) weaknesses.push(`${keys.length - answered.length} of ${keys.length} prompts are empty or too short (<15 words).`);
  if (avgWords < 40) weaknesses.push("Responses are shallow — aim for 100+ words per prompt.");

  // Scoring: 0–20 pts. Base on completeness + depth.
  const completenessPct = answered.length / keys.length;
  const depthPct = Math.min(1, avgWords / 100);
  const pct = completenessPct * 0.6 + depthPct * 0.4;
  return { score: Math.round(pct * 20), strengths, weaknesses };
}

function gradeSectionB(data: SectionB | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const pillars: Array<keyof SectionB> = ["sincerity", "dedication", "sacrifice"];
  let filled = 0;
  let totalExplainWc = 0;
  let hasActions = 0;

  for (const p of pillars) {
    const pillar = data?.[p];
    if (pillar?.score !== undefined) filled++;
    if (pillar?.action?.trim()) hasActions++;
    totalExplainWc += wc(pillar?.explanation);
  }

  if (filled === 3) strengths.push("All 3 pillars (sincerity, dedication, sacrifice) rated.");
  if (hasActions === 3) strengths.push("Concrete action committed for each pillar.");
  if (totalExplainWc >= 120) strengths.push("Explanations are substantive.");

  if (filled < 3) weaknesses.push(`Only ${filled} of 3 pillars self-scored.`);
  if (hasActions < 3) weaknesses.push(`${3 - hasActions} pillar(s) missing a concrete action.`);
  if (totalExplainWc < 60) weaknesses.push("Explanations are too brief — aim for 40+ words per pillar.");

  const completenessPct = (filled / 3) * 0.4 + (hasActions / 3) * 0.3 + Math.min(1, totalExplainWc / 150) * 0.3;
  return { score: Math.round(completenessPct * 15), strengths, weaknesses };
}

function gradeSectionC(data: SectionC | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!data) return { score: 0, strengths: [], weaknesses: ["Section not answered."] };

  const disciplines = [1, 2, 3, 4, 5]
    .map((i) => (data as Record<string, string | undefined>)[`discipline_${i}`])
    .filter((d) => d && d.trim().length > 10);
  const hasPerson = !!data.person_studied?.trim();
  const sourceCount = (data.sources ?? []).filter((s) => s && s.trim()).length;
  const parallelWc = wc(data.parallel);
  const hardestWc = wc(data.hardest_season);

  if (hasPerson) strengths.push(`Studied ${data.person_studied}.`);
  if (sourceCount >= 3) strengths.push(`${sourceCount} sources cited — strong research effort.`);
  if (disciplines.length === 5) strengths.push("Identified all 5 disciplines with substance.");
  if (parallelWc >= 80) strengths.push("Thoughtful parallel drawn to own life.");

  if (!hasPerson) weaknesses.push("No person identified for the case study.");
  if (sourceCount < 2) weaknesses.push("Fewer than 2 sources cited — research depth is weak.");
  if (disciplines.length < 5) weaknesses.push(`${5 - disciplines.length} discipline(s) missing or too short.`);
  if (parallelWc < 40) weaknesses.push("Parallel to own life is underdeveloped.");
  if (hardestWc < 30) weaknesses.push("Hardest-season reflection is shallow.");

  const pct =
    (hasPerson ? 0.15 : 0) +
    Math.min(1, sourceCount / 3) * 0.2 +
    (disciplines.length / 5) * 0.3 +
    Math.min(1, parallelWc / 80) * 0.2 +
    Math.min(1, hardestWc / 50) * 0.15;
  return { score: Math.round(pct * 15), strengths, weaknesses };
}

function gradeSectionD(data: SectionD | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!data) return { score: 0, strengths: [], weaknesses: ["Section not answered."] };

  const hasGoal = wc(data.d1_goal) >= 8;
  const hasNonNego = wc(data.d2_nonnegotiables) >= 10;
  const days = data.days ?? [];
  const filledDays = days.filter((d) => {
    const slots = Object.values(d ?? {}).filter((v) => typeof v === "string" && v.trim().length > 0);
    return slots.length >= 4;
  }).length;
  const winStruggleDays = days.filter((d) => d?.win?.trim() && d?.struggle?.trim()).length;

  if (hasGoal) strengths.push("Clear 4-day goal stated.");
  if (hasNonNego) strengths.push("Non-negotiables defined.");
  if (filledDays === 4) strengths.push("All 4 days planned in detail.");
  if (winStruggleDays === 4) strengths.push("Reflected on wins AND struggles every day.");

  if (!hasGoal) weaknesses.push("4-day goal is missing or too vague.");
  if (!hasNonNego) weaknesses.push("Non-negotiables are not defined.");
  if (filledDays < 4) weaknesses.push(`${4 - filledDays} day(s) have < 4 time slots filled in.`);
  if (winStruggleDays < 4) weaknesses.push(`${4 - winStruggleDays} day(s) missing win/struggle reflection.`);

  const pct =
    (hasGoal ? 0.15 : 0) +
    (hasNonNego ? 0.15 : 0) +
    (filledDays / 4) * 0.4 +
    (winStruggleDays / 4) * 0.3;
  return { score: Math.round(pct * 15), strengths, weaknesses };
}

function gradeSectionE(data: SectionE | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!data) return { score: 0, strengths: [], weaknesses: ["Section not answered."] };

  const horizons: Array<keyof SectionE> = ["horizon_1", "horizon_2", "horizon_3", "horizon_4"];
  let validGoals = 0;
  let withDeadlines = 0;
  let withHow = 0;
  for (const h of horizons) {
    for (const g of (data[h] ?? [])) {
      if (g.goal?.trim()) validGoals++;
      if (g.deadline?.trim()) withDeadlines++;
      if (wc(g.how) >= 6) withHow++;
    }
  }

  if (validGoals >= 8) strengths.push(`${validGoals} SMART goals set across 4 horizons.`);
  if (withDeadlines === validGoals && validGoals > 0) strengths.push("Every goal has a deadline.");
  if (withHow >= validGoals * 0.8 && validGoals > 0) strengths.push("Most goals have a clear 'how' plan.");

  if (validGoals < 4) weaknesses.push(`Only ${validGoals} goals — aim for at least 2 per horizon.`);
  if (withDeadlines < validGoals) weaknesses.push(`${validGoals - withDeadlines} goal(s) missing a deadline.`);
  if (withHow < validGoals * 0.5) weaknesses.push("Most goals lack a concrete 'how' / action plan.");

  const pct =
    Math.min(1, validGoals / 8) * 0.5 +
    (validGoals > 0 ? withDeadlines / validGoals : 0) * 0.2 +
    (validGoals > 0 ? withHow / validGoals : 0) * 0.3;
  return { score: Math.round(pct * 10), strengths, weaknesses };
}

function gradeSectionF(data: SectionF | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!data) return { score: 0, strengths: [], weaknesses: ["Section not answered."] };

  const hasTag = wc(data.tagline) >= 3;
  const hasSymbol = !!data.symbol?.trim();
  const hasColors = (data.colors ?? []).length >= 2;
  const hasValues = (data.values ?? []).length >= 3;
  const hasNorthStar = wc(data.north_star) >= 8;
  const hasDesign = !!data.design_url?.trim();
  const rationaleWc = wc(data.rationale);

  if (hasTag) strengths.push("Tagline is set.");
  if (hasSymbol) strengths.push("Symbol/icon chosen.");
  if (hasColors) strengths.push(`${data.colors?.length} brand colors defined.`);
  if (hasValues) strengths.push(`${data.values?.length} core values articulated.`);
  if (hasNorthStar) strengths.push("North-star vision clearly written.");
  if (hasDesign) strengths.push("Design deliverable uploaded.");
  if (rationaleWc >= 80) strengths.push("Rationale is well-reasoned.");

  if (!hasTag) weaknesses.push("Tagline missing or too short.");
  if (!hasSymbol) weaknesses.push("Symbol/icon not chosen.");
  if (!hasColors) weaknesses.push("Fewer than 2 colors defined.");
  if (!hasValues) weaknesses.push("Fewer than 3 core values listed.");
  if (!hasNorthStar) weaknesses.push("North-star vision missing or too short.");
  if (!hasDesign) weaknesses.push("No design deliverable uploaded.");
  if (rationaleWc < 40) weaknesses.push("Rationale is too brief — explain the choices.");

  const components = [hasTag, hasSymbol, hasColors, hasValues, hasNorthStar, hasDesign];
  const filled = components.filter(Boolean).length;
  const pct = (filled / components.length) * 0.7 + Math.min(1, rationaleWc / 80) * 0.3;
  return { score: Math.round(pct * 15), strengths, weaknesses };
}

function gradeSectionG(data: SectionG | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!data) return { score: 0, strengths: [], weaknesses: ["Section not answered."] };

  const hasPos = !!data.current_position?.trim();
  const has30d = !!data.target_30d?.trim();
  const has6m = !!data.target_6m?.trim();
  const hasXp = data.current_xp !== undefined && data.target_xp !== undefined;
  const actions = (data.actions ?? []).filter((a) => a && a.trim().length > 5).length;

  if (hasPos && has30d && has6m) strengths.push("Career position mapped from current → 30d → 6m.");
  if (hasXp && (data.target_xp ?? 0) > (data.current_xp ?? 0)) strengths.push("XP target set above current — clear growth intent.");
  if (actions >= 3) strengths.push(`${actions} concrete action steps listed.`);

  if (!hasPos) weaknesses.push("Current position not stated.");
  if (!has30d) weaknesses.push("30-day target missing.");
  if (!has6m) weaknesses.push("6-month target missing.");
  if (actions < 3) weaknesses.push(`Only ${actions} action step(s) — aim for 3+.`);

  const pct =
    (hasPos ? 0.15 : 0) +
    (has30d ? 0.15 : 0) +
    (has6m ? 0.15 : 0) +
    (hasXp ? 0.15 : 0) +
    Math.min(1, actions / 3) * 0.4;
  return { score: Math.round(pct * 5), strengths, weaknesses };
}

function gradeSectionH(data: SectionH | null | undefined): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (!data?.agreed) return { score: 0, strengths: [], weaknesses: ["Covenant not agreed — section incomplete."] };

  const signed = !!data.signature_name?.trim();
  const witness = !!data.witness_name?.trim();

  if (signed) strengths.push("Signed with full name.");
  if (witness) strengths.push("Witness named.");
  if (!signed) weaknesses.push("No signature.");
  if (!witness) weaknesses.push("No witness listed.");

  const pct = (data.agreed ? 0.5 : 0) + (signed ? 0.3 : 0) + (witness ? 0.2 : 0);
  return { score: Math.round(pct * 5), strengths, weaknesses };
}

const GRADERS: Record<string, (data: unknown) => { score: number; strengths: string[]; weaknesses: string[] }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  A: (d: any) => gradeSectionA(d), B: (d: any) => gradeSectionB(d), C: (d: any) => gradeSectionC(d),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  D: (d: any) => gradeSectionD(d), E: (d: any) => gradeSectionE(d), F: (d: any) => gradeSectionF(d),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  G: (d: any) => gradeSectionG(d), H: (d: any) => gradeSectionH(d),
};

const SECTION_MAX: Record<string, number> = {
  A: 20, B: 15, C: 15, D: 15, E: 10, F: 15, G: 5, H: 5,
};

const SECTION_LABELS: Record<string, string> = {
  A: "Reflection Essay", B: "Three Pillars Audit", C: "Discipline Case Study",
  D: "4-Day Planner", E: "Goal-Setting Grid", F: "Design Challenge",
  G: "Career Ladder Map", H: "Eagle Covenant",
};

// What each section is MEANT to evaluate — the coach weaves this into
// feedback so interns see the connection between their answer and the
// Eagle Project's expectations.
const SECTION_MISSION: Record<string, string> = {
  A: "how honestly you're reflecting on yourself before the grind begins",
  B: "your self-awareness across sincerity, dedication, and sacrifice — the 3 pillars of the Eagle",
  C: "your ability to research a high-discipline figure and apply their patterns to yourself",
  D: "whether you can actually plan, execute, and review a real 4-day sprint",
  E: "your clarity on goals across 30-day, 90-day, 6-month, and 1-year horizons",
  F: "your ability to design your personal brand identity with intention",
  G: "where you are today, where you're going in 30 days / 6 months, and the XP path between",
  H: "your willingness to publicly sign the covenant and commit in front of a witness",
};

// Pull the most substantive sentence from a text — something with
// specifics, numbers, or proper nouns — so the coach can quote it back.
function extractQuote(text: string | undefined | null, maxLen = 120): string | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (cleaned.length < 20) return null;
  // Split into sentences, score each by specificity, pick the best.
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((s) => s.length >= 20);
  if (sentences.length === 0) return cleaned.slice(0, maxLen) + (cleaned.length > maxLen ? "…" : "");
  const ranked = sentences
    .map((s) => ({ s, score: hasSpecifics(s) * 2 + wc(s) + (hasEvidence(s) ? 4 : 0) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0].s;
  return best.length > maxLen ? best.slice(0, maxLen).trim() + "…" : best;
}

// Extract a representative quote + the intern's tone signal from a section.
function pullSectionContext(sectionId: string, data: unknown): { quote: string | null; vibe: string | null } {
  if (!data) return { quote: null, vibe: null };
  const d = data as Record<string, unknown>;
  let quote: string | null = null;

  switch (sectionId) {
    case "A": {
      const answers = ["q1","q2","q3","q4","q5","q6","q7"].map((k) => d[k] as string | undefined).filter(Boolean) as string[];
      quote = extractQuote(answers.join(" "));
      break;
    }
    case "B": {
      const pillars = ["sincerity","dedication","sacrifice"].map((k) => d[k] as { explanation?: string; action?: string } | undefined);
      const parts = pillars.flatMap((p) => [p?.explanation, p?.action]).filter(Boolean) as string[];
      quote = extractQuote(parts.join(" "));
      break;
    }
    case "C": {
      const parts = [d.parallel, d.hardest_season, d.discipline_1, d.discipline_2, d.discipline_3].filter(Boolean) as string[];
      quote = extractQuote(parts.join(" "));
      break;
    }
    case "D": {
      const parts = [d.d1_goal, d.d2_nonnegotiables].filter(Boolean) as string[];
      quote = extractQuote(parts.join(" "));
      break;
    }
    case "E": {
      // Extract the best "how" line across all horizons
      const goals: string[] = [];
      for (const h of ["horizon_1","horizon_2","horizon_3","horizon_4"]) {
        for (const g of ((d[h] as Array<{ goal?: string; how?: string }>) ?? [])) {
          if (g.goal) goals.push(g.goal);
          if (g.how) goals.push(g.how);
        }
      }
      quote = extractQuote(goals.join(". "));
      break;
    }
    case "F": {
      const parts = [d.tagline, d.north_star, d.rationale].filter(Boolean) as string[];
      quote = extractQuote(parts.join(" "));
      break;
    }
    case "G": {
      const parts = [d.current_position, d.target_30d, d.target_6m, ...(((d.actions as string[]) ?? []))].filter(Boolean) as string[];
      quote = extractQuote(parts.join(". "));
      break;
    }
    case "H": {
      quote = (d.signature_name as string) ? `Signed by ${d.signature_name} with ${d.witness_name ? d.witness_name + " as witness" : "no witness"}` : null;
      break;
    }
  }
  return { quote, vibe: null };
}

export function heuristicGradeEagleSection(
  sectionId: string,
  data: unknown,
): EagleHeuristicSuggestion {
  const grader = GRADERS[sectionId];
  const max = SECTION_MAX[sectionId] ?? 10;
  if (!grader) {
    return {
      section_id: sectionId,
      suggested_score: 0,
      max_score: max,
      strengths: [],
      weaknesses: ["Unknown section."],
      feedback: "Could not auto-grade — unrecognised section.",
      source: "heuristic",
    };
  }
  const { score, strengths, weaknesses } = grader(data);
  const label = SECTION_LABELS[sectionId] ?? `Section ${sectionId}`;
  const mission = SECTION_MISSION[sectionId];
  const pct = Math.round((score / max) * 100);
  const { quote } = pullSectionContext(sectionId, data);

  // Tier the opener by score band, then append a quote-grounded sentence
  // that ties the intern's words to what the section is testing, and close
  // with a specific next-step action rather than a generic platitude.
  let opener: string;
  let nextStep: string;
  if (pct >= 85) {
    opener = `Strong ${label} — ${score}/${max}.`;
    nextStep = weaknesses.length
      ? `To push to ${max}/${max}: ${weaknesses[0].toLowerCase().replace(/\.$/, "")}.`
      : `Keep this level of depth through the whole internship — this is what an Eagle submission looks like.`;
  } else if (pct >= 65) {
    opener = `Solid ${label} — ${score}/${max}.`;
    nextStep = weaknesses.length >= 2
      ? `Two things to tighten up: (1) ${weaknesses[0].toLowerCase().replace(/\.$/, "")}; (2) ${weaknesses[1].toLowerCase().replace(/\.$/, "")}.`
      : weaknesses.length
        ? `Biggest leverage point: ${weaknesses[0].toLowerCase().replace(/\.$/, "")}.`
        : `Clean effort — add one more concrete example next round.`;
  } else if (pct >= 40) {
    opener = `Partial effort on ${label} — ${score}/${max}.`;
    nextStep = weaknesses.length
      ? `Focus here before finalising: ${weaknesses.slice(0, 2).map((w) => w.toLowerCase().replace(/\.$/, "")).join("; then ")}.`
      : `Review the section brief and expand each answer with specifics.`;
  } else {
    opener = `${label} needs major work — ${score}/${max}.`;
    nextStep = `Most of the section is incomplete. Re-read the section brief, then rewrite with ${mission ? `focus on ${mission}` : "more depth and specifics"}.`;
  }

  const missionLine = mission
    ? `This section measures ${mission}.`
    : "";

  const quoteLine = quote
    ? (pct >= 65
        ? `Your line — "${quote}" — shows you're engaging with the prompt seriously.`
        : `You wrote "${quote}" — there's a seed here, but it needs more specifics (numbers, names, concrete examples) to land.`)
    : (pct < 40 ? "Nothing substantive to quote back yet — there just isn't enough written to assess." : "");

  const feedback = [opener, missionLine, quoteLine, nextStep].filter(Boolean).join(" ");

  // Enrich strengths with a quote-backed entry when the intern wrote something worth highlighting
  const enrichedStrengths = quote && pct >= 65
    ? [`Cited specifics in your own words: "${quote.slice(0, 80)}${quote.length > 80 ? "…" : ""}"`, ...strengths]
    : strengths;

  return {
    section_id: sectionId,
    suggested_score: score,
    max_score: max,
    strengths: enrichedStrengths,
    weaknesses,
    feedback,
    source: "heuristic",
  };
}
