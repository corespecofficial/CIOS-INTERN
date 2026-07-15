"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { publishOrgQuotaWarnings, publishPlatformOrgEvent } from "@/lib/org-platform-events";
import { cacheDel, orgCacheKey } from "@/lib/cache";

export type Role =
  | "intern" | "team_lead" | "admin" | "super_admin"
  | "instructor" | "moderator" | "finance" | "support" | "recruiter";

const VALID_ROLES: Role[] = [
  "intern", "team_lead", "admin", "super_admin",
  "instructor", "moderator", "finance", "support", "recruiter",
];

async function requireSuperAdmin() {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  // First try sessionClaims (fast, from JWT)
  const claimsMeta = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claimsMeta.role === "super_admin") return userId;
  // Fallback: JWT was issued before role was set — fetch fresh user
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const freshRole = (user.publicMetadata?.role as string | undefined) || "intern";
  if (freshRole !== "super_admin") throw new Error("Forbidden — super admin only");
  return userId;
}

async function invalidateUserOrgAccess(clerkUserId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { data: user } = await sb.from("users").select("id").eq("clerk_id", clerkUserId).maybeSingle();
  const dbUserId = (user as { id?: string } | null)?.id;
  if (!dbUserId) return;
  const { data: memberships } = await sb
    .from("org_members")
    .select("creative_orgs!inner(slug)")
    .eq("user_id", dbUserId);
  const keys = (memberships || []).flatMap((row) => {
    const joined = (row as unknown as { creative_orgs?: { slug?: string } | Array<{ slug?: string }> }).creative_orgs;
    const org = Array.isArray(joined) ? joined[0] : joined;
    return org?.slug ? [orgCacheKey.membership(clerkUserId, org.slug)] : [];
  });
  if (keys.length) await cacheDel(...keys);
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: Role;
  createdAt: number;
  lastSignInAt: number | null;
  banned: boolean;
}

/* ── List all users ── */
export async function listUsers(): Promise<{ ok: true; users: UserListItem[] } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const client = await clerkClient();
    const response = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

    const users: UserListItem[] = response.data.map((u) => {
      const rawRole = (u.publicMetadata?.role as string | undefined) || "intern";
      const role: Role = VALID_ROLES.includes(rawRole as Role) ? (rawRole as Role) : "intern";
      return {
        id: u.id,
        email: u.primaryEmailAddress?.emailAddress || u.emailAddresses[0]?.emailAddress || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        imageUrl: u.imageUrl || "",
        role,
        createdAt: u.createdAt,
        lastSignInAt: u.lastSignInAt,
        banned: u.banned || false,
      };
    });

    return { ok: true, users };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to list users" };
  }
}

/* ── Update a user's role ── */
export async function updateUserRole(userId: string, role: Role): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    if (!VALID_ROLES.includes(role)) return { ok: false, error: "Invalid role" };
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role },
    });
    // Keep Supabase users.role in sync so dashboards/counts don't drift
    const { error } = await supabaseAdmin()
      .from("users")
      .update({ role })
      .eq("clerk_id", userId);
    if (error) console.error("[updateUserRole] supabase sync failed:", error);
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "admin.role_changed", category: "admin",
      summary: `Role changed to ${role}`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: userId,
      metadata: { newRole: role }, severity: role === "super_admin" ? "critical" : "notice",
    });
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update role" };
  }
}

/* ── Invite a new user with a pre-assigned role ── */
export async function inviteUser(
  email: string,
  role: Role
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    if (!email || !email.includes("@")) return { ok: false, error: "Invalid email" };
    if (!VALID_ROLES.includes(role)) return { ok: false, error: "Invalid role" };

    const client = await clerkClient();

    // Build absolute URL pointing to our branded sign-up page
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.URL ? process.env.URL : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cios-intern.vercel.app"));

    await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role },
      ignoreExisting: true,
      notify: true,
      redirectUrl: `${baseUrl}/sign-up`,
    });
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send invite";
    return { ok: false, error: msg };
  }
}

