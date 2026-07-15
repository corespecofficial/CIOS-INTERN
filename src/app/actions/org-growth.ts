"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type Result<T = void> = { ok: true; data?: T } | { ok: false; error: string };
const TARGET_ORG = "c4614c66-86e8-4d28-96a5-0654477767a3";
const ADMIN_ROLES = new Set(["owner", "org_admin", "instructor"]);

async function context(orgSlug: string) {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  const sb = supabaseAdmin();
  const { data: org } = await sb.from("creative_orgs").select("id,slug,module_flags").eq("slug", orgSlug).eq("status", "active").maybeSingle();
  if (!org || org.id !== TARGET_ORG || !(org.module_flags as Record<string, unknown> | null)?.growth_operations) throw new Error("Growth operations are not enabled for this organization");
  const { data: member } = await sb.from("org_members").select("role").eq("org_id", org.id).eq("user_id", me.id).eq("status", "active").maybeSingle();
  if (!member && me.role !== "super_admin") throw new Error("Not authorized for this organization");
  const { data: programme } = await sb.from("org_programmes").select("id").eq("org_id", org.id).eq("status", "active").maybeSingle();
  if (!programme) throw new Error("No active programme");
  return { sb, me, org, programme, role: member?.role as string | undefined, isAdmin: me.role === "super_admin" || ADMIN_ROLES.has(String(member?.role)) };
}

async function audit(c: Awaited<ReturnType<typeof context>>, action: string, type: string, id: string, value: unknown) {
  await c.sb.from("org_operations_audit").insert({ org_id: c.org.id, programme_id: c.programme.id, actor_id: c.me.id, actor_role: c.role || c.me.role, action, record_type: type, record_id: id, new_value: value });
}

function optional(value: FormDataEntryValue | null) { return String(value || "").trim() || null; }
function safeUrl(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; }
}

async function ownedAssignee(c: Awaited<ReturnType<typeof context>>, value: FormDataEntryValue | null) {
  const userId = optional(value) || c.me.id;
  const { data } = await c.sb.from("org_members").select("user_id").eq("org_id", c.org.id).eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!data && c.me.role !== "super_admin") throw new Error("Assignee is not an active member of this organization");
  return userId;
}

export async function getGrowthDashboard(orgSlug: string) {
  try {
    const c = await context(orgSlug);
    const leadQuery = c.isAdmin
      ? c.sb.from("org_leads").select("*").eq("programme_id", c.programme.id).order("updated_at", { ascending: false }).limit(100)
      : c.sb.from("org_leads").select("*").eq("programme_id", c.programme.id).or(`assigned_to.eq.${c.me.id},created_by.eq.${c.me.id}`).order("updated_at", { ascending: false }).limit(100);
    const [leads, outreach, content, members] = await Promise.all([
      leadQuery,
      c.isAdmin ? c.sb.from("org_outreach_activities").select("*,org_leads(business_name,prospect_name)").eq("programme_id", c.programme.id).order("created_at", { ascending: false }).limit(100) : c.sb.from("org_outreach_activities").select("*,org_leads(business_name,prospect_name)").eq("programme_id", c.programme.id).eq("intern_id", c.me.id).order("created_at", { ascending: false }).limit(100),
      c.isAdmin ? c.sb.from("org_content_items").select("*,org_content_platform_versions(*)").eq("programme_id", c.programme.id).order("updated_at", { ascending: false }).limit(100) : c.sb.from("org_content_items").select("*,org_content_platform_versions(*)").eq("programme_id", c.programme.id).or(`assigned_to.eq.${c.me.id},created_by.eq.${c.me.id}`).order("updated_at", { ascending: false }).limit(100),
      c.sb.from("org_members").select("user_id,role,users:user_id(name,email)").eq("org_id", c.org.id).eq("status", "active"),
    ]);
    return { ok: true as const, data: { leads: leads.data || [], outreach: outreach.data || [], content: content.data || [], members: members.data || [], meId: c.me.id, isAdmin: c.isAdmin } };
  } catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Unable to load growth operations" }; }
}

