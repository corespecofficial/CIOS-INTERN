"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

/**
 * Cheap server-side check used by post-auth + middleware-adjacent pages
 * to decide whether to send the user through /onboarding/intent.
 */
export async function getOnboardingStatus(): Promise<
  { ok: true; completed: boolean; intent: string | null }
  | { ok: false; error: string }
> {
  const me = await getCurrentDbUser();
  if (!me) return { ok: false, error: "Unauthorized" };

  // getCurrentDbUser uses SELECT * so the new columns are already present.
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("onboarding_completed_at, intent")
    .eq("id", me.id)
    .maybeSingle();

  type Row = { onboarding_completed_at: string | null; intent: string | null };
  const r = data as Row | null;
  return {
    ok: true,
    completed: !!r?.onboarding_completed_at,
    intent: r?.intent ?? null,
  };
}