/* ── Suspend / unsuspend a user ── */
export async function setUserBan(userId: string, banned: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const client = await clerkClient();
    if (banned) {
      await client.users.banUser(userId);
    } else {
      await client.users.unbanUser(userId);
    }
    await supabaseAdmin()
      .from("users")
      .update({ status: banned ? "suspended" : "active" })
      .eq("clerk_id", userId);
    await invalidateUserOrgAccess(userId);
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: banned ? "admin.user_suspended" : "admin.user_restored",
      category: "admin",
      summary: banned ? "User suspended" : "User restored",
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: userId,
      severity: "notice",
    });
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update ban status" };
  }
}

/* ── Delete a user ──
 *
 * Hard-delete from BOTH Clerk and Supabase. The naive version used to
 * abort on the first failure, leaving a half-deleted user — the most
 * common shape: Clerk delete throws (user already gone, network blip)
 * → Supabase row never gets deleted → next time the user signs in,
 * Clerk says "yes" but Supabase says "no" and they enter a /sign-in ⇄
 * /onboarding/intent loop.
 *
 * New behaviour:
 *   1. Clerk delete: tolerate 404/410 (already-deleted) as success. Any
 *      other Clerk error is captured but DOES NOT abort the Supabase
 *      cleanup — we want the row gone either way.
 *   2. Supabase cleanup runs unconditionally, in its own try/catch.
 *   3. After both, we verify Clerk via getUser. If the user is still
 *      there we surface a partial-success error so the super-admin can
 *      retry with the still-extant Clerk ID.
 *   4. The returned `data` object reports what each step did, so the
 *      UI can show "Cleaned up Supabase, Clerk delete failed" instead
 *      of a misleading generic error.
 */
export async function deleteUser(userId: string): Promise<{
  ok: true;
  data: { clerkDeleted: boolean; supabaseDeleted: boolean; warning?: string };
} | { ok: false; error: string }> {
  try {
    const meId = await requireSuperAdmin();
    if (userId === meId) return { ok: false, error: "You cannot delete yourself" };

    const client = await clerkClient();

    // Capture and invalidate tenant access before the application user row
    // (and cascading memberships) disappears.
    await invalidateUserOrgAccess(userId);

    // 1) Clerk delete — idempotent.
    let clerkDeleted = false;
    let clerkError: string | null = null;
    try {
      await client.users.deleteUser(userId);
      clerkDeleted = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Clerk SDK returns generic Error objects; sniff the common
      // "already gone" shape and treat as success.
      const alreadyGone = /not found|404|410|gone|does not exist/i.test(msg);
      if (alreadyGone) {
        clerkDeleted = true;          // treat as deleted-by-someone-else
      } else {
        clerkError = msg;
      }
    }

    // 2) Supabase cleanup — runs unconditionally so we never leave a
    // ghost row that can never be re-claimed without manual SQL.
    let supabaseDeleted = false;
    let supabaseError: string | null = null;
    try {
      const { error } = await supabaseAdmin()
        .from("users")
        .delete()
        .eq("clerk_id", userId);
      if (error) supabaseError = error.message;
      else supabaseDeleted = true;
    } catch (e) {
      supabaseError = e instanceof Error ? e.message : String(e);
    }

    // 3) Verify the Clerk user is actually gone. If a transient error
    // earlier let the user persist, surface a clear retry hint.
    if (clerkDeleted && !clerkError) {
      try {
        await client.users.getUser(userId);
        // If getUser succeeds, the deletion didn't actually take effect.
        clerkDeleted = false;
        clerkError = "Clerk reports user still exists after deletion attempt";
      } catch (e) {
        // Expected — user is gone. Any error here means delete worked.
        const msg = e instanceof Error ? e.message : String(e);
        if (!/not found|404|410|does not exist/i.test(msg)) {
          // Unknown error — be conservative and flag for retry.
          clerkError = `Verify failed: ${msg}`;
          clerkDeleted = false;
        }
      }
    }

    // 4) Audit-log whatever happened. We log even partial successes
    // because operators need to know about half-deletes.
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "account.deletion_requested", category: "admin",
      summary: clerkDeleted && supabaseDeleted
        ? "User account fully deleted"
        : `User deletion partial (clerk=${clerkDeleted}, supabase=${supabaseDeleted})`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: userId,
      severity: clerkDeleted && supabaseDeleted ? "warning" : "error",
    });

    revalidatePath("/super-admin/users");

    if (!clerkDeleted || !supabaseDeleted) {
      const parts = [
        clerkError && `Clerk: ${clerkError}`,
        supabaseError && `Supabase: ${supabaseError}`,
      ].filter(Boolean);
      // Even on partial failure we return ok:true so the UI can stop
      // showing "deleting…" — but include a `warning` string so the
      // operator sees what didn't get cleaned up.
      return {
        ok: true,
        data: {
          clerkDeleted,
          supabaseDeleted,
          warning: parts.join(" · ") || "Partial deletion — see audit log",
        },
      };
    }

    return { ok: true, data: { clerkDeleted: true, supabaseDeleted: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete user" };
  }
}

