"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function assertSuperAdmin() {
  const me = await getCurrentDbUser();
  if (!me || me.role !== "super_admin") throw new Error("Super admin only");
  return me;
}

/* ── Feature Flags ── */

export type FeatureFlags = {
  ai_copilot: boolean;
  spin_wheel: boolean;
  fine_system: boolean;
  community: boolean;
  payouts: boolean;
};

const FLAG_DEFAULTS: FeatureFlags = {
  ai_copilot: true,
  spin_wheel: true,
  fine_system: true,
  community: true,
  payouts: false,
};

export async function getFeatureFlags(): Promise<FeatureFlags> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("platform_settings").select("value").eq("key", "feature_flags").maybeSingle();
    if (!data) return FLAG_DEFAULTS;
    return { ...FLAG_DEFAULTS, ...(data.value as Partial<FeatureFlags>) };
  } catch { return FLAG_DEFAULTS; }
}

export async function setFeatureFlag(name: keyof FeatureFlags, enabled: boolean): Promise<R> {
  try {
    const me = await assertSuperAdmin();
    const sb = supabaseAdmin();
    const current = await getFeatureFlags();
    const updated = { ...current, [name]: enabled };
    const { error } = await sb.from("platform_settings").upsert(
      { key: "feature_flags", value: updated, updated_at: new Date().toISOString(), updated_by: me.id },
      { onConflict: "key" }
    );
    if (error) return { ok: false, error: error.message };
    revalidatePath("/super-admin");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── System Lock ── */

export async function getSystemLocked(): Promise<boolean> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("platform_settings").select("value").eq("key", "system_lock").maybeSingle();
    if (!data) return false;
    return !!(data.value as { locked?: boolean }).locked;
  } catch { return false; }
}

export async function setSystemLock(lock: boolean): Promise<R> {
  try {
    const me = await assertSuperAdmin();
    const sb = supabaseAdmin();
    const { error } = await sb.from("platform_settings").upsert(
      {
        key: "system_lock",
        value: { locked: lock, locked_at: lock ? new Date().toISOString() : null },
        updated_at: new Date().toISOString(),
        updated_by: me.id,
      },
      { onConflict: "key" }
    );
    if (error) return { ok: false, error: error.message };
    // Log audit event
    await sb.from("audit_logs").insert({
      actor_id: me.id, actor_name: me.name,
      action: lock ? "SYSTEM_LOCK" : "SYSTEM_UNLOCK",
      entity_type: "system", entity_id: "platform",
    }).then(() => {});
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Clear Cache ── */

export async function clearPlatformCache(): Promise<R> {
  try {
    await assertSuperAdmin();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* ── Real user count (admin) ── */

export async function getRoleBreakdown(): Promise<Record<string, number>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("users").select("role");
    if (!data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) counts[row.role] = (counts[row.role] || 0) + 1;
    return counts;
  } catch { return {}; }
}
