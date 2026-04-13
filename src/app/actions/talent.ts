"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { matchApplicant, type ApplicantLike, type OpportunityLike, type MatchResult } from "@/lib/talent-match";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireRecruiter() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") throw new Error("Recruiter role required");
  return me;
}

export interface TalentRow {
  id: string; name: string; avatar_url: string | null; role: string;
  headline: string | null; location: string | null;
  xp: number; level: number; reputation: number; performance: number;
  skills: string[];
  badges_count: number;
}

export interface TalentFilter {
  q?: string;
  skill?: string;
  minLevel?: number;
  limit?: number;
}

export async function listTalent(filter: TalentFilter = {}): Promise<R<TalentRow[]>> {
  try {
    await requireRecruiter();
    const sb = supabaseAdmin();
    let q = sb.from("users")
      .select("id, name, avatar_url, role, headline, location, xp, level, reputation, performance, skills")
      .in("role", ["intern", "team_lead", "instructor"])
      .order("performance", { ascending: false }).order("xp", { ascending: false });
    if (filter.minLevel) q = q.gte("level", filter.minLevel);
    if (filter.q) q = q.or(`name.ilike.%${filter.q}%,headline.ilike.%${filter.q}%`);
    const { data } = await q.limit(filter.limit || 60);
    const rows = (data || []) as unknown as Array<TalentRow & { skills: string[] | null }>;

    // Attach badge counts
    const ids = rows.map((r) => r.id);
    const { data: badges } = ids.length > 0
      ? await sb.from("user_badges").select("user_id").in("user_id", ids)
      : { data: [] as { user_id: string }[] };
    const badgeCount = new Map<string, number>();
    for (const b of (badges || []) as { user_id: string }[]) badgeCount.set(b.user_id, (badgeCount.get(b.user_id) || 0) + 1);

    const final: TalentRow[] = rows
      .filter((r) => !filter.skill || (r.skills || []).some((s) => s.toLowerCase().includes(filter.skill!.toLowerCase())))
      .map((r) => ({ ...r, skills: r.skills || [], badges_count: badgeCount.get(r.id) || 0 }));

    return { ok: true, data: final };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export interface MatchedApplicant {
  id: string; applicant_id: string; status: string; created_at: string;
  cover_letter: string | null; portfolio_url: string | null;
  expected_salary: number | null; availability: string | null;
  applicant: (ApplicantLike & { id: string; name: string; email: string; avatar_url: string | null }) | null;
  match: MatchResult;
}

export async function getMatchedApplicants(opportunityId: string): Promise<R<{ opportunity: Record<string, unknown>; applicants: MatchedApplicant[] }>> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    const { data: opp } = await sb.from("opportunities")
      .select("id, title, description, requirements, skills, recruiter_id")
      .eq("id", opportunityId).maybeSingle();
    if (!opp) return { ok: false, error: "Opportunity not found" };
    if (opp.recruiter_id !== me.id && me.role !== "super_admin" && me.role !== "admin") return { ok: false, error: "Not your opportunity" };

    const { data: apps } = await sb.from("opportunity_applications")
      .select("id, applicant_id, status, cover_letter, portfolio_url, expected_salary, availability, created_at, applicant:applicant_id(id, name, email, avatar_url, headline, bio, skills, level, xp, reputation, performance)")
      .eq("opportunity_id", opportunityId).order("created_at", { ascending: false });

    const applicants: MatchedApplicant[] = ((apps || []) as unknown as Array<{
      id: string; applicant_id: string; status: string; cover_letter: string | null; portfolio_url: string | null;
      expected_salary: number | null; availability: string | null; created_at: string;
      applicant: (ApplicantLike & { id: string; name: string; email: string; avatar_url: string | null }) | null;
    }>).map((a) => ({
      ...a,
      match: matchApplicant(a.applicant || {}, opp as OpportunityLike),
    }));
    applicants.sort((a, b) => b.match.score - a.match.score);
    return { ok: true, data: { opportunity: opp as Record<string, unknown>, applicants } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Badge summary for recruiters that posts opportunities — used in public opportunity cards. */
export async function getRecruiterBadgeStats(recruiterId: string) {
  const sb = supabaseAdmin();
  const [profileRes, listingsRes] = await Promise.all([
    sb.from("recruiter_profiles").select("hires_count, rating, verified").eq("user_id", recruiterId).maybeSingle(),
    sb.from("opportunities").select("id", { count: "exact", head: true }).eq("recruiter_id", recruiterId),
  ]);
  return {
    hires_count: (profileRes.data?.hires_count as number | undefined) || 0,
    rating: (profileRes.data?.rating as number | undefined) || 0,
    verified: !!profileRes.data?.verified,
    listings_count: listingsRes.count || 0,
  };
}
