/**
 * Creator credibility helpers — turn a seller's CIOS profile data into a
 * short, human-meaningful badge string (XP, percentile, level, role).
 *
 * Pure — safe to import from server or client.
 */

export interface CreatorCredibility {
  /** Short one-line badge. E.g. "Top 5% · Level 12 · 4,200 XP". */
  badge: string;
  /** Star tier used to pick badge colour ("founding" | "top" | "active" | "new"). */
  tier: "founding" | "top" | "active" | "new";
  /** Small "Built on CIOS" attribution tag copy. */
  provenance: string;
}

export function creatorCredibility(input: {
  xp?: number | null;
  level?: number | null;
  role?: string | null;
  percentile?: number | null;
}): CreatorCredibility {
  const xp = Math.max(0, Number(input.xp ?? 0));
  const level = Math.max(1, Number(input.level ?? 1));
  const role = input.role ?? "intern";
  const percentile = input.percentile;

  const parts: string[] = [];

  // Top-X% is the strongest signal — lead with it when we have it.
  if (percentile != null && percentile <= 10) parts.push(`Top ${percentile}%`);
  else if (percentile != null && percentile <= 25) parts.push(`Top ${percentile}%`);
  else if (role === "alumni") parts.push("Alumni");
  else if (role === "mentor") parts.push("Mentor");
  else if (role === "instructor") parts.push("Instructor");

  parts.push(`Level ${level}`);
  if (xp > 0) parts.push(`${xp >= 1000 ? (xp / 1000).toFixed(1) + "K" : xp} XP`);

  const tier: CreatorCredibility["tier"] =
    percentile != null && percentile <= 5 ? "founding" :
    percentile != null && percentile <= 25 ? "top" :
    xp > 500 ? "active" : "new";

  const provenance =
    role === "alumni" ? "Built by a CIOS alumnus" :
    role === "mentor" ? "Built by a CIOS mentor" :
    role === "instructor" ? "Built by a CIOS instructor" :
    "Built during the CIOS internship";

  return { badge: parts.join(" · "), tier, provenance };
}

/** Colour tokens for each credibility tier. Keep in sync with UI chips. */
export const TIER_STYLES: Record<CreatorCredibility["tier"], { fg: string; bg: string; border: string; label: string }> = {
  founding: { fg: "#FBBF24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)", label: "Founding talent" },
  top:      { fg: "#60A5FA", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.35)", label: "Top performer" },
  active:   { fg: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)", label: "Active creator" },
  new:      { fg: "#94A3B8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.28)", label: "New creator" },
};
