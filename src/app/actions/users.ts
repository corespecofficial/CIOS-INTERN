"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { logAudit } from "@/lib/audit";

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