/* ── List pending invitations ── */
export interface PendingInvitation {
  id: string;
  email: string;
  role: Role;
  createdAt: number;
  status: string;
}

export async function listPendingInvitations(): Promise<{ ok: true; invitations: PendingInvitation[] } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const client = await clerkClient();
    const response = await client.invitations.getInvitationList({ status: "pending", limit: 100 });
    const invitations: PendingInvitation[] = response.data.map((inv) => {
      const rawRole = (inv.publicMetadata?.role as string | undefined) || "intern";
      const role: Role = VALID_ROLES.includes(rawRole as Role) ? (rawRole as Role) : "intern";
      return {
        id: inv.id,
        email: inv.emailAddress,
        role,
        createdAt: inv.createdAt,
        status: inv.status,
      };
    });
    return { ok: true, invitations };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to list invitations" };
  }
}

/* ── Revoke a pending invitation ── */
export async function revokeInvitation(invitationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const client = await clerkClient();
    await client.invitations.revokeInvitation(invitationId);
    revalidatePath("/super-admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to revoke invitation" };
  }
}

/* ────────────────────────────────────────────────────────────────────
   ORG MEMBERSHIP MANAGEMENT (super-admin only)

   The Manage Users page lists platform-wide users; org-level
   membership lives in `org_members` keyed by Supabase users.id (NOT
   Clerk id). These actions resolve clerk_id → users.id internally
   so the caller can pass the Clerk id from the user list.
   ──────────────────────────────────────────────────────────────────── */

export type OrgMemberRole =
  | "owner"
  | "org_admin"
  | "instructor"
  | "student"
  | "moderator"
  | "finance"
  | "support"
  | "mentor";

const ORG_ROLES: OrgMemberRole[] = ["owner", "org_admin", "instructor", "student", "moderator", "finance", "support", "mentor"];

export interface OrgMembership {
  org_id: string;
  org_slug: string;
  org_name: string;
  org_status: string;
  role: OrgMemberRole;
  status: string;
  joined_at: string;
}

export interface OrgListItem {
  id: string;
  slug: string;
  name: string;
  status: string;
  member_count: number;
}

async function resolveSupabaseUserId(clerkId: string): Promise<string | null> {
  const sb = supabaseAdmin();
  const { data } = await sb.from("users").select("id").eq("clerk_id", clerkId).maybeSingle();
  return (data as { id?: string } | null)?.id || null;
}

export async function listUserOrgs(clerkId: string): Promise<{ ok: true; memberships: OrgMembership[]; supabaseUserId: string | null } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const sbUserId = await resolveSupabaseUserId(clerkId);
    if (!sbUserId) return { ok: true, memberships: [], supabaseUserId: null };

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("org_members")
      .select("role, status, joined_at, creative_orgs!inner(id, slug, name, status)")
      .eq("user_id", sbUserId)
      .order("joined_at", { ascending: false });
    if (error) return { ok: false, error: error.message };

    type Row = { role: OrgMemberRole; status: string; joined_at: string; creative_orgs: { id: string; slug: string; name: string; status: string } };
    const memberships: OrgMembership[] = ((data || []) as unknown as Row[]).map((r) => ({
      org_id: r.creative_orgs.id,
      org_slug: r.creative_orgs.slug,
      org_name: r.creative_orgs.name,
      org_status: r.creative_orgs.status,
      role: r.role,
      status: r.status,
      joined_at: r.joined_at,
    }));
    return { ok: true, memberships, supabaseUserId: sbUserId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to list user orgs" };
  }
}

