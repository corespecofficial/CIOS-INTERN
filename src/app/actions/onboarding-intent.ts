"use server";

/**
 * Onboarding intent router. /onboarding/intent calls one of these to
 * resolve a user's first-portal landing. Each returns the path to
 * redirect to; the page calls `router.push(path)` after.
 *
 * Once any of these completes successfully, the user's
 * `onboarding_completed_at` is set so they never re-enter the gate.
 */

import { supabaseAdmin, getCurrentDbUser, type Role } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { logOrgAudit } from "@/lib/org-audit";
import { cacheDel } from "@/lib/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

interface ResolveResult { redirectTo: string }

/* ───────────── Helpers ───────────── */

async function markOnboarded(userId: string, intent: string, clerkId?: string | null) {
  await supabaseAdmin()
    .from("users")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      intent,
    })
    .eq("id", userId);

  // Bust the middleware-side onboarding cache so the very next request
  // sees the user as onboarded — otherwise the negative-cache TTL (30s)
  // would loop them straight back to /onboarding/intent.
  if (clerkId) await cacheDel(`onboarded:${clerkId}`);
}

async function setClerkRole(clerkId: string | null, newRole: Role) {
  if (!clerkId) return;
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkId, { publicMetadata: { role: newRole } });
  } catch (e) {
    console.warn("[onboarding] clerk role update failed:", e);
  }
}

/* ───────────── Path 1: continue as visitor ───────────── */

export async function chooseVisitor(): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  // Visitors stay on the public_user role. If the webhook gave them
  // something else (e.g. legacy 'intern' default), bring them down —
  // they explicitly chose "visitor", they're not an intern yet.
  if (me.role !== "public_user") {
    await supabaseAdmin().from("users").update({ role: "public_user" }).eq("id", me.id);
    await setClerkRole(me.clerk_id, "public_user");
  }
  await markOnboarded(me.id, "visitor", me.clerk_id);
  // First-run: route through /onboarding/visitor-welcome (multi-step
  // carousel) for a real greeting + interest tagging. The page short-
  // circuits to /visitor if completed (localStorage key
  // `cios-visitor-welcome`), so re-runs don't replay it.
  return { ok: true, data: { redirectTo: "/onboarding/visitor-welcome" } };
}

/* ───────────── Path 2: intern joining a class via enrollment code ─────
 *
 * "Continue as intern" → DOES NOT auto-promote to intern role and DOES
 * NOT mark them onboarded. We route to /onboarding/enrollment which
 * asks for the enrollment code their class admin gave them. Only after
 * they redeem a valid code does the org membership + onboarded flag get
 * set (handled by redeemEnrollmentCode).
 *
 * Why: a fresh signup picking "intern" without a code used to be auto-
 * promoted into the (app) intern shell with no class attached. That's
 * a security/UX problem — they'd see internal CIOS chrome they shouldn't
 * see and weren't actually enrolled in anything. Now the gate is
 * explicit: get a code first OR fall back to visitor mode. */

export async function chooseIntern(): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };
  // Don't change role yet — they haven't actually joined anything.
  // Don't mark onboarded yet — they'll come back through the gate if
  // they bail without a code. The enrollment page reads the same auth
  // session, so no state needs to be stashed.
  return { ok: true, data: { redirectTo: "/onboarding/enrollment" } };
}

/* ───────────── Path 3: redeem an org invite token ───────────── */

