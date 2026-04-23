/* Study Buddy v2 — Learning Mode definitions.
 *
 * Shared by the ModePicker UI and the per-mode server actions. The existing
 * Socratic wizard is one of 8 modes here (kind: "socratic") — it keeps using
 * the actions in @/app/actions/study-buddy so no regression. New modes are
 * implemented in @/app/actions/study-buddy-modes.
 */

export type ModeId =
  | "explain"
  | "socratic"
  | "story"
  | "podcast"
  | "flashcards"
  | "quiz"
  | "debate"
  | "simulation"
  | "video";

/** UI bucket — determines which session component renders. */
export type ModeKind = "read" | "socratic" | "cards" | "quiz" | "chat" | "video";

export interface ModeDefinition {
  id: ModeId;
  emoji: string;
  label: string;
  blurb: string;
  kind: ModeKind;
  /** `false` when the mode needs an API provider that only lights up at launch. */
  available: boolean;
  /** Short "best for" hint shown beside the mode card. */
  bestFor: string;
}

export const MODES: ModeDefinition[] = [
  { id: "explain",    emoji: "📖", label: "Explain",    blurb: "AI professor — structured lecture with clear examples.",       kind: "read",     available: true,  bestFor: "Getting the big picture quickly" },
  { id: "socratic",   emoji: "🧠", label: "Socratic",   blurb: "One question at a time — CIOS grades your answer and adapts.", kind: "socratic", available: true,  bestFor: "Deep understanding, exam prep" },
  { id: "story",      emoji: "📚", label: "Story",      blurb: "The concept retold with African context, characters, proverbs.", kind: "read",   available: true,  bestFor: "Remembering by narrative" },
  { id: "podcast",    emoji: "🎙", label: "Podcast",    blurb: "Two hosts discuss — listen on the go, audio plays in your browser.", kind: "read", available: true, bestFor: "Commuting, Lagos traffic" },
  { id: "flashcards", emoji: "🎴", label: "Flashcards", blurb: "Front/back cards with spaced repetition — review on a schedule.", kind: "cards",  available: true,  bestFor: "Quick recall, memorization" },
  { id: "quiz",       emoji: "✅", label: "Quiz",       blurb: "5–10 adaptive questions, scored. Pass to earn XP.",              kind: "quiz",     available: true,  bestFor: "Check mastery, earn XP" },
  { id: "debate",     emoji: "⚔",  label: "Debate",     blurb: "Defend a claim. AI counters your arguments — builds real reasoning.", kind: "chat", available: true,  bestFor: "Critical thinking" },
  { id: "simulation", emoji: "🎭", label: "Simulation", blurb: "Roleplay a scenario — explain this to a client, boss, friend.",  kind: "chat",     available: true,  bestFor: "Practice soft-skills" },
  { id: "video",      emoji: "🎬", label: "Video",      blurb: "AI-generated slideshow video with narration, images and captions in your language.", kind: "video", available: false, bestFor: "Visual learners" },
];

export const DEFAULT_MODE: ModeId = "socratic";

export function getMode(id: ModeId): ModeDefinition {
  const m = MODES.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown mode: ${id}`);
  return m;
}

/* ─────────── Output shapes for each mode ───────────
 * The server actions return these exact shapes so the UI can render without
 * surprise. Any new optional fields go at the bottom — never break the wire
 * format. */

export interface ExplainOutput {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
  takeaway: string;
}

export interface StoryOutput {
  title: string;
  setting: string;
  story: string;      // paragraphs, \n\n separated
  moral: string;
}

export interface PodcastOutput {
  title: string;
  hostA: string;      // e.g. "Tunde"
  hostB: string;      // e.g. "Ada"
  turns: Array<{ speaker: "A" | "B"; text: string }>;
  estReadSec: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

export interface FlashcardsOutput {
  title: string;
  cards: Flashcard[];
}

export type QuizQuestion =
  | { type: "mcq"; id: string; question: string; options: string[]; correctIndex: number; explanation: string }
  | { type: "short"; id: string; question: string; expectedKeywords: string[]; explanation: string };

export interface QuizOutput {
  title: string;
  questions: QuizQuestion[];
  passingScore: number;    // out of questions.length
}

export interface DebateOutput {
  prompt: string;          // "Defend the claim: …"
  stance: "pro" | "con";
  openingMove: string;     // AI's first volley
}

export interface DebateTurnOutput {
  reply: string;
  /** 1-10 assessment of the user's last argument. Only present after their turn. */
  argumentScore?: number;
  critique?: string;
  isClosing?: boolean;     // true when AI is wrapping up the round
}

export interface SimulationOutput {
  scenario: string;        // "You're presenting <topic> to a client who missed the meeting…"
  characterName: string;
  characterRole: string;
  openingLine: string;
}

export interface SimulationTurnOutput {
  reply: string;
  /** Optional running feedback — 1-10 based on clarity, correctness, tone. */
  clarityScore?: number;
  tip?: string;
  isClosing?: boolean;
}

/** Video mode — AI avatar video lecture. Three possible states:
 *  - ready                        → videoUrl is an MP4 you can drop into <video>
 *  - processing                   → poll pollVideoStatus(videoId) every ~5s
 *  - requires_launch_provider     → avatar provider is "off" (dev default); UI
 *                                   shows a polished "Ships at launch" card */
export interface VideoOutput {
  title: string;
  script: string;              // human-readable transcript so users can read if video fails
  status: "ready" | "processing" | "requires_launch_provider";
  videoUrl?: string;
  videoId?: string;
  providerId?: string;         // e.g. "heygen", "off"
  estDurationSec?: number;
  note?: string;               // human message when not ready
}
