/** Pure scoring utilities — no DB, no AI calls, safe for client + server. */

export interface ApplicantLike {
  skills?: string[] | null;
  headline?: string | null;
  bio?: string | null;
  level?: number;
  xp?: number;
  reputation?: number;
  performance?: number;
}

export interface OpportunityLike {
  skills?: string[] | null;
  requirements?: string | null;
  description?: string | null;
  title?: string;
}

export interface MatchResult {
  score: number;              // 0..100
  skillsMatched: string[];    // intersection
  skillsMissing: string[];    // opp skills not in applicant's skills
  signals: { skillFit: number; levelSignal: number; reputation: number; performance: number; textFit: number };
  grade: "excellent" | "strong" | "average" | "weak";
}

const norm = (s: string) => s.trim().toLowerCase();

/** Score an applicant against an opportunity on a 0–100 scale. Deterministic. */
export function matchApplicant(applicant: ApplicantLike, opp: OpportunityLike): MatchResult {
  const oppSkills = (opp.skills || []).map(norm).filter(Boolean);
  const appSkills = (applicant.skills || []).map(norm).filter(Boolean);
  const oppSkillSet = new Set(oppSkills);
  const appSkillSet = new Set(appSkills);

  // 1. Skill fit (45 pts) — % of opp skills present
  let skillFit = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  if (oppSkills.length === 0) {
    skillFit = appSkills.length > 0 ? 30 : 20;  // neutral if opp lists no skills
  } else {
    for (const s of oppSkills) (appSkillSet.has(s) ? matched : missing).push(s);
    skillFit = Math.round((matched.length / oppSkills.length) * 45);
  }

  // 2. Level / XP signal (15 pts) — capped at level 20 or 20k XP
  const level = applicant.level || 1;
  const xp = applicant.xp || 0;
  const levelSignal = Math.min(15, Math.round((level / 20) * 8 + (xp / 20000) * 7));

  // 3. Reputation (15 pts) — capped at 500 rep
  const reputation = Math.min(15, Math.round(((applicant.reputation || 0) / 500) * 15));

  // 4. Performance (15 pts) — taken directly if 0..100
  const performance = Math.min(15, Math.round(((applicant.performance || 0) / 100) * 15));

  // 5. Text fit (10 pts) — headline/bio overlap with opp text
  const text = `${applicant.headline || ""} ${applicant.bio || ""}`.toLowerCase();
  const oppText = `${opp.title || ""} ${opp.description || ""} ${opp.requirements || ""}`.toLowerCase();
  let textFit = 0;
  if (text.trim() && oppText.trim()) {
    const oppTokens = new Set(oppText.split(/\W+/).filter((w) => w.length > 3));
    const appTokens = text.split(/\W+/).filter((w) => w.length > 3);
    let hits = 0;
    for (const w of appTokens) if (oppTokens.has(w)) { hits++; if (hits >= 10) break; }
    textFit = Math.min(10, hits);
  }

  const score = Math.min(100, skillFit + levelSignal + reputation + performance + textFit);
  const grade: MatchResult["grade"] = score >= 80 ? "excellent" : score >= 60 ? "strong" : score >= 40 ? "average" : "weak";

  // De-dupe + keep original casing by reverse-looking-up
  const origOpp = new Map((opp.skills || []).map((s) => [norm(s), s]));
  return {
    score,
    skillsMatched: matched.map((s) => origOpp.get(s) || s),
    skillsMissing: missing.map((s) => origOpp.get(s) || s),
    signals: { skillFit, levelSignal, reputation, performance, textFit },
    grade,
  };
}

/** Recruiter badges — derived from hires_count / rating / verified flag. */
export interface RecruiterBadge { id: string; label: string; emoji: string; color: string; description: string }

export function getRecruiterBadges(p: { hires_count?: number; rating?: number; verified?: boolean; listings_count?: number }): RecruiterBadge[] {
  const out: RecruiterBadge[] = [];
  if (p.verified) out.push({ id: "verified", label: "Verified", emoji: "✓", color: "#1E88E5", description: "Business verified by Super Admin" });
  if ((p.hires_count || 0) >= 1) out.push({ id: "first_hire", label: "First Hire", emoji: "🎯", color: "#66BB6A", description: "Made their first hire on CIOS" });
  if ((p.hires_count || 0) >= 10) out.push({ id: "prolific_hirer", label: "Prolific Hirer", emoji: "🔥", color: "#FF7043", description: "10+ hires on CIOS" });
  if ((p.hires_count || 0) >= 50) out.push({ id: "top_recruiter", label: "Top Recruiter", emoji: "🏆", color: "#FFC107", description: "50+ hires on CIOS" });
  if ((p.rating || 0) >= 4.5) out.push({ id: "well_rated", label: "Well Rated", emoji: "⭐", color: "#AB47BC", description: "4.5+ average rating from hires" });
  if ((p.listings_count || 0) >= 10) out.push({ id: "active_poster", label: "Active Poster", emoji: "📣", color: "#26C6DA", description: "Posted 10+ opportunities" });
  return out;
}