export async function redeemOrgInvite(token: string): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  const sb = supabaseAdmin();
  const { data: inviteRow } = await sb
    .from("org_invites")
    .select("id, org_id, role, email, expires_at, accepted_at, creative_orgs!inner(slug, status)")
    .eq("token", token)
    .maybeSingle();
  type Row = { id: string; org_id: string; role: "org_admin" | "instructor" | "student"; email: string; expires_at: string; accepted_at: string | null; creative_orgs: { slug: string; status: string } };
  const invite = inviteRow as unknown as Row | null;
  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.accepted_at) return { ok: false, error: "Invite already used" };
  if (new Date(invite.expires_at) < new Date()) return { ok: false, error: "Invite expired" };
  if (invite.creative_orgs.status !== "active") return { ok: false, error: "Org is not active" };
  if (invite.email.toLowerCase() !== me.email.toLowerCase()) {
    return { ok: false, error: "This invite was sent to a different email address" };
  }

  // Idempotent membership upsert.
  await sb.from("org_members").upsert(
    { org_id: invite.org_id, user_id: me.id, role: invite.role, status: "active" },
    { onConflict: "org_id,user_id", ignoreDuplicates: false },
  );
  await sb.from("org_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  // Recompute member_count from org_members (drift-proof, race-free).
  // See p393_recount_helper. Replaces the old read-modify-write that
  // double-counted any soft-removed user re-joining via this code.
  await sb.rpc("recount_org_members", { p_org_id: invite.org_id });
  await logOrgAudit({
    orgId: invite.org_id, actorId: me.id, action: "member.joined",
    target: `user:${me.id}`,
    meta: { via: "org_invite", role: invite.role },
  });

  // Promote Clerk role only if currently low-privilege.
  if (me.role === "intern" || me.role === "public_user") {
    const newRole: Role = invite.role === "student" ? me.role : "creative_host";
    if (newRole !== me.role) {
      await sb.from("users").update({ role: newRole }).eq("id", me.id);
      await setClerkRole(me.clerk_id, newRole);
    }
  }

  await markOnboarded(me.id, invite.role === "student" ? "visitor" : "mentor", me.clerk_id);
  // Students go to /s/<slug>; staff (instructor/org_admin) go to /o/<slug>.
  const target = invite.role === "student" ? `/s/${invite.creative_orgs.slug}` : `/o/${invite.creative_orgs.slug}`;
  return { ok: true, data: { redirectTo: target } };
}

/* ───────────── Path 3b: redeem a public enrollment code ─────────────
 *
 * Same shape as redeemOrgInvite but the code can be a "public broadcast"
 * code — created by an admin from their host portal and shared publicly
 * (Twitter post, link in bio, QR on a poster). We treat any org_invites
 * row with email='*' as a public code: anyone with the token can join.
 * If the row has a real email it falls through to the strict per-email
 * invite path. */

export async function redeemEnrollmentCode(code: string): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, error: "Enter a code" };

  const sb = supabaseAdmin();
  const { data: inviteRow } = await sb
    .from("org_invites")
    .select("id, org_id, role, email, expires_at, accepted_at, creative_orgs!inner(slug, status, name)")
    .eq("token", trimmed)
    .maybeSingle();
  type Row = { id: string; org_id: string; role: "org_admin" | "instructor" | "student"; email: string; expires_at: string; accepted_at: string | null; creative_orgs: { slug: string; status: string; name: string } };
  const invite = inviteRow as unknown as Row | null;
  if (!invite) return { ok: false, error: "Code not recognised. Check with the person who shared it." };
  if (new Date(invite.expires_at) < new Date()) return { ok: false, error: "This code has expired." };
  if (invite.creative_orgs.status !== "active") return { ok: false, error: "That org isn't accepting joins right now." };

  const isPublic = invite.email === "*";
  // Per-email codes: enforce email match. Public codes (email='*'): skip
  // the email check — anyone with the token can use it. Public codes
  // are also non-consuming (don't set accepted_at) so multiple students
  // can use the same broadcast code.
  if (!isPublic) {
    if (invite.accepted_at) return { ok: false, error: "This code has already been used." };
    if (invite.email.toLowerCase() !== me.email.toLowerCase()) {
      return { ok: false, error: "This invite was sent to a different email." };
    }
  }

  // Idempotent membership upsert.
  await sb.from("org_members").upsert(
    { org_id: invite.org_id, user_id: me.id, role: invite.role, status: "active" },
    { onConflict: "org_id,user_id", ignoreDuplicates: false },
  );
  if (!isPublic) {
    await sb.from("org_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
  }

  // Recompute member_count from org_members (drift-proof). See p393.
  await sb.rpc("recount_org_members", { p_org_id: invite.org_id });
  await logOrgAudit({
    orgId: invite.org_id, actorId: me.id, action: "member.joined",
    target: `user:${me.id}`,
    meta: { via: isPublic ? "public_code" : "email_invite", role: invite.role, code: trimmed },
  });

  // Promote Clerk role only for low-privilege users joining as staff.
  // Students keep their existing role (they're a student in someone's
  // class, not promoted to creative_host). Anyone joining as instructor
  // or org_admin from public_user/intern → creative_host.
  if ((me.role === "intern" || me.role === "public_user") && invite.role !== "student") {
    await sb.from("users").update({ role: "creative_host" }).eq("id", me.id);
    await setClerkRole(me.clerk_id, "creative_host");
  }

  await markOnboarded(me.id, invite.role === "student" ? "visitor" : "mentor", me.clerk_id);
  const target = invite.role === "student" ? `/s/${invite.creative_orgs.slug}` : `/o/${invite.creative_orgs.slug}`;
  return { ok: true, data: { redirectTo: target } };
}

