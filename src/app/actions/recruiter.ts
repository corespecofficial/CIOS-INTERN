"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireRecruiter() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") throw new Error("Recruiter role required");
  return me;
}

/* ─── KPIs + dashboard ─── */

export interface RecruiterKPIs {
  activeListings: number;
  totalListings: number;
  totalApplicants: number;
  shortlisted: number;
  interviewsScheduled: number;
  hires: number;
  rejected: number;
  unreadMessages: number;
  responseRatePct: number;
  avgTimeToHireDays: number | null;
  applicationsByDay: { day: string; count: number }[];
  funnel: { stage: string; count: number }[];
  topListings: { id: string; title: string; applications: number; views: number }[];
  skillTrends: { skill: string; count: number }[];
  activity: { kind: string; at: string; summary: string; href?: string }[];
}

export async function getRecruiterKPIs(): Promise<R<RecruiterKPIs>> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    const since = new Date(Date.now() - 30 * 86400000).toISOString();

    const { data: listings } = await sb.from("opportunities")
      .select("id, title, status, views, applications_count, skills, created_at")
      .eq("recruiter_id", me.id);
    const ls = (listings || []) as Array<{ id: string; title: string; status: string; views: number; applications_count: number; skills: string[]; created_at: string }>;
    const listingIds = ls.map((l) => l.id);

    const [appsRes, interviewsRes] = await Promise.all([
      listingIds.length > 0
        ? sb.from("opportunity_applications").select("id, status, created_at, updated_at").in("opportunity_id", listingIds)
        : Promise.resolve({ data: [] as { id: string; status: string; created_at: string; updated_at: string }[] }),
      listingIds.length > 0
        ? sb.from("interviews").select("id, status, scheduled_at, application:application_id(opportunity:opportunity_id(recruiter_id))")
            .gte("scheduled_at", new Date().toISOString())
        : Promise.resolve({ data: [] as Array<{ id: string; status: string; scheduled_at: string; application: { opportunity: { recruiter_id: string } | null } | null }> }),
    ]);

    const apps = (appsRes.data || []) as Array<{ id: string; status: string; created_at: string; updated_at: string }>;
    const activeListings = ls.filter((l) => l.status === "open").length;

    // Count statuses
    const byStatus: Record<string, number> = {};
    for (const a of apps) byStatus[a.status] = (byStatus[a.status] || 0) + 1;

    // Applications/day (last 30)
    const buckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets.set(d, 0);
    }
    for (const a of apps) {
      if (a.created_at < since) continue;
      const k = a.created_at.slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) || 0) + 1);
    }

    // Top listings
    const topListings = [...ls].sort((a, b) => (b.applications_count || 0) - (a.applications_count || 0)).slice(0, 5).map((l) => ({
      id: l.id, title: l.title, applications: l.applications_count || 0, views: l.views || 0,
    }));

    // Skill trends (concat all skills across listings)
    const skillCount = new Map<string, number>();
    for (const l of ls) for (const s of (l.skills || [])) skillCount.set(s, (skillCount.get(s) || 0) + 1);
    const skillTrends = Array.from(skillCount.entries()).map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count).slice(0, 8);

    // Time to hire
    const hiredApps = apps.filter((a) => a.status === "hired");
    let avgTimeToHireDays: number | null = null;
    if (hiredApps.length > 0) {
      const total = hiredApps.reduce((s, a) => s + (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()), 0);
      avgTimeToHireDays = Math.round(total / hiredApps.length / 86400000);
    }

    // Response rate — apps that moved past "submitted"
    const responded = apps.filter((a) => a.status !== "submitted").length;
    const responseRatePct = apps.length > 0 ? Math.round((responded / apps.length) * 100) : 0;

    // Funnel
    const funnel = [
      { stage: "Submitted", count: apps.length },
      { stage: "Viewed", count: apps.length - (byStatus.submitted || 0) },
      { stage: "Shortlisted", count: (byStatus.shortlisted || 0) + (byStatus.interview || 0) + (byStatus.hired || 0) },
      { stage: "Interview", count: (byStatus.interview || 0) + (byStatus.hired || 0) },
      { stage: "Hired", count: byStatus.hired || 0 },
    ];

    // Recent activity: last 10 apps + upcoming interviews
    const activity: Array<{ kind: string; at: string; summary: string; href?: string }> = [];
    for (const a of apps.slice(-10).reverse()) {
      activity.push({ kind: "application", at: a.created_at, summary: `New applicant · ${a.status}` });
    }
    for (const iv of (interviewsRes.data || []) as Array<{ id: string; status: string; scheduled_at: string }>) {
      activity.push({ kind: "interview", at: iv.scheduled_at, summary: `Interview ${iv.status} at ${new Date(iv.scheduled_at).toLocaleString()}` });
    }
    activity.sort((a, b) => b.at.localeCompare(a.at));

    return {
      ok: true,
      data: {
        activeListings, totalListings: ls.length,
        totalApplicants: apps.length,
        shortlisted: (byStatus.shortlisted || 0) + (byStatus.interview || 0),
        interviewsScheduled: ((interviewsRes.data || []) as Array<{ status: string }>).filter((i) => i.status === "scheduled").length,
        hires: byStatus.hired || 0,
        rejected: byStatus.rejected || 0,
        unreadMessages: 0, // placeholder until /recruiter/messages integrates
        responseRatePct, avgTimeToHireDays,
        applicationsByDay: Array.from(buckets.entries()).map(([day, count]) => ({ day, count })),
        funnel,
        topListings,
        skillTrends,
        activity: activity.slice(0, 12),
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── Interviews ─── */

export interface InterviewInput {
  applicationId: string;
  scheduledAt: string;
  durationMinutes?: number;
  mode?: "video" | "phone" | "onsite";
  meetingLink?: string;
  location?: string;
  note?: string;
}

export async function scheduleInterview(input: InterviewInput): Promise<R<{ id: string }>> {
  try {
    const me = await requireRecruiter();
    const sb = supabaseAdmin();
    // Verify the application belongs to a listing owned by this recruiter
    const { data: app } = await sb.from("opportunity_applications")
      .select("id, applicant_id, opportunity:opportunity_id(recruiter_id, title)").eq("id", input.applicationId).maybeSingle();
    if (!app) return { ok: false, error: "Application not found" };
    const opp = app.opportunity as { recruiter_id: string; title: string } | null;
    if (!opp || opp.recruiter_id !== me.id) return { ok: false, error: "Not your application" };
    const { data, error } = await sb.from("interviews").insert({
      application_id: input.applicationId,
      scheduled_at: input.scheduledAt,
      duration_minutes: input.durationMinutes || 30,
      mode: input.mode || "video",
      meeting_link: input.meetingLink || null,
      location: input.location || null,
      note: input.note || null,
      status: "scheduled",
    }).select("id").single();
    if (error) return { ok: false, error: error.message };
    // Mark application as interview stage
    await sb.from("opportunity_applications").update({ status: "interview", updated_at: new Date().toISOString() }).eq("id", input.applicationId);
    // Notify applicant
    await pushNotification({
      userId: app.applicant_id as string, kind: "system",
      title: "🎯 Interview scheduled",
      body: `${opp.title} — ${new Date(input.scheduledAt).toLocaleString()}`,
      url: "/opportunities",
    }).catch(() => {});
    revalidatePath("/recruiter/interviews");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateInterview(id: string, patch: { scheduledAt?: string; status?: string; meetingLink?: string; note?: string; feedback?: string }): Promise<R> {
  try {
    const me = await requireRecruiter();
    const row: Record<string, unknown> = {};
    if (patch.scheduledAt) row.scheduled_at = patch.scheduledAt;
    if (patch.status) row.status = patch.status;
    if (patch.meetingLink !== undefined) row.meeting_link = patch.meetingLink;
    if (patch.note !== undefined) row.note = patch.note;
    // Verify ownership
    const sb = supabaseAdmin();
    const { data: iv } = await sb.from("interviews")
      .select("application:application_id(opportunity:opportunity_id(recruiter_id))")
      .eq("id", id).maybeSingle();
    const recId = ((iv?.application as { opportunity?: { recruiter_id?: string } } | null)?.opportunity?.recruiter_id);
    if (recId !== me.id && me.role !== "super_admin") return { ok: false, error: "Not your interview" };
    await sb.from("interviews").update(row).eq("id", id);
    revalidatePath("/recruiter/interviews");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listRecruiterInterviews(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireRecruiter();
    const { data } = await supabaseAdmin().from("interviews")
      .select("*, application:application_id(id, status, applicant:applicant_id(id, name, email, avatar_url), opportunity:opportunity_id(id, title, recruiter_id))")
      .order("scheduled_at", { ascending: true });
    // Filter by recruiter ownership
    const mine = (data || []).filter((iv: Record<string, unknown>) => {
      const recId = ((iv.application as { opportunity?: { recruiter_id?: string } } | null)?.opportunity?.recruiter_id);
      return recId === me.id;
    });
    return { ok: true, data: mine };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
