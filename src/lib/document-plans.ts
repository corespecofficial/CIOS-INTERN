// Document plan tiers for the public Documents portal (Phase 6).
// Pure types/data — safe to import from server actions OR client components.

export type DocPlan = "free" | "pro" | "pro_plus";

export type DocKind =
  | "cv"
  | "cover_letter"
  | "pitch_deck"
  | "business_plan"
  | "sop"
  | "portfolio"
  | "linkedin_optimizer";

export interface DocKindMeta {
  id: DocKind;
  label: string;
  emoji: string;
  blurb: string;
  /** Shortest plan tier required to generate. */
  requires: DocPlan;
}

export const DOC_KINDS: DocKindMeta[] = [
  { id: "cv",                  label: "CV",                  emoji: "\u{1F4C4}", blurb: "ATS-friendly, auto-filled from your CIOS profile", requires: "free" },
  { id: "cover_letter",        label: "Cover letter",        emoji: "\u270D",     blurb: "Tailored to a specific job posting in seconds",  requires: "pro" },
  { id: "linkedin_optimizer",  label: "LinkedIn rewrite",    emoji: "\u{1F4BC}", blurb: "Headline, About, and bullets rewritten for impact", requires: "pro" },
  { id: "portfolio",           label: "Portfolio one-pager", emoji: "\u{1F3A8}", blurb: "Public link summarising your best CIOS work",        requires: "pro" },
  { id: "pitch_deck",          label: "Pitch deck",          emoji: "\u{1F4CA}", blurb: "10-slide investor deck from your startup pitch",     requires: "pro_plus" },
  { id: "business_plan",       label: "Business plan",       emoji: "\u{1F4D8}", blurb: "Full investor-ready business plan PDF",              requires: "pro_plus" },
  { id: "sop",                 label: "Statement of Purpose", emoji: "\u{1F393}", blurb: "Scholarship / grad-school SOP, tailored to programme", requires: "pro_plus" },
];

export interface PlanDef {
  id: DocPlan;
  label: string;
  priceNgn: number;          // 0 = free
  tagline: string;
  badge?: string;
  unlocks: DocKind[];
  features: string[];
}

export const DOC_PLANS: PlanDef[] = [
  {
    id: "free",
    label: "Free",
    priceNgn: 0,
    tagline: "Always free CV — no card required",
    unlocks: ["cv"],
    features: [
      "Free unlimited CV generation",
      "5 ATS-friendly templates",
      "Auto-filled from your CIOS profile",
      "Public share link",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    priceNgn: 4_900,
    badge: "Most popular",
    tagline: "Everyday job-search toolkit",
    unlocks: ["cv", "cover_letter", "linkedin_optimizer", "portfolio"],
    features: [
      "Everything in Free",
      "Tailored cover letters from a job description",
      "LinkedIn rewrite (headline + About + bullets)",
      "Portfolio one-pager",
      "Unlimited regenerations",
    ],
  },
  {
    id: "pro_plus",
    label: "Pro+",
    priceNgn: 12_900,
    tagline: "Investor + scholarship grade",
    unlocks: ["cv", "cover_letter", "linkedin_optimizer", "portfolio", "pitch_deck", "business_plan", "sop"],
    features: [
      "Everything in Pro",
      "10-slide investor pitch deck",
      "Full business plan PDF",
      "Statement of purpose for grad/scholarship",
      "Priority AI model on every doc",
    ],
  },
];

/** True if `plan` includes generation of `kind`. */
export function planAllows(plan: DocPlan, kind: DocKind): boolean {
  const p = DOC_PLANS.find((x) => x.id === plan);
  if (!p) return false;
  return p.unlocks.includes(kind);
}

/** Smallest plan that unlocks `kind` — used for upgrade prompts. */
export function minPlanFor(kind: DocKind): DocPlan {
  return DOC_KINDS.find((k) => k.id === kind)?.requires ?? "pro";
}

export function planLabel(id: string): string {
  return DOC_PLANS.find((p) => p.id === id)?.label ?? "Free";
}