/* ───────────── Path 4: redeem a generic referral code ───────────── */

export async function redeemReferralCode(code: string): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  const sb = supabaseAdmin();
  const { data: refRow } = await sb
    .from("users")
    .select("id, name")
    .eq("referral_code", code.trim())
    .maybeSingle();
  const referrer = refRow as { id: string; name: string } | null;
  if (!referrer) return { ok: false, error: "Referral code not recognised" };
  if (referrer.id === me.id) return { ok: false, error: "Can't refer yourself" };

  // Find referrer's primary org membership (if any). They might be in
  // multiple orgs — we pick the most recent active 'owner'/'org_admin'
  // membership. A bare 'student' membership doesn't count (referrer
  // isn't running an org there).
  const { data: m } = await sb
    .from("org_members")
    .select("org_id, role, creative_orgs!inner(slug, status)")
    .eq("user_id", referrer.id)
    .eq("status", "active")
    .in("role", ["owner", "org_admin", "instructor"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  type M = { org_id: string; role: string; creative_orgs: { slug: string; status: string } };
  const primary = m as unknown as M | null;

  // Always credit the referrer regardless of whether they have an org.
  // (Future: bonus XP / wallet credit on referrer.referral_count++.)
  await sb.from("visitor_engagement").insert({
    visitor_id: me.id,
    org_id: primary?.org_id ?? null,
    kind: "view",
    meta: { source: "referral", referrer_id: referrer.id, code },
  });

  if (primary && primary.creative_orgs.status === "active") {
    // Auto-enrol as student in the referrer's org.
    await sb.from("org_members").upsert(
      { org_id: primary.org_id, user_id: me.id, role: "student", status: "active" },
      { onConflict: "org_id,user_id", ignoreDuplicates: true },
    );
    // Recompute (drift-proof) — see p393. Also handles ignoreDuplicates
    // case where the upsert was a no-op for an existing active member.
    await sb.rpc("recount_org_members", { p_org_id: primary.org_id });

    if (me.role !== "intern" && me.role !== "public_user" && me.role !== "creative_host") {
      // leave their role alone if they already have something privileged
    } else if (me.role !== "public_user") {
      await sb.from("users").update({ role: "public_user" }).eq("id", me.id);
      await setClerkRole(me.clerk_id, "public_user");
    }
    await markOnboarded(me.id, "visitor", me.clerk_id);
    return { ok: true, data: { redirectTo: `/s/${primary.creative_orgs.slug}` } };
  }

  // Referrer has no org — drop into visitor portal but credit applied.
  if (me.role !== "public_user") {
    await sb.from("users").update({ role: "public_user" }).eq("id", me.id);
    await setClerkRole(me.clerk_id, "public_user");
  }
  await markOnboarded(me.id, "visitor", me.clerk_id);
  return { ok: true, data: { redirectTo: "/visitor?welcome=1" } };
}

/* ───────────── Path 5: super-admin code ───────────── */

export async function redeemSuperAdminCode(code: string): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("super_admin_codes")
    .select("id, role, org_id, expires_at, max_uses, use_count")
    .eq("code", code.trim())
    .maybeSingle();
  type Row = { id: string; role: Role; org_id: string | null; expires_at: string; max_uses: number; use_count: number };
  const row = data as Row | null;
  if (!row) return { ok: false, error: "Code not recognised" };
  if (new Date(row.expires_at) < new Date()) return { ok: false, error: "Code expired" };
  if (row.use_count >= row.max_uses) return { ok: false, error: "Code already used" };

  await sb.from("users").update({ role: row.role }).eq("id", me.id);
  await setClerkRole(me.clerk_id, row.role);
  await sb.from("super_admin_codes")
    .update({ use_count: row.use_count + 1, redeemed_by: me.id, redeemed_at: new Date().toISOString() })
    .eq("id", row.id);

  // Optional: auto-membership in a creative_org if the code was bound.
  if (row.org_id) {
    const orgRole = row.role === "creative_host" ? "owner"
                  : row.role === "instructor"   ? "instructor"
                  : "student";
    await sb.from("org_members").upsert(
      { org_id: row.org_id, user_id: me.id, role: orgRole, status: "active" },
      { onConflict: "org_id,user_id", ignoreDuplicates: true },
    );
  }

  await markOnboarded(me.id, "staff_code", me.clerk_id);

  // Pick a sensible redirect from the role.
  const home: Record<string, string> = {
    intern: "/dashboard", team_lead: "/team-lead", admin: "/admin",
    super_admin: "/super-admin", instructor: "/instructor",
    moderator: "/moderator", finance: "/finance", support: "/support",
    recruiter: "/recruiter", mentor: "/mentor", alumni: "/alumni",
    public_user: "/visitor", investor: "/investor/dashboard",
    startup_founder: "/startup", partner_org: "/partner-portal",
    creative_host: "/o",
  };
  return { ok: true, data: { redirectTo: home[row.role] || "/dashboard" } };
}

