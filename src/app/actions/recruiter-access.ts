"use server";

import { headers } from "next/headers";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { sendEmail, wrapEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claims = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claims.role === "super_admin") return userId;
  const client = await clerkClient();
  const u = await client.users.getUser(userId);
  if (u.publicMetadata?.role !== "super_admin") throw new Error("Super admin only");
  return userId;
}

/* ─── Public: submit recruiter access request ─── */

export interface RecruiterRequestInput {
  fullName: string;
  companyName: string;
  workEmail: string;
  phone?: string;
  country?: string;
  website?: string;
  hiringFor?: string;
  expectedHires?: string;
  budgetRange?: string;
  whyJoin?: string;
  contactMethod?: "email" | "phone";
}

// In-memory rate limiter (IP → last-submit ms)
const rateMap = new Map<string, number>();

export async function submitRecruiterRequest(input: RecruiterRequestInput): Promise<R<{ id: string }>> {
  try {
    if (!input.fullName?.trim() || !input.companyName?.trim() || !input.workEmail?.trim()) {
      return { ok: false, error: "Name, company, and email are required" };
    }
    if (!input.workEmail.includes("@")) return { ok: false, error: "Invalid email" };
    // Block free email domains for business legitimacy (soft hint only)
    const banned = ["mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com"];
    if (banned.some((d) => input.workEmail.toLowerCase().endsWith(`@${d}`))) {
      return { ok: false, error: "Please use your company email address" };
    }

    const h = await headers();
    const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "unknown").trim();
    const ua = h.get("user-agent") || null;

    // Rate-limit: 1 request per IP per 10 minutes
    const now = Date.now();
    const last = rateMap.get(ip) || 0;
    if (now - last < 10 * 60 * 1000) return { ok: false, error: "Please wait a few minutes before trying again." };
    rateMap.set(ip, now);

    const sb = supabaseAdmin();
    // Dedup: same email with pending request in last 7 days
    const since = new Date(now - 7 * 86400000).toISOString();
    const { data: dup } = await sb.from("recruiter_requests").select("id")
      .eq("work_email", input.workEmail.toLowerCase())
      .in("status", ["new", "reviewing"])
      .gte("created_at", since).maybeSingle();
    if (dup) return { ok: false, error: "We already have a recent request from this email. We'll be in touch soon." };

    const { data, error } = await sb.from("recruiter_requests").insert({
      full_name: input.fullName.trim(),
      company_name: input.companyName.trim(),
      work_email: input.workEmail.toLowerCase().trim(),
      phone: input.phone || null, country: input.country || null,
      website: input.website || null, hiring_for: input.hiringFor || null,
      expected_hires: input.expectedHires || null, budget_range: input.budgetRange || null,
      why_join: input.whyJoin || null, contact_method: input.contactMethod || "email",
      ip_address: ip, user_agent: ua,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };

    // Notify Super Admins via in-app notification + email
    const { data: supers } = await sb.from("users").select("id, email, name").eq("role", "super_admin").limit(10);
    for (const s of (supers || []) as Array<{ id: string; email: string; name: string }>) {
      await pushNotification({
        userId: s.id, kind: "system",
        title: "🏢 New recruiter request",
        body: `${input.companyName} — ${input.fullName}`,
        url: "/super-admin/recruiter-requests",
      }).catch(() => {});
      await sendEmail({
        to: s.email,
        subject: `[CIOS] New recruiter access request — ${input.companyName}`,
        html: wrapEmail(`
          <h2 style="color:#E8EDF5">New recruiter access request</h2>
          <p><strong>Company:</strong> ${escapeHtml(input.companyName)}</p>
          <p><strong>Contact:</strong> ${escapeHtml(input.fullName)} — <a href="mailto:${escapeHtml(input.workEmail)}" style="color:#1E88E5">${escapeHtml(input.workEmail)}</a></p>
          ${input.website ? `<p><strong>Website:</strong> <a href="${escapeHtml(input.website)}" style="color:#1E88E5">${escapeHtml(input.website)}</a></p>` : ""}
          ${input.hiringFor ? `<p><strong>Hiring for:</strong> ${escapeHtml(input.hiringFor)}</p>` : ""}
          ${input.expectedHires ? `<p><strong>Expected hires:</strong> ${escapeHtml(input.expectedHires)}</p>` : ""}
          ${input.whyJoin ? `<p><strong>Why:</strong> ${escapeHtml(input.whyJoin)}</p>` : ""}
          <p style="margin-top:18px"><a href="${appUrl()}/super-admin/recruiter-requests" style="display:inline-block;padding:10px 20px;background:#1E88E5;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">Review in CIOS →</a></p>
        `),
      }).catch(() => {});
    }

    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

function appUrl() { return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; }
function escapeHtml(s: string) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c)); }

