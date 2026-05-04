"use server";

import { randomBytes } from "crypto";
import { supabaseAdmin, getCurrentDbUser, type Role } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

function generateCode(): string {
  // CIOS-XXXX-XXXX form. 8 base32-ish chars from 5 random bytes
  // (40 bits) → ~1 trillion possibilities. Cheap to brute-force at
  // scale, so we also rate-limit redemption attempts elsewhere.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  const buf = randomBytes(8);
  let out = "CIOS-";
  for (let i = 0; i < 8; i++) {
    out += alphabet[buf[i] % alphabet.length];
    if (i === 3) out += "-";
  }
  return out;
}

export async function createSuperAdminCode(input: {
  role: Role;
  expiresInDays: number;
  notes?: string;
  org_id?: string;
  max_uses?: number;
}): Promise<R<{ code: string }>> {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") return { ok: false, error: "Super admin only" };

  const sb = supabaseAdmin();
  const expires = new Date(Date.now() + Math.max(1, input.expiresInDays) * 86400 * 1000).toISOString();

  // Retry generation on the (extremely unlikely) collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await sb.from("super_admin_codes").insert({
      code,
      role: input.role,
      org_id: input.org_id ?? null,
      notes: input.notes?.trim() || null,
      created_by: me.id,
      expires_at: expires,
      max_uses: Math.max(1, input.max_uses ?? 1),
    });
    if (!error) {
      revalidatePath("/super-admin/codes");
      return { ok: true, data: { code } };
    }
    if (!/duplicate key/i.test(error.message)) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "Could not generate a unique code" };
}

export async function revokeSuperAdminCode(id: string): Promise<R> {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") return { ok: false, error: "Super admin only" };
  const sb = supabaseAdmin();
  // Set expires_at to now → unredeemable. Keep the row for audit.
  const { error } = await sb
    .from("super_admin_codes")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/super-admin/codes");
  return { ok: true };
}
