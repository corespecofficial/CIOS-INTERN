"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function requireRecruiter() {
  const me = await requireMe();
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") throw new Error("Recruiter role required");
  return me;
}

/* ─── LISTINGS ─── */

export interface OpportunityInput {
  title: string; description: string; kind: string; category?: string;
  skills?: string[]; salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryPeriod?: string;
  location?: string; remote?: boolean; requirements?: string; applyUrl?: string;
  tags?: string[]; deadline?: string; featured?: boolean;
}

export async function listOpportunities(filter?: { q?: string; kind?: string; remote?: boolean }): Promise<R<Array<Record<string, unknown>>>> {
  try {
    await requireMe();
    let q = supabaseAdmin().from("opportunities")
      .select("*, recruiter:recruiter_id(name, avatar_url), recruiter_profile:recruiter_id(company_name, company_logo_url, verified)")
      .eq("status", "open").order("featured", { ascending: false }).order("created_at", { ascending: false });
    if (filter?.kind) q = q.eq("kind", filter.kind);
    if (filter?.remote !== undefined) q = q.eq("remote", filter.remote);
    if (filter?.q) q = q.ilike("title", `%${filter.q}%`);
    const { data } = await q.limit(100);
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function createOpportunity(input: OpportunityInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireRecruiter();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const { data, error } = await supabaseAdmin().from("opportunities").insert({
      recruiter_id: me.id,
      title: input.title.trim(), description: input.description || "", kind: input.kind || "job",
      category: input.category || null, skills: input.skills || [],
      salary_min: input.salaryMin || null, salary_max: input.salaryMax || null,
      salary_currency: input.salaryCurrency || "NGN", salary_period: input.salaryPeriod || null,
      location: input.location || null, remote: input.remote || false,
      requirements: input.requirements || null, apply_url: input.applyUrl || null,
      tags: input.tags || [], deadline: input.deadline || null, featured: input.featured || false,
      status: "open",
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    await logAudit({
      actionCode: "admin.announcement_broadcast", category: "admin",
      summary: `New opportunity posted: ${input.title}`,
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "opportunity", entityId: (data as { id: string }).id,
    });
    revalidatePath("/opportunities"); revalidatePath("/recruiter");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateOpportunity(id: string, patch: Partial<OpportunityInput & { status: string }>): Promise<R> {
  try {
    const me = await requireRecruiter();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(patch)) {
      const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
      row[snake] = v;
    }
    const { error } = await supabaseAdmin().from("opportunities").update(row).eq("id", id).eq("recruiter_id", me.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/opportunities"); revalidatePath("/recruiter");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteOpportunity(id: string): Promise<R> {
  try {
    const me = await requireRecruiter();
    await supabaseAdmin().from("opportunities").delete().eq("id", id).eq("recruiter_id", me.id);
    revalidatePath("/opportunities"); revalidatePath("/recruiter");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getOpportunity(id: string): Promise<R<Record<string, unknown>>> {
  try {
    await requireMe();
    const { data } = await supabaseAdmin().from("opportunities")
      .select("*, recruiter:recruiter_id(id, name, avatar_url), recruiter_profile:recruiter_id(company_name, company_logo_url, verified, about)")
      .eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Not found" };
    await supabaseAdmin().from("opportunities").update({ views: ((data.views as number) || 0) + 1 }).eq("id", id);
    return { ok: true, data };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── APPLICATIONS ─── */

export interface ApplyInput {
  opportunityId: string;
  coverLetter?: string;
  cvDocumentId?: string;
  portfolioUrl?: string;
  availability?: string;
  expectedSalary?: number;
}

export async function applyToOpportunity(input: ApplyInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("opportunity_applications").select("id")
      .eq("opportunity_id", input.opportunityId).eq("applicant_id", me.id).maybeSingle();
    if (existing) return { ok: false, error: "You already applied to this opportunity" };
    const timeline = [{ status: "submitted", at: new Date().toISOString(), by: me.id }];
    const { data, error } = await sb.from("opportunity_applications").insert({
      opportunity_id: input.opportunityId, applicant_id: me.id,
      cover_letter: input.coverLetter || null, cv_document_id: input.cvDocumentId || null,
      portfolio_url: input.portfolioUrl || null, availability: input.availability || null,
      expected_salary: input.expectedSalary || null, status: "submitted", timeline,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    // Increment count + notify recruiter
    const { data: opp } = await sb.from("opportunities").select("recruiter_id, title, applications_count").eq("id", input.opportunityId).single();
    if (opp) {
      await sb.from("opportunities").update({ applications_count: ((opp.applications_count as number) || 0) + 1 }).eq("id", input.opportunityId);
      await pushNotification({
        userId: opp.recruiter_id, kind: "system",
        title: "📨 New applicant",
        body: `${me.name} applied to "${opp.title}"`,
        url: `/recruiter/opportunities/${input.opportunityId}`,
      }).catch(() => {});
    }
    revalidatePath("/opportunities"); revalidatePath("/recruiter");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyApplications(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin().from("opportunity_applications")
      .select("*, opportunity:opportunity_id(id, title, kind, recruiter_id, location, remote)")
      .eq("applicant_id", me.id).order("created_at", { ascending: false });
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listApplicationsForOpportunity(opportunityId: string): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireRecruiter();
    // Verify ownership
    const { data: opp } = await supabaseAdmin().from("opportunities").select("recruiter_id").eq("id", opportunityId).maybeSingle();
    if (!opp || opp.recruiter_id !== me.id) return { ok: false, error: "Not your opportunity" };
    const { data } = await supabaseAdmin().from("opportunity_applications")
      .select("*, applicant:applicant_id(id, name, email, avatar_url, bio, headline, skills)")
      .eq("opportunity_id", opportunityId).order("created_at", { ascending: false });
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateApplicationStatus(applicationId: string, status: string, note?: string): Promise<R> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    const { data: app } = await sb.from("opportunity_applications")
      .select("id, opportunity_id, applicant_id, timeline, opportunity:opportunity_id(recruiter_id, title)").eq("id", applicationId).maybeSingle();
    if (!app) return { ok: false, error: "Not found" };
    const opp = (app.opportunity as { recruiter_id: string; title: string } | null);
    if (!opp || opp.recruiter_id !== me.id) return { ok: false, error: "Not your opportunity" };
    const timeline = Array.isArray(app.timeline) ? app.timeline : [];
    timeline.push({ status, at: new Date().toISOString(), by: me.id, note: note || undefined });
    await sb.from("opportunity_applications").update({
      status, recruiter_note: note || null, timeline, updated_at: new Date().toISOString(),
    }).eq("id", applicationId);
    // Notify applicant
    await pushNotification({
      userId: app.applicant_id as string, kind: "system",
      title: "📬 Application update",
      body: `Your application for "${opp.title}" is now ${status}`,
      url: `/opportunities/applications`,
    }).catch(() => {});
    revalidatePath("/recruiter"); revalidatePath("/opportunities");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── SAVES ─── */

export async function toggleSaveOpportunity(opportunityId: string): Promise<R<{ saved: boolean }>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: existing } = await sb.from("opportunity_saves").select("user_id")
      .eq("user_id", me.id).eq("opportunity_id", opportunityId).maybeSingle();
    if (existing) {
      await sb.from("opportunity_saves").delete().eq("user_id", me.id).eq("opportunity_id", opportunityId);
      return { ok: true, data: { saved: false } };
    }
    await sb.from("opportunity_saves").insert({ user_id: me.id, opportunity_id: opportunityId });
    return { ok: true, data: { saved: true } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── RECRUITER PROFILE ─── */

export async function upsertRecruiterProfile(input: { companyName: string; companyWebsite?: string; industry?: string; companySize?: string; about?: string; companyLogoUrl?: string }): Promise<R> {
  try {
    const me = await requireMe();
    if (!input.companyName.trim()) return { ok: false, error: "Company name required" };
    await supabaseAdmin().from("recruiter_profiles").upsert({
      user_id: me.id,
      company_name: input.companyName.trim(),
      company_website: input.companyWebsite || null,
      industry: input.industry || null,
      company_size: input.companySize || null,
      about: input.about || null,
      company_logo_url: input.companyLogoUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    revalidatePath("/recruiter");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getRecruiterDashboard(): Promise<R<{ profile: Record<string, unknown> | null; listings: Array<Record<string, unknown>>; stats: { open: number; applications: number; shortlisted: number; hires: number } }>> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    const [profileRes, listingsRes] = await Promise.all([
      sb.from("recruiter_profiles").select("*").eq("user_id", me.id).maybeSingle(),
      sb.from("opportunities").select("*").eq("recruiter_id", me.id).order("created_at", { ascending: false }),
    ]);
    const ids = ((listingsRes.data || []) as Array<{ id: string }>).map((l) => l.id);
    let applications = 0, shortlisted = 0, hires = 0;
    if (ids.length > 0) {
      const { data: apps } = await sb.from("opportunity_applications").select("status").in("opportunity_id", ids);
      for (const a of (apps || []) as Array<{ status: string }>) {
        applications++;
        if (a.status === "shortlisted" || a.status === "interview") shortlisted++;
        if (a.status === "hired") hires++;
      }
    }
    return {
      ok: true,
      data: {
        profile: profileRes.data as Record<string, unknown> | null,
        listings: (listingsRes.data || []) as Array<Record<string, unknown>>,
        stats: { open: (listingsRes.data || []).filter((l) => (l as { status: string }).status === "open").length, applications, shortlisted, hires },
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
