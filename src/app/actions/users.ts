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
      (process.env.URL ? process.env.URL : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://cios-intern.netlify.app"));

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

/* ── Delete a user ── */
export async function deleteUser(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const meId = await requireSuperAdmin();
    if (userId === meId) return { ok: false, error: "You cannot delete yourself" };
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    await supabaseAdmin().from("users").delete().eq("clerk_id", userId);
    const me = await getCurrentDbUser();
    await logAudit({
      actionCode: "account.deletion_requested", category: "admin",
      summary: "User account deleted",
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "user", entityId: userId,
      severity: "warning",
    });
    revalidatePath("/super-admin/users");
    return { ok: true };
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