/* ─── Super admin management ─── */

export async function listRecruiterRequests(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    await requireSuperAdmin();
    const { data } = await supabaseAdmin().from("recruiter_requests").select("*").order("created_at", { ascending: false }).limit(200);
    return { ok: true, data: data || [] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateRequestStatus(id: string, status: "new" | "reviewing" | "approved" | "rejected", adminNotes?: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    await supabaseAdmin().from("recruiter_requests").update({
      status, admin_notes: adminNotes || null,
      reviewed_at: new Date().toISOString(), reviewed_by: me?.id || null,
    }).eq("id", id);
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Recruiter request → ${status}`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "recruiter_request", entityId: id,
    });
    revalidatePath("/super-admin/recruiter-requests");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── Invite a recruiter (Clerk invitation + flag recruiter role) ─── */

export interface RecruiterInviteInput {
  email: string;
  recruiterType: string;
  companyName?: string;
  note?: string;
  fromRequestId?: string;
}

export async function inviteRecruiter(input: RecruiterInviteInput): Promise<R<{ invitationId: string }>> {
  try {
    await requireSuperAdmin();
    if (!input.email.includes("@")) return { ok: false, error: "Invalid email" };
    const client = await clerkClient();
    const baseUrl = appUrl();

    const clerkInv = await client.invitations.createInvitation({
      emailAddress: input.email.toLowerCase().trim(),
      publicMetadata: { role: "recruiter", recruiter_type: input.recruiterType, pending_onboarding: true },
      ignoreExisting: true, notify: true,
      redirectUrl: `${baseUrl}/sign-up`,
    });

    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data } = await sb.from("recruiter_invitations").insert({
      email: input.email.toLowerCase().trim(),
      recruiter_type: input.recruiterType,
      company_name: input.companyName || null,
      note: input.note || null,
      clerk_invitation_id: clerkInv.id,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      invited_by: me?.id || null,
    }).select("id").single();

    if (input.fromRequestId) {
      await sb.from("recruiter_requests").update({
        status: "invited", invitation_id: (data as { id: string } | null)?.id || null,
        reviewed_at: new Date().toISOString(), reviewed_by: me?.id || null,
      }).eq("id", input.fromRequestId);
    }

    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Invited recruiter ${input.email}`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "recruiter_invitation", entityId: clerkInv.id,
      metadata: { recruiterType: input.recruiterType, companyName: input.companyName },
    });

    revalidatePath("/super-admin/recruiter-requests");
    return { ok: true, data: { invitationId: clerkInv.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function revokeRecruiterInvitation(invitationId: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const client = await clerkClient();
    try { await client.invitations.revokeInvitation(invitationId); } catch {/* may already be accepted */}
    await supabaseAdmin().from("recruiter_invitations").update({ status: "revoked" }).eq("clerk_invitation_id", invitationId);
    revalidatePath("/super-admin/recruiter-requests");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── Recruiter approval (after they've filled onboarding) ─── */

export async function approveRecruiterProfile(userId: string, notes?: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    await supabaseAdmin().from("recruiter_profiles").update({
      approval_status: "approved", verified: true,
      approved_at: new Date().toISOString(), approved_by: me?.id || null,
      admin_notes: notes || null,
    }).eq("user_id", userId);
    await pushNotification({
      userId, kind: "system",
      title: "✅ Recruiter access approved",
      body: "You can now post opportunities and message candidates.",
      url: "/recruiter",
    }).catch(() => {});
    await logAudit({
      actionCode: "admin.role_changed", category: "admin",
      summary: "Approved recruiter profile",
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "recruiter_profile", entityId: userId,
      severity: "notice",
    });
    revalidatePath("/super-admin/recruiter-requests");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function rejectRecruiterProfile(userId: string, notes: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    await supabaseAdmin().from("recruiter_profiles").update({
      approval_status: "rejected", admin_notes: notes || null,
    }).eq("user_id", userId);
    await pushNotification({
      userId, kind: "system", title: "⚠️ Recruiter access denied",
      body: notes || "Your recruiter application was not approved.",
      url: "/recruiter/profile",
    }).catch(() => {});
    revalidatePath("/super-admin/recruiter-requests");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function suspendRecruiter(userId: string): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    await supabaseAdmin().from("recruiter_profiles").update({ approval_status: "suspended", verified: false }).eq("user_id", userId);
    await logAudit({
      actionCode: "admin.user_suspended", category: "admin",
      summary: "Suspended recruiter",
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "recruiter_profile", entityId: userId,
      severity: "warning",
    });
    revalidatePath("/super-admin/recruiter-requests");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ─── Full recruiter onboarding submission ─── */

export interface RecruiterOnboardingInput {
  companyName: string; registeredBusinessName?: string; brandName?: string;
  industry?: string; website?: string; officialEmail?: string; phone?: string;
  country?: string; officeAddress?: string; companySize?: string; yearFounded?: number;
  recruiterType: string; roleTitle: string; linkedinUrl?: string;
  whyHiring: string; expectedHiringVolume: string; paymentModel?: string; referralSource?: string;
  about?: string;
  companyLogoUrl?: string; bannerUrl?: string; idDocumentUrl?: string; registrationDocUrl?: string;
}

export async function submitRecruiterOnboarding(input: RecruiterOnboardingInput): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (!input.companyName?.trim() || !input.roleTitle?.trim() || !input.whyHiring?.trim()) {
      return { ok: false, error: "Company name, your role, and why-hiring are required" };
    }
    await supabaseAdmin().from("recruiter_profiles").upsert({
      user_id: me.id,
      company_name: input.companyName.trim(),
      registered_business_name: input.registeredBusinessName || null,
      brand_name: input.brandName || null,
      industry: input.industry || null,
      company_website: input.website || null,
      official_email: input.officialEmail || null,
      phone: input.phone || null,
      country: input.country || null,
      office_address: input.officeAddress || null,
      company_size: input.companySize || null,
      year_founded: input.yearFounded || null,
      recruiter_type: input.recruiterType || "company_hr",
      role_title: input.roleTitle.trim(),
      linkedin_url: input.linkedinUrl || null,
      why_hiring: input.whyHiring.trim(),
      expected_hiring_volume: input.expectedHiringVolume || null,
      payment_model: input.paymentModel || null,
      referral_source: input.referralSource || null,
      about: input.about || null,
      company_logo_url: input.companyLogoUrl || null,
      banner_url: input.bannerUrl || null,
      id_document_url: input.idDocumentUrl || null,
      registration_doc_url: input.registrationDocUrl || null,
      approval_status: "pending",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    // Ping super admins
    const { data: supers } = await supabaseAdmin().from("users").select("id").eq("role", "super_admin").limit(5);
    for (const s of (supers || []) as Array<{ id: string }>) {
      await pushNotification({
        userId: s.id, kind: "system",
        title: "🏢 Recruiter onboarding submitted",
        body: `${input.companyName} — awaiting review`,
        url: "/super-admin/recruiter-requests",
      }).catch(() => {});
    }

    await logAudit({
      actionCode: "account.profile_updated", category: "account",
      summary: "Submitted recruiter onboarding",
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "recruiter_profile", entityId: me.id,
    });
    revalidatePath("/recruiter/profile"); revalidatePath("/recruiter");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
