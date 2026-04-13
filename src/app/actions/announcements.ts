"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { pushNotification } from "@/app/actions/notifications";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export type Priority = "low" | "medium" | "high" | "critical";
export type Kind = "text" | "image" | "video" | "poll" | "update" | "emergency" | "event" | "payment" | "route_lock" | "survey";
export type AudienceType = "all" | "role" | "user" | "team" | "class" | "portal";

const PRIORITY_RANK: Record<Priority, number> = { low: 0, medium: 1, high: 2, critical: 3 };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function getPermission(role: string): Promise<{ can_send: boolean; allowed_audiences: string[]; max_priority: Priority } | null> {
  try {
    const { data } = await supabaseAdmin().from("announcement_permissions").select("*").eq("role", role).maybeSingle();
    return data as { can_send: boolean; allowed_audiences: string[]; max_priority: Priority } | null;
  } catch { return null; }
}

async function requireSender(): Promise<{ id: string; name: string; role: string; perm: { allowed_audiences: string[]; max_priority: Priority } }> {
  const me = await requireMe();
  const perm = await getPermission(me.role);
  if (!perm?.can_send) throw new Error("Your role cannot send announcements");
  return { id: me.id, name: me.name, role: me.role, perm };
}

export interface AnnouncementInput {
  title: string;
  body: string;
  kind?: Kind;
  priority?: Priority;
  imageUrl?: string;
  videoUrl?: string;
  youtubeId?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  pollOptions?: string[];
  audienceType: AudienceType;
  audienceRoles?: string[];
  audienceUserIds?: string[];
  requireConfirmation?: boolean;
  delayCloseSeconds?: number;
  displayDurationSeconds?: number | null;
  startsAt?: string;
  expiresAt?: string | null;
  routeLockPath?: string | null;
}

