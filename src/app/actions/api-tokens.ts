"use server";

import { randomBytes, createHash } from "crypto";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface ApiToken {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

async function requireAdminOrRecruiter() {
  const me = await getCurrentDbUser();
  if (!me || !["admin", "super_admin", "recruiter"].includes(me.role)) throw new Error("Forbidden");
  return me;
}

/**
 * Generate a token. Returns the FULL token ONCE — never persisted in plaintext.
 * Storage: SHA-256 hash + an 8-char prefix for display.
 */
export async function createApiToken(input: { name: string; scopes: string[]; expiresInDays?: number }): Promise<R<{ token: string; record: ApiToken }>> {
  try {
    const me = await requireAdminOrRecruiter();
    const raw = `cios_${randomBytes(24).toString("base64url")}`;
    const prefix = raw.slice(0, 12);
    const hash = createHash("sha256").update(raw).digest("hex");
    const expires_at = input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 86400_000).toISOString() : null;
    const { data, error } = await supabaseAdmin().from("api_tokens").insert({
      user_id: me.id, name: input.name.slice(0, 80), prefix, hash, scopes: input.scopes, expires_at,
    }).select("id, user_id, name, prefix, scopes, last_used_at, expires_at, created_at").single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin/integrations");
    return { ok: true, data: { token: raw, record: data as ApiToken } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyApiTokens(): Promise<R<ApiToken[]>> {
  try {
    const me = await requireAdminOrRecruiter();
    const { data } = await supabaseAdmin().from("api_tokens")
      .select("id, user_id, name, prefix, scopes, last_used_at, expires_at, created_at")
      .eq("user_id", me.id).order("created_at", { ascending: false });
    return { ok: true, data: (data || []) as ApiToken[] };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function revokeApiToken(id: string): Promise<R> {
  try {
    const me = await requireAdminOrRecruiter();
    await supabaseAdmin().from("api_tokens").delete().eq("id", id).eq("user_id", me.id);
    revalidatePath("/admin/integrations");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Validate an incoming Bearer token (use from API routes). */
export async function validateApiToken(authHeader: string | null): Promise<{ ok: true; userId: string; scopes: string[] } | { ok: false; error: string }> {
  if (!authHeader) return { ok: false, error: "Missing Authorization" };
  const match = authHeader.match(/^Bearer\s+(\S+)/i);
  if (!match) return { ok: false, error: "Invalid Authorization format" };
  const raw = match[1];
  const hash = createHash("sha256").update(raw).digest("hex");
  const sb = supabaseAdmin();
  const { data: row } = await sb.from("api_tokens").select("id, user_id, scopes, expires_at").eq("hash", hash).maybeSingle();
  if (!row) return { ok: false, error: "Invalid token" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "Token expired" };
  await sb.from("api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: true, userId: row.user_id, scopes: row.scopes || [] };
}
