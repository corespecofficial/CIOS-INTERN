"use server";

/**
 * Per-email org invites. Pairs with the public-code system in
 * enrollment-codes.ts:
 *
 *   public code  → org_invites.email = '*'   → multi-use, broadcast
 *   email invite → org_invites.email = real  → single-use, per-person
 *
 * The same redeemOrgInvite + redeemEnrollmentCode actions already
 * accept both shapes; this file just exposes the WRITE side for the
 * host portal so admins can directly invite collaborators (a co-
 * instructor, an org_admin, a known student) without sharing a public
 * link.
 */

import { randomBytes } from "crypto";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logOrgAudit } from "@/lib/org-audit";
import { publishPlatformOrgEvent } from "@/lib/org-platform-events";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const HOST_ROLES = new Set(["owner", "org_admin"]);

async function assertOrgStaff(orgId: string) {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false as const, error: "Unauthorized" };
  const sb = supabaseAdmin();
  const { data: org } = await sb.from("creative_orgs").select("id, slug, name").eq("id", orgId).maybeSingle();
  if (!org) return { ok: false as const, error: "Org not found" };
  const isSuper = me.role === "super_admin";
  if (!isSuper) {
    const { data: m } = await sb.from("org_members").select("role")
      .eq("org_id", orgId).eq("user_id", me.id).eq("status", "active").maybeSingle();
    const role = (m as { role?: string } | null)?.role;
    // Only owners + org_admins can invite. Instructors can teach but
    // can't change the roster shape — that's a staffing decision.
    if (!role || !HOST_ROLES.has(role)) return { ok: false as const, error: "Owner / org-admin only" };
  }
  return { ok: true as const, me, org: org as { id: string; slug: string; name: string } };
}