export async function createLead(orgSlug: string, form: FormData): Promise<Result> {
  try {
    const c = await context(orgSlug);
    const prospectName = String(form.get("prospectName") || "").trim();
    const businessName = String(form.get("businessName") || "").trim();
    if (prospectName.length < 2 || businessName.length < 2) return { ok: false, error: "Prospect and business names are required" };
    const websiteInput = optional(form.get("website"));
    const website = websiteInput ? safeUrl(websiteInput) : null;
    if (websiteInput && !website) return { ok: false, error: "Website must be a valid HTTPS URL" };
    const value = Number(form.get("estimatedValue") || 0);
    if (!Number.isFinite(value) || value < 0) return { ok: false, error: "Estimated value is invalid" };
    const assignedTo = await ownedAssignee(c, form.get("assignedTo"));
    const row = { org_id: c.org.id, programme_id: c.programme.id, prospect_name: prospectName, business_name: businessName, industry: optional(form.get("industry")), email: optional(form.get("email"))?.toLowerCase(), telephone: optional(form.get("telephone")), website, business_problem: optional(form.get("businessProblem")), personalization_note: optional(form.get("personalizationNote")), recommended_offer: optional(form.get("recommendedOffer")), estimated_deal_value: value, assigned_to: assignedTo, created_by: c.me.id };
    const { data, error } = await c.sb.from("org_leads").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.code === "23505" ? "Duplicate lead: that email, telephone or website already exists" : error?.message || "Unable to create lead" };
    await audit(c, "lead.created", "lead", data.id, row);
    revalidatePath(`/o/${orgSlug}/growth`); revalidatePath(`/s/${orgSlug}/growth`);
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create lead" }; }
}

export async function logOutreach(orgSlug: string, form: FormData): Promise<Result> {
  try {
    const c = await context(orgSlug);
    const leadId = String(form.get("leadId") || "");
    const message = String(form.get("message") || "").trim();
    if (!leadId || message.length < 10) return { ok: false, error: "Select a lead and record the personalized message" };
    const { data: lead } = await c.sb.from("org_leads").select("id,assigned_to").eq("id", leadId).eq("programme_id", c.programme.id).maybeSingle();
    if (!lead || (!c.isAdmin && lead.assigned_to !== c.me.id)) return { ok: false, error: "Lead is not assigned to you" };
    const evidenceInput = optional(form.get("evidenceUrl"));
    const evidence = evidenceInput ? safeUrl(evidenceInput) : null;
    if (evidenceInput && !evidence) return { ok: false, error: "Evidence must be a valid HTTPS URL" };
    const followUpRaw = optional(form.get("followUpAt"));
    const row = { org_id: c.org.id, programme_id: c.programme.id, lead_id: leadId, intern_id: c.me.id, channel: String(form.get("channel") || "email"), message_type: String(form.get("messageType") || "first_contact"), personalized_message: message, response: optional(form.get("response")), outcome: optional(form.get("outcome")), evidence_url: evidence, follow_up_at: followUpRaw ? new Date(followUpRaw).toISOString() : null };
    const { data, error } = await c.sb.from("org_outreach_activities").insert(row).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Unable to log outreach" };
    await c.sb.from("org_leads").update({ stage: followUpRaw ? "follow_up_required" : "contacted", next_follow_up_at: row.follow_up_at, updated_at: new Date().toISOString() }).eq("id", leadId);
    await audit(c, "outreach.logged", "outreach_activity", data.id, row);
    revalidatePath(`/o/${orgSlug}/growth`); revalidatePath(`/s/${orgSlug}/growth`);
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to log outreach" }; }
}

export async function createContentItem(orgSlug: string, form: FormData): Promise<Result> {
  try {
    const c = await context(orgSlug);
    const topic = String(form.get("topic") || "").trim();
    if (topic.length < 3) return { ok: false, error: "A content topic is required" };
    const dueRaw = optional(form.get("dueAt"));
    const assignedTo = await ownedAssignee(c, form.get("assignedTo"));
    const item = { org_id: c.org.id, programme_id: c.programme.id, brand: optional(form.get("brand")) || "Cospronos", campaign: optional(form.get("campaign")), content_pillar: optional(form.get("pillar")), content_type: String(form.get("contentType") || "post"), topic, caption: optional(form.get("caption")), script: optional(form.get("script")), assigned_to: assignedTo, due_at: dueRaw ? new Date(dueRaw).toISOString() : null, status: "idea", created_by: c.me.id };
    const { data, error } = await c.sb.from("org_content_items").insert(item).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Unable to create content" };
    const platform = String(form.get("platform") || "linkedin");
    await c.sb.from("org_content_platform_versions").insert({ org_id: c.org.id, content_id: data.id, platform, platform_caption: item.caption });
    await audit(c, "content.created", "content_item", data.id, item);
    revalidatePath(`/o/${orgSlug}/growth`); revalidatePath(`/s/${orgSlug}/growth`);
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Unable to create content" }; }
}
