import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";

export type AIToolId = "chat" | "content_generator" | "resume_builder" | "marketing" | "image_gen" | "coding" | "analytics" | "prompt_builder";

export interface AIAccessDecision {
  allowed: boolean;
  reason?: "no_user" | "not_granted" | "expired" | "quota_exceeded" | "super_admin";
  dailyCap?: number;
  usedToday?: number;
  remainingToday?: number;
  expiresAt?: string | null;
}

/** Super admins always have access to every tool. */
export async function checkAIAccess(userId: string, toolId: AIToolId): Promise<AIAccessDecision> {
  const admin = supabaseAdmin();
  const { data: u } = await admin.from("users").select("role").eq("id", userId).maybeSingle();
  if (u?.role === "super_admin" || u?.role === "admin") return { allowed: true, reason: "super_admin" };

  const { data: perm } = await admin.from("ai_permissions")
    .select("daily_token_cap, expires_at, revoked_at")
    .eq("user_id", userId).eq("tool_id", toolId).maybeSingle();
  if (!perm || perm.revoked_at) return { allowed: false, reason: "not_granted" };
  if (perm.expires_at && new Date(perm.expires_at) < new Date()) return { allowed: false, reason: "expired", expiresAt: perm.expires_at };

  // Today's usage
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const { data: rows } = await admin.from("ai_usage_logs").select("total_tokens")
    .eq("user_id", userId).eq("tool_id", toolId).gte("created_at", dayStart.toISOString());
  const used = (rows || []).reduce((s, r) => s + (r.total_tokens || 0), 0);
  const cap = perm.daily_token_cap || 0;
  if (cap > 0 && used >= cap) return { allowed: false, reason: "quota_exceeded", dailyCap: cap, usedToday: used, remainingToday: 0, expiresAt: perm.expires_at };

  return {
    allowed: true,
    dailyCap: cap, usedToday: used, remainingToday: Math.max(0, cap - used),
    expiresAt: perm.expires_at,
  };
}

export async function requireAIAccess(toolId: AIToolId): Promise<{ userId: string; decision: AIAccessDecision }> {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  const decision = await checkAIAccess(me.id, toolId);
  if (!decision.allowed) throw new Error(accessErrorMessage(decision));
  return { userId: me.id, decision };
}

export function accessErrorMessage(d: AIAccessDecision): string {
  if (d.reason === "not_granted") return "AI Tools access has not been granted yet. Please request access from your admin.";
  if (d.reason === "expired") return "Your AI access has expired. Please request a renewal.";
  if (d.reason === "quota_exceeded") return `Daily token quota reached (${d.dailyCap?.toLocaleString()}). Try again tomorrow.`;
  return "AI access denied.";
}

export async function logUsage(input: { userId: string; toolId: string; model?: string; promptTokens?: number; completionTokens?: number; latencyMs?: number; status?: string; error?: string }) {
  try {
    const total = (input.promptTokens || 0) + (input.completionTokens || 0);
    await supabaseAdmin().from("ai_usage_logs").insert({
      user_id: input.userId,
      tool_id: input.toolId,
      model: input.model || null,
      prompt_tokens: input.promptTokens || 0,
      completion_tokens: input.completionTokens || 0,
      total_tokens: total,
      latency_ms: input.latencyMs || null,
      status: input.status || "ok",
      error: input.error || null,
    });
  } catch {/* never block user on logging */}
}

/** Admin: list all users with their AI permissions. */
export async function listAIAccessOverview() {
  const admin = supabaseAdmin();
  const [{ data: users }, { data: perms }, { data: tools }] = await Promise.all([
    admin.from("users").select("id, name, email, avatar_url, role").order("name"),
    admin.from("ai_permissions").select("user_id, tool_id, daily_token_cap, expires_at, revoked_at, granted_at"),
    admin.from("ai_tools_catalog").select("*").eq("active", true).order("label"),
  ]);
  return { users: users || [], perms: perms || [], tools: tools || [] };
}
