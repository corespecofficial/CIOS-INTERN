"use server";

/**
 * Host-portal helpers for managing public enrollment codes — admins
 * generate these from their org settings and share them publicly so
 * anyone with the code can join their class as a student. Backed by
 * the existing `org_invites` table with `email='*'` as the wildcard
 * marker for "public broadcast code" (see redeemEnrollmentCode).
 */

import { randomBytes } from "crypto";
import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logOrgAudit } from "@/lib/org-audit";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

const HOST_ROLES = new Set(["owner", "org_admin", "instructor"]);

async function assertHost(orgId: string) {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false as const, error: "Unauthorized" };
  const sb = supabaseAdmin();
  const { data: org } = await sb.from("creative_orgs").select("id, slug").eq("id", orgId).maybeSingle();
  if (!org) return { ok: false as const, error: "Org not found" };
  const isSuper = me.role === "super_admin";
  if (!isSuper) {
    const { data: m } = await sb.from("org_members").select("role")
      .eq("org_id", orgId).eq("user_id", me.id).eq("status", "active").maybeSingle();
    const role = (m as { role?: string } | null)?.role;
    if (!role || !HOST_ROLES.has(role)) return { ok: false as const, error: "Not authorised on this org" };
  }
  return { ok: true as const, me, org: org as { id: string; slug: string } };
}

function generateToken(orgSlug: string): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  const buf = randomBytes(8);
  let body = "";
  for (let i = 0; i < 8; i++) {
    body += alphabet[buf[i] % alphabet.length];
    if (i === 3) body += "-";
  }
  // Slug prefix gives the user instant context ("ACME-7K2X-9Q") so they
  // can confirm at-a-glance they pasted the right org's code.
  const prefix = orgSlug.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, "") || "CIOS";
  return `${prefix}-${body}`;
}

export interface PublicEnrollmentCode {
  id: string;
  token: string;
  role: "student" | "instructor" | "org_admin" | "moderator" | "finance" | "support" | "mentor";
  expires_at: string;
  created_at: string;
  notes: string | null;
}

export async function createPublicEnrollmentCode(orgId: string, opts: {
  role?: PublicEnrollmentCode["role"];
  expiresInDays?: number;
  notes?: string;
}): Promise<R<{ token: string }>> {
  const a = await assertHost(orgId);
  if (!a.ok) return a;

  const role = opts.role ?? "student";
  const days = Math.max(1, Math.min(365, opts.expiresInDays ?? 90));
  const expires = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const sb = supabaseAdmin();

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateToken(a.org.slug);
    const { error } = await sb.from("org_invites").insert({
      org_id: orgId,
      email: "*",                   // wildcard → redeemEnrollmentCode treats as public
      role,
      token,
      invited_by: a.me.id,
      expires_at: expires,
      // Phase 4 schema doesn't have a notes column on org_invites — store
      // notes inline in the token wouldn't be safe; if needed in future
      // add a column via migration. For now the prefix doubles as a tag.
    });
    if (!error) {
      await logOrgAudit({
        orgId, actorId: a.me.id, action: "code.created",
        target: `code:${token}`,
        meta: { role, expires_at: expires },
      });
      revalidatePath(`/o/${a.org.slug}/settings`);
      return { ok: true, data: { token } };
    }
    if (!/duplicate key/i.test(error.message)) return { ok: false, error: error.message };
  }
  return { ok: false, error: "Could not generate a unique code" };
}

export async function listPublicEnrollmentCodes(orgId: string): Promise<R<PublicEnrollmentCode[]>> {
  const a = await assertHost(orgId);
  if (!a.ok) return a;
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("org_invites")
    .select("id, token, role, expires_at, created_at")
    .eq("org_id", orgId)
    .eq("email", "*")
    .order("created_at", { ascending: false })
    .limit(100);
  type Row = { id: string; token: string; role: PublicEnrollmentCode["role"]; expires_at: string; created_at: string };
  const rows = (data || []) as Row[];
  return { ok: true, data: rows.map((r) => ({ ...r, notes: null })) };
}

export async function revokePublicEnrollmentCode(orgId: string, codeId: string): Promise<R> {
  const a = await assertHost(orgId);
  if (!a.ok) return a;
  const sb = supabaseAdmin();
  // Set expires_at = now to make it un-redeemable. Keep the row for audit.
  const { error } = await sb.from("org_invites")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", codeId).eq("org_id", orgId).eq("email", "*");
  if (error) return { ok: false, error: error.message };
  await logOrgAudit({
    orgId, actorId: a.me.id, action: "code.revoked",
    target: `code:${codeId}`,
  });
  revalidatePath(`/o/${a.org.slug}/settings`);
  return { ok: true };
}
