"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { listAIAccessOverview, type AIToolId } from "@/lib/ai-access";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireSuperAdmin(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const claims = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined) || {};
  if (claims.role === "super_admin") return userId;
  const client = await clerkClient();
  const u = await client.users.getUser(userId);
  if (u.publicMetadata?.role !== "super_admin") throw new Error("Super admin only");
  return userId;
}

export async function getAIAccessOverview(): Promise<R<Awaited<ReturnType<typeof listAIAccessOverview>>>> {
  try {
    await requireSuperAdmin();
    const data = await listAIAccessOverview();
    return { ok: true, data };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function grantAIAccess(userId: string, toolId: AIToolId, dailyTokenCap: number, expiresAt: string | null): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { error } = await sb.from("ai_permissions").upsert({
      user_id: userId, tool_id: toolId,
      daily_token_cap: dailyTokenCap, expires_at: expiresAt,
      granted_by: me?.id, granted_at: new Date().toISOString(), revoked_at: null,
    }, { onConflict: "user_id,tool_id" });
    if (error) return { ok: false, error: error.message };
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Granted AI tool "${toolId}" to user`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "ai_permission", entityId: `${userId}:${toolId}`,
      metadata: { dailyTokenCap, expiresAt },
      severity: "notice",
    });
    revalidatePath("/super-admin/ai-access");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function revokeAIAccess(userId: string, toolId: AIToolId): Promise<R> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    await supabaseAdmin().from("ai_permissions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId).eq("tool_id", toolId);
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Revoked AI tool "${toolId}" from user`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "ai_permission", entityId: `${userId}:${toolId}`,
      severity: "notice",
    });
    revalidatePath("/super-admin/ai-access");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function bulkGrantByRole(role: string, toolId: AIToolId, dailyTokenCap: number): Promise<R<{ count: number }>> {
  try {
    await requireSuperAdmin();
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data: users } = await sb.from("users").select("id").eq("role", role);
    const rows = (users || []).map((u) => ({
      user_id: u.id, tool_id: toolId, daily_token_cap: dailyTokenCap,
      granted_by: me?.id, granted_at: new Date().toISOString(), revoked_at: null,
    }));
    if (rows.length > 0) {
      await sb.from("ai_permissions").upsert(rows, { onConflict: "user_id,tool_id" });
    }
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Granted AI tool "${toolId}" to all ${role}s (${rows.length} users)`,
      actorUserId: me?.id, actorName: me?.name, actorRole: me?.role,
      entityType: "ai_permission", entityId: `bulk:${role}:${toolId}`,
      metadata: { role, dailyTokenCap, count: rows.length },
      severity: "notice",
    });
    revalidatePath("/super-admin/ai-access");
    return { ok: true, data: { count: rows.length } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