function generateInviteToken(): string {
  // URL-safe base32 alphabet, 16 chars (~80 bits) — plenty for a token
  // we expire in ≤90 days.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

const VALID_INVITE_ROLES = ["org_admin", "instructor", "student", "moderator", "finance", "support", "mentor"] as const;
type InviteRole = (typeof VALID_INVITE_ROLES)[number];

export interface PendingInvite {
  id: string;
  email: string;
  role: InviteRole;
  token: string;
  expires_at: string;
  created_at: string;
  invited_by_name: string | null;
}

export async function inviteByEmail(orgId: string, email: string, role: InviteRole, expiresInDays = 30): Promise<R<{ token: string; alreadyMember: boolean; existingUser: boolean }>> {
  const a = await assertOrgStaff(orgId);
  if (!a.ok) return a;
  if (!VALID_INVITE_ROLES.includes(role)) return { ok: false, error: "Invalid invite role" };

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { ok: false, error: "Enter a valid email address" };
  if (cleanEmail === "*") return { ok: false, error: "Use the public-code panel for broadcast invites" };

  const sb = supabaseAdmin();
  const days = Math.max(1, Math.min(90, expiresInDays));
  const expires = new Date(Date.now() + days * 86400 * 1000).toISOString();

  // If the email already maps to a CIOS user, check whether they're
  // already a member of this org. If yes, the invite is a no-op and we
  // tell the host so they don't think it failed silently.
  const { data: userRow } = await sb.from("users").select("id, name, clerk_id").eq("email", cleanEmail).maybeSingle();
  const targetUser = userRow as { id: string; name: string; clerk_id: string | null } | null;

  if (targetUser) {
    const { data: m } = await sb.from("org_members").select("id, status, role")
      .eq("org_id", orgId).eq("user_id", targetUser.id).maybeSingle();
    const existing = m as { id: string; status: string; role: string } | null;
    if (existing && existing.status === "active") {
      return { ok: false, error: `${cleanEmail} is already an active ${existing.role} in this org` };
    }
  }

  // Insert the invite. If a non-accepted invite for the same email +
  // org exists already, supersede it (revoke the old one via expires_at)
  // so the host doesn't end up with multiple live invites for one
  // person. We don't have a unique partial index for email='real'
  // because email='*' rows would conflict; do this in app code.
  await sb.from("org_invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("org_id", orgId)
    .eq("email", cleanEmail)
    .is("accepted_at", null);

  let token = "";
  for (let attempt = 0; attempt < 5 && !token; attempt++) {
    const candidate = generateInviteToken();
    const { error } = await sb.from("org_invites").insert({
      org_id: orgId,
      email: cleanEmail,
      role,
      token: candidate,
      invited_by: a.me.id,
      expires_at: expires,
    });
    if (!error) { token = candidate; break; }
    if (!/duplicate key/i.test(error.message)) return { ok: false, error: error.message };
  }
  if (!token) return { ok: false, error: "Could not generate a unique invite token" };

  // Audit + notify the recipient (only if they have a CIOS account
  // already). Hosts who invite a non-user have to share the link
  // out-of-band; we hand it back to them in the response.
  await logOrgAudit({
    orgId, actorId: a.me.id, action: "member.invited",
    target: targetUser ? `user:${targetUser.id}` : `email:${cleanEmail}`,
    meta: { email: cleanEmail, role, expires_at: expires, target_is_existing_user: !!targetUser },
  });
  await publishPlatformOrgEvent({
    orgId,
    eventType: "org.member_invited",
    actorId: a.me.id,
    metadata: {
      email: cleanEmail,
      role,
      target_user_id: targetUser?.id ?? null,
      expires_at: expires,
    },
  });

  if (targetUser) {
    const link = `/onboarding/enrollment?code=${encodeURIComponent(token)}`;
    try {
      await sb.from("notifications").insert({
        user_id: targetUser.id,
        org_id: orgId,
        title: `📨 You're invited to ${a.org.name}`,
        message: `${a.me.name || "An admin"} invited you as a ${role.replace("_", " ")}. Tap to accept.`,
        type: "info",
        action_url: link,
        is_read: false,
      });
    } catch (e) {
      console.warn("[inviteByEmail] notify failed (non-fatal):", e);
    }
  }

  revalidatePath(`/o/${a.org.slug}/members`);
  revalidatePath("/super-admin/orgs");
  return { ok: true, data: { token, alreadyMember: false, existingUser: !!targetUser } };
}

export async function listPendingEmailInvites(orgId: string): Promise<R<PendingInvite[]>> {
  const a = await assertOrgStaff(orgId);
  if (!a.ok) return a;
  const sb = supabaseAdmin();
  // email != '*' filters out the public broadcast codes (they have
  // their own panel). accepted_at IS NULL keeps consumed invites out.
  const { data } = await sb
    .from("org_invites")
    .select("id, email, role, token, expires_at, created_at, invited_by, users:users!org_invites_invited_by_fkey(name)")
    .eq("org_id", orgId)
    .neq("email", "*")
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(200);
  type Row = {
    id: string; email: string; role: InviteRole; token: string;
    expires_at: string; created_at: string; invited_by: string | null;
    users: { name: string | null } | null;
  };
  const rows = (data || []) as unknown as Row[];
  return {
    ok: true,
    data: rows.map((r) => ({
      id: r.id, email: r.email, role: r.role, token: r.token,
      expires_at: r.expires_at, created_at: r.created_at,
      invited_by_name: r.users?.name ?? null,
    })),
  };
}

export async function revokeEmailInvite(orgId: string, inviteId: string): Promise<R> {
  const a = await assertOrgStaff(orgId);
  if (!a.ok) return a;
  const sb = supabaseAdmin();
  // Hard-expire (set expires_at = now) so the row stays for audit but
  // no longer redeems. Same semantics as public-code revoke.
  const { error } = await sb.from("org_invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("org_id", orgId)
    .neq("email", "*"); // belt-and-braces: don't accidentally revoke a public code via this path
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/o/${a.org.slug}/members`);
  return { ok: true };
}