/* ───────────── Path 6: apply for a role (recruiter/mentor/company/etc.) ───────────── */

export interface ApplyRoleInput {
  role: "recruiter" | "mentor" | "company" | "partner_org" | "startup_founder" | "investor" | "institution" | "government";
  payload: Record<string, unknown>;  // free-form form answers
}

export async function applyForRole(input: ApplyRoleInput): Promise<R<ResolveResult>> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  const sb = supabaseAdmin();
  const { error } = await sb.from("role_applications").insert({
    user_id: me.id,
    applied_role: input.role,
    payload: input.payload,
    status: "pending",
  });
  if (error) {
    if (/duplicate key/i.test(error.message)) {
      return { ok: false, error: "You already have a pending application for this role" };
    }
    return { ok: false, error: error.message };
  }

  // Drop them into the visitor portal with role=public_user. They wait
  // there for super-admin approval; status visible at /visitor/applications.
  if (me.role !== "public_user") {
    await sb.from("users").update({ role: "public_user" }).eq("id", me.id);
    await setClerkRole(me.clerk_id, "public_user");
  }
  await markOnboarded(me.id, input.role === "company" ? "company" : input.role, me.clerk_id);

  // Notify super-admins (in-app — email is up to the email provider settings).
  const { data: admins } = await sb.from("users").select("id").eq("role", "super_admin");
  for (const a of (admins || []) as { id: string }[]) {
    await sb.from("notifications").insert({
      user_id: a.id,
      title: "🆕 New role application",
      message: `${me.name || me.email} applied as ${input.role}`,
      type: "info",
      action_url: "/super-admin/applications",
      is_read: false,
    });
  }

  revalidatePath("/super-admin/applications");
  return { ok: true, data: { redirectTo: "/visitor/applications" } };
}

/* ───────────── Decision endpoint (used by review queue) ───────────── */

export async function decideRoleApplication(applicationId: string, approve: boolean, notes?: string): Promise<R> {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") return { ok: false, error: "Super admin only" };

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("role_applications")
    .select("id, user_id, applied_role, status")
    .eq("id", applicationId)
    .maybeSingle();
  type App = { id: string; user_id: string; applied_role: Role; status: string };
  const app = data as App | null;
  if (!app) return { ok: false, error: "Application not found" };
  if (app.status !== "pending") return { ok: false, error: "Already decided" };

  const status = approve ? "approved" : "rejected";
  await sb.from("role_applications").update({
    status, decided_by: me.id, decided_at: new Date().toISOString(),
    notes: notes ?? null, updated_at: new Date().toISOString(),
  }).eq("id", app.id);

  if (approve) {
    // Promote the user.
    const { data: u } = await sb.from("users").select("clerk_id").eq("id", app.user_id).maybeSingle();
    const clerkId = (u as { clerk_id: string } | null)?.clerk_id ?? null;
    await sb.from("users").update({ role: app.applied_role }).eq("id", app.user_id);
    await setClerkRole(clerkId, app.applied_role);
  }

  await sb.from("notifications").insert({
    user_id: app.user_id,
    title: approve ? "🎉 Application approved" : "Application update",
    message: approve
      ? `Your ${app.applied_role} application has been approved.`
      : `Your ${app.applied_role} application was not approved this time.${notes ? ` Notes: ${notes}` : ""}`,
    type: approve ? "success" : "warning",
    action_url: "/visitor/applications",
    is_read: false,
  });

  revalidatePath("/super-admin/applications");
  revalidatePath("/visitor/applications");
  return { ok: true };
}