export async function createAnnouncement(input: AnnouncementInput): Promise<R<{ id: string }>> {
  try {
    const sender = await requireSender();
    if (!input.title.trim()) return { ok: false, error: "Title required" };
    const priority = (input.priority || "low") as Priority;
    if (PRIORITY_RANK[priority] > PRIORITY_RANK[sender.perm.max_priority]) {
      return { ok: false, error: `Your role max priority is "${sender.perm.max_priority}"` };
    }
    if (!sender.perm.allowed_audiences.includes(input.audienceType)) {
      return { ok: false, error: `Your role cannot target "${input.audienceType}"` };
    }
    const { data, error } = await supabaseAdmin().from("announcements").insert({
      sender_id: sender.id, sender_role: sender.role,
      title: input.title.trim(), body: input.body || "",
      kind: input.kind || "text", priority,
      image_url: input.imageUrl || null, video_url: input.videoUrl || null,
      youtube_id: input.youtubeId || null,
      cta_label: input.ctaLabel || null, cta_url: input.ctaUrl || null,
      poll_options: input.pollOptions && input.pollOptions.length ? input.pollOptions : null,
      audience_type: input.audienceType,
      audience_roles: input.audienceRoles || [],
      audience_user_ids: input.audienceUserIds || [],
      require_confirmation: input.requireConfirmation || priority === "high" || priority === "critical",
      delay_close_seconds: input.delayCloseSeconds || (priority === "critical" ? 15 : priority === "high" ? 10 : 0),
      display_duration_seconds: input.displayDurationSeconds || null,
      starts_at: input.startsAt || new Date().toISOString(),
      expires_at: input.expiresAt || null,
      route_lock_path: input.routeLockPath || null,
    }).select("id").single();
    if (error) return { ok: false, error: error.message };

    const id = (data as { id: string }).id;
    await logAudit({
      actionCode: "admin.announcement_broadcast", category: "admin",
      summary: `Announcement: ${input.title}`,
      actorUserId: sender.id, actorName: sender.name, actorRole: sender.role,
      entityType: "announcement", entityId: id,
      metadata: { priority, audienceType: input.audienceType },
      severity: priority === "critical" ? "critical" : priority === "high" ? "warning" : "notice",
    });

    // Notify target audience via in-app bell
    const targetUsers = await resolveAudience(input);
    for (const userId of targetUsers.slice(0, 2000)) {
      await pushNotification({
        userId, kind: "system",
        title: `📢 ${input.title}`, body: input.body.slice(0, 160),
        url: `/announcements/${id}`,
      }).catch(() => {});
    }

    revalidatePath("/announcements");
    revalidatePath("/admin/announcement-control");
    return { ok: true, data: { id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

async function resolveAudience(input: AnnouncementInput): Promise<string[]> {
  const sb = supabaseAdmin();
  try {
    if (input.audienceType === "all") {
      const { data } = await sb.from("users").select("id").eq("status", "active");
      return ((data || []) as Array<{ id: string }>).map((u) => u.id);
    }
    if (input.audienceType === "role" && input.audienceRoles?.length) {
      const { data } = await sb.from("users").select("id").in("role", input.audienceRoles);
      return ((data || []) as Array<{ id: string }>).map((u) => u.id);
    }
    if (input.audienceType === "user" && input.audienceUserIds?.length) {
      return input.audienceUserIds;
    }
    if (input.audienceType === "portal" && input.audienceRoles?.length) {
      const { data } = await sb.from("users").select("id").in("role", input.audienceRoles);
      return ((data || []) as Array<{ id: string }>).map((u) => u.id);
    }
    return [];
  } catch { return []; }
}

export async function listAnnouncementsForUser(limit = 30): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const now = new Date().toISOString();
    const { data } = await supabaseAdmin().from("announcements")
      .select("*, sender:sender_id(id, name, avatar_url)")
      .eq("status", "published")
      .lte("starts_at", now)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    // Filter by audience visibility
    const filtered = ((data || []) as Array<Record<string, unknown>>).filter((a) => {
      if (a.audience_type === "all") return true;
      if (a.audience_type === "role") return (a.audience_roles as string[] | undefined)?.includes(me.role);
      if (a.audience_type === "user") return (a.audience_user_ids as string[] | undefined)?.includes(me.id);
      if (a.audience_type === "portal") return (a.audience_roles as string[] | undefined)?.includes(me.role);
      return me.role === "super_admin" || (a.sender_id as string) === me.id;
    }).filter((a) => !a.expires_at || new Date(a.expires_at as string) >= new Date());
    return { ok: true, data: filtered };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getAnnouncement(id: string): Promise<R<Record<string, unknown>>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin().from("announcements")
      .select("*, sender:sender_id(id, name, avatar_url, role)").eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Not found" };
    // Record read
    await supabaseAdmin().from("announcement_reads").upsert({
      announcement_id: id, user_id: me.id, opened_at: new Date().toISOString(),
    }, { onConflict: "announcement_id,user_id", ignoreDuplicates: true });
    return { ok: true, data: data as Record<string, unknown> };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function confirmAnnouncement(id: string, action: "read" | "comply" | "dismiss" = "read"): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("announcement_confirmations").upsert({
      announcement_id: id, user_id: me.id, action, confirmed_at: new Date().toISOString(),
    }, { onConflict: "announcement_id,user_id" });
    revalidatePath(`/announcements/${id}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function voteOnPoll(id: string, optionIndex: number): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("announcement_poll_votes").upsert({
      announcement_id: id, user_id: me.id, option_index: optionIndex, voted_at: new Date().toISOString(),
    }, { onConflict: "announcement_id,user_id" });
    revalidatePath(`/announcements/${id}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getAnnouncementAnalytics(id: string): Promise<R<{
  delivered: number; opened: number; confirmed: number; pollVotes: Array<{ option: number; count: number }>;
  recentReads: Array<{ user_id: string; opened_at: string }>;
}>> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    const { data: ann } = await sb.from("announcements").select("sender_id, audience_type, audience_roles, audience_user_ids, poll_options").eq("id", id).maybeSingle();
    if (!ann) return { ok: false, error: "Not found" };
    if (ann.sender_id !== me.id && me.role !== "super_admin" && me.role !== "admin") return { ok: false, error: "Not authorized" };

    const [readsRes, confRes, votesRes] = await Promise.all([
      sb.from("announcement_reads").select("user_id, opened_at", { count: "exact" }).eq("announcement_id", id).order("opened_at", { ascending: false }).limit(20),
      sb.from("announcement_confirmations").select("*", { count: "exact", head: true }).eq("announcement_id", id),
      sb.from("announcement_poll_votes").select("option_index").eq("announcement_id", id),
    ]);
    const opened = readsRes.count || 0;
    const confirmed = confRes.count || 0;
    // Estimate delivered via audience size
    let delivered = 0;
    if (ann.audience_type === "all") {
      const { count } = await sb.from("users").select("*", { count: "exact", head: true }).eq("status", "active");
      delivered = count || 0;
    } else if (ann.audience_type === "role") {
      const { count } = await sb.from("users").select("*", { count: "exact", head: true }).in("role", (ann.audience_roles as string[]) || []);
      delivered = count || 0;
    } else {
      delivered = ((ann.audience_user_ids as string[]) || []).length;
    }
    const pollCounts = new Map<number, number>();
    for (const v of ((votesRes.data || []) as Array<{ option_index: number }>)) pollCounts.set(v.option_index, (pollCounts.get(v.option_index) || 0) + 1);
    const pollVotes = Array.from(pollCounts.entries()).map(([option, count]) => ({ option, count }));
    return { ok: true, data: { delivered, opened, confirmed, pollVotes, recentReads: (readsRes.data || []) as Array<{ user_id: string; opened_at: string }> } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function deleteAnnouncement(id: string): Promise<R> {
  try {
    const me = await requireMe();
    const { data: ann } = await supabaseAdmin().from("announcements").select("sender_id").eq("id", id).maybeSingle();
    if (!ann) return { ok: false, error: "Not found" };
    if (ann.sender_id !== me.id && me.role !== "super_admin") return { ok: false, error: "Not authorized" };
    await supabaseAdmin().from("announcements").update({ status: "archived" }).eq("id", id);
    revalidatePath("/announcements"); revalidatePath("/admin/announcement-control");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/* Super admin only — permission management */
export async function updateRolePermission(role: string, input: { canSend?: boolean; allowedAudiences?: string[]; maxPriority?: Priority }): Promise<R> {
  try {
    const me = await requireMe();
    if (me.role !== "super_admin") return { ok: false, error: "Super admin only" };
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.canSend !== undefined) row.can_send = input.canSend;
    if (input.allowedAudiences) row.allowed_audiences = input.allowedAudiences;
    if (input.maxPriority) row.max_priority = input.maxPriority;
    await supabaseAdmin().from("announcement_permissions").update(row).eq("role", role);
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Announcement permission for ${role} updated`,
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "announcement_permission", entityId: role, metadata: input,
    });
    revalidatePath("/admin/announcement-control");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listAllAnnouncements(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    if (me.role !== "super_admin" && me.role !== "admin") return { ok: false, error: "Admin only" };
    const { data } = await supabaseAdmin().from("announcements")
      .select("*, sender:sender_id(name, avatar_url, role)")
      .order("created_at", { ascending: false }).limit(200);
    return { ok: true, data: (data || []) as Array<Record<string, unknown>> };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listAllPermissions(): Promise<R<Array<{ role: string; can_send: boolean; allowed_audiences: string[]; max_priority: Priority }>>> {
  try {
    const me = await requireMe();
    if (me.role !== "super_admin") return { ok: false, error: "Super admin only" };
    const { data } = await supabaseAdmin().from("announcement_permissions").select("*").order("role");
    return { ok: true, data: (data || []) as Array<{ role: string; can_send: boolean; allowed_audiences: string[]; max_priority: Priority }> };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Called by the client takeover provider — returns undismissed high/critical announcements. */
export async function listActiveTakeovers(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const now = new Date().toISOString();
    const sb = supabaseAdmin();
    const { data: anns } = await sb.from("announcements")
      .select("*, sender:sender_id(name, avatar_url)")
      .in("priority", ["high", "critical"])
      .eq("status", "published")
      .lte("starts_at", now)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    const visible = ((anns || []) as Array<Record<string, unknown>>).filter((a) => {
      if (a.audience_type === "all") return true;
      if (a.audience_type === "role") return (a.audience_roles as string[] | undefined)?.includes(me.role);
      if (a.audience_type === "user") return (a.audience_user_ids as string[] | undefined)?.includes(me.id);
      if (a.audience_type === "portal") return (a.audience_roles as string[] | undefined)?.includes(me.role);
      return me.role === "super_admin";
    }).filter((a) => !a.expires_at || new Date(a.expires_at as string) >= new Date());
    // Exclude already-confirmed
    const ids = visible.map((a) => a.id as string);
    if (ids.length === 0) return { ok: true, data: [] };
    const { data: confs } = await sb.from("announcement_confirmations").select("announcement_id").in("announcement_id", ids).eq("user_id", me.id);
    const confirmed = new Set(((confs || []) as Array<{ announcement_id: string }>).map((c) => c.announcement_id));
    return { ok: true, data: visible.filter((a) => !confirmed.has(a.id as string)) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
