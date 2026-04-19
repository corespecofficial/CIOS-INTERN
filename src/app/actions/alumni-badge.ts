"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface AlumniBadge {
  id: string;
  user_id: string;
  user_name?: string;
  cohort: string | null;
  tier: "standard" | "honours" | "distinction";
  final_score: number | null;
  issued_at: string;
  verification_code: string;
  revoked: boolean;
  revoked_reason: string | null;
}

function scoreToTier(score: number): "standard" | "honours" | "distinction" {
  if (score >= 90) return "distinction";
  if (score >= 75) return "honours";
  return "standard";
}

export async function getMyAlumniBadge(): Promise<R<AlumniBadge | null>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Not authenticated" };
    const sb = supabaseAdmin();
    const { data } = await sb.from("alumni_badges").select("*").eq("user_id", me.id).maybeSingle();
    return { ok: true, data: (data ?? null) as AlumniBadge | null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function verifyAlumniBadge(code: string): Promise<R<AlumniBadge | null>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("alumni_badges")
      .select("*, user:users!alumni_badges_user_id_fkey(name)")
      .eq("verification_code", code)
      .maybeSingle();
    if (!data) return { ok: true, data: null };
    type Row = AlumniBadge & { user: { name: string | null } | null };
    const r = data as Row;
    return {
      ok: true,
      data: { ...r, user_name: r.user?.name ?? undefined },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function adminIssueAlumniBadge(input: {
  user_id: string;
  cohort?: string;
  final_score: number;
}): Promise<R<AlumniBadge>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();

    const tier = scoreToTier(input.final_score);
    const { data, error } = await sb
      .from("alumni_badges")
      .upsert(
        {
          user_id: input.user_id,
          cohort: input.cohort ?? null,
          final_score: input.final_score,
          tier,
          issued_by: me.id,
          revoked: false,
          revoked_reason: null,
          revoked_at: null,
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();
    if (error) throw error;
    revalidatePath("/alumni-badge");
    return { ok: true, data: data as AlumniBadge };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function adminRevokeBadge(id: string, reason: string): Promise<R<void>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin", "super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    await sb
      .from("alumni_badges")
      .update({ revoked: true, revoked_reason: reason, revoked_at: new Date().toISOString() })
      .eq("id", id);
    revalidatePath("/alumni-badge");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