export async function listAllOrgsForAssignment(): Promise<{ ok: true; orgs: OrgListItem[] } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("creative_orgs")
      .select("id, slug, name, status, member_count")
      .order("name", { ascending: true })
      .limit(500);
    if (error) return { ok: false, error: error.message };
    return { ok: true, orgs: (data || []) as OrgListItem[] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to list orgs" };
  }
}

/**
 * Add or update a user's membership in an org. If the user has no
 * Supabase row yet (Clerk-only ghost), this returns a friendly error
 * instead of creating one — a missing Supabase row usually means the
 * Clerk webhook hasn't synced yet, and we'd rather surface that than
 * paper over it.
 */
export async function assignUserToOrg(
  clerkId: string,
  orgId: string,
  role: OrgMemberRole,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    if (!ORG_ROLES.includes(role)) return { ok: false, error: "Invalid org role" };
    const sbUserId = await resolveSupabaseUserId(clerkId);
    if (!sbUserId) return { ok: false, error: "User has no Supabase record yet — wait for Clerk webhook to sync, then retry." };

    const sb = supabaseAdmin();
    const { error } = await sb.rpc("upsert_org_member_with_quota", {
      p_org_id: orgId,
      p_user_id: sbUserId,
      p_role: role,
      p_status: "active",
      p_invited_by: null,
    });
    if (error) return { ok: false, error: error.message };

    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "admin.org_membership_assigned",
      category: "admin",
      summary: `Added user to org as ${role}`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: clerkId,
      metadata: { orgId, role }, severity: "notice",
    });
    await publishPlatformOrgEvent({
      orgId,
      eventType: "org.member_joined",
      actorId: me?.id ?? null,
      metadata: { user_id: sbUserId, role, via: "super_admin_assignment" },
    });
    await publishOrgQuotaWarnings(orgId, me?.id ?? null);
    revalidatePath(`/super-admin/users/${clerkId}/orgs`);
    revalidatePath("/super-admin/orgs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to assign org membership" };
  }
}

export async function removeUserFromOrg(
  clerkId: string,
  orgId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireSuperAdmin();
    const sbUserId = await resolveSupabaseUserId(clerkId);
    if (!sbUserId) return { ok: false, error: "User has no Supabase record" };

    const sb = supabaseAdmin();
    // Refuse to delete the sole owner — would orphan the org. Use the
    // transfer_org_ownership flow first.
    const { data: existing } = await sb
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", sbUserId)
      .maybeSingle();
    const existingRole = (existing as { role?: string } | null)?.role;
    if (existingRole === "owner") {
      const { count } = await sb
        .from("org_members")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("role", "owner")
        .eq("status", "active");
      if ((count || 0) <= 1) {
        return { ok: false, error: "Can't remove the sole owner. Transfer ownership first." };
      }
    }

    const { error } = await sb
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", sbUserId);
    if (error) return { ok: false, error: error.message };

    await sb.rpc("recount_org_members", { p_org_id: orgId }).then(() => null, () => null);

    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "admin.org_membership_removed",
      category: "admin",
      summary: `Removed user from org`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: clerkId,
      metadata: { orgId }, severity: "notice",
    });
    await publishPlatformOrgEvent({
      orgId,
      eventType: "org.member_removed",
      actorId: me?.id ?? null,
      metadata: { user_id: sbUserId, via: "super_admin_removal" },
    });
    revalidatePath(`/super-admin/users/${clerkId}/orgs`);
    revalidatePath("/super-admin/orgs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove org membership" };
  }
}
