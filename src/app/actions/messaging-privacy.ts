"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { pushNotification } from "@/app/actions/notifications";
import { canMessage, listAllowedContacts, maskIdentity } from "@/lib/messaging-privacy";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

async function requireMe() {
  const me = await getCurrentDbUser();
  if (!me) throw new Error("Unauthorized");
  return me;
}

async function requireAdmin() {
  const me = await requireMe();
  if (me.role !== "admin" && me.role !== "super_admin") throw new Error("Admin only");
  return me;
}

/** List my allowed contacts with masked identities. */
export async function listMyContacts(): Promise<R<Array<{ id: string; displayName: string; internId: string | null; avatarUrl: string | null; role: string; masked: boolean; lastSeen: string | null }>>> {
  try {
    const me = await requireMe();
    const ids = await listAllowedContacts(me.id);
    if (ids.length === 0) return { ok: true, data: [] };
    const { data: users } = await supabaseAdmin().from("users").select("id, last_seen").in("id", ids);
    const out: Array<{ id: string; displayName: string; internId: string | null; avatarUrl: string | null; role: string; masked: boolean; lastSeen: string | null }> = [];
    for (const u of (users || []) as Array<{ id: string; last_seen: string | null }>) {
      const masked = await maskIdentity(me.id, u.id);
      if (masked) out.push({ ...masked, lastSeen: u.last_seen });
    }
    return { ok: true, data: out };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Admin: allocate a contact pair between two users. */
export async function allocateContact(userA: string, userB: string, options: { allowFiles?: boolean; allowVoice?: boolean; note?: string } = {}): Promise<R> {
  try {
    const me = await requireAdmin();
    if (userA === userB) return { ok: false, error: "Cannot pair a user with themselves" };
    const [a, b] = [userA, userB].sort();
    const sb = supabaseAdmin();
    const { error } = await sb.from("contact_permissions").upsert({
      user_a: a, user_b: b,
      granted_by: me.id, granted_at: new Date().toISOString(), revoked_at: null,
      allow_files: options.allowFiles ?? true,
      allow_voice: options.allowVoice ?? true,
      source: "admin", note: options.note || null,
    }, { onConflict: "user_a,user_b" });
    if (error) return { ok: false, error: error.message };
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: `Allocated contact pair`,
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "contact_permission", entityId: `${a}:${b}`,
    });
    await pushNotification({ userId: userA, kind: "system", title: "💬 New contact assigned", body: "You can now message one of your peers.", url: "/messages/contacts" }).catch(() => {});
    await pushNotification({ userId: userB, kind: "system", title: "💬 New contact assigned", body: "You can now message one of your peers.", url: "/messages/contacts" }).catch(() => {});
    revalidatePath("/admin/contact-allocation"); revalidatePath("/messages/contacts");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function revokeContact(userA: string, userB: string): Promise<R> {
  try {
    const me = await requireAdmin();
    const [a, b] = [userA, userB].sort();
    await supabaseAdmin().from("contact_permissions").update({ revoked_at: new Date().toISOString() }).eq("user_a", a).eq("user_b", b);
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: "Revoked contact pair",
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "contact_permission", entityId: `${a}:${b}`, severity: "warning",
    });
    revalidatePath("/admin/contact-allocation"); revalidatePath("/messages/contacts");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function bulkAllocateByRole(fromUserId: string, targetRole: string): Promise<R<{ count: number }>> {
  try {
    const me = await requireAdmin();
    const { data } = await supabaseAdmin().from("users").select("id").eq("role", targetRole).neq("id", fromUserId);
    const ids = ((data || []) as Array<{ id: string }>).map((u) => u.id);
    for (const id of ids) {
      const [a, b] = [fromUserId, id].sort();
      await supabaseAdmin().from("contact_permissions").upsert({
        user_a: a, user_b: b, granted_by: me.id, source: "admin_bulk", revoked_at: null,
      }, { onConflict: "user_a,user_b" });
    }
    revalidatePath("/admin/contact-allocation");
    return { ok: true, data: { count: ids.length } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/**
 * Intern-side: request contact by Intern ID.
 *
 * Two modes:
 *  - "admin" (default) → admin reviews, approves/rejects. Classic flow.
 *  - "peer"            → LinkedIn-style. Target intern gets the request and
 *                        approves/rejects themselves; admin isn't involved.
 */
export async function sendContactRequest(
  targetInternId: string,
  reason?: string,
  mode: "admin" | "peer" = "admin",
): Promise<R<{ id: string }>> {
  try {
    const me = await requireMe();
    const id = targetInternId.trim().toUpperCase();
    if (!id) return { ok: false, error: "Intern ID required" };
    const sb = supabaseAdmin();
    const { data: target } = await sb.from("users").select("id, name, intern_id").eq("intern_id", id).maybeSingle();
    if (!target) return { ok: false, error: "Intern ID not found" };
    if (target.id === me.id) return { ok: false, error: "That's your own ID" };
    if (await canMessage(me.id, target.id)) return { ok: false, error: "You're already connected" };

    const { data: existing } = await sb.from("contact_requests").select("id")
      .eq("requester_id", me.id).eq("target_user_id", target.id).eq("status", "pending").maybeSingle();
    if (existing) return { ok: false, error: "A request is already pending" };

    // Try inserting with mode column; fall back gracefully if the migration
    // hasn't run yet (Supabase schema cache error). Admin-mode requests still
    // work without the column; only peer mode needs it.
    let insertedId: string | null = null;
    const { data: inserted, error } = await sb.from("contact_requests").insert({
      requester_id: me.id, target_intern_id: id, target_user_id: target.id,
      reason: reason || null, status: "pending", mode,
    }).select("id").single();
    if (error) {
      if (error.message?.includes("'mode'") || error.message?.includes("schema cache")) {
        if (mode === "peer") {
          return { ok: false, error: "Peer connect needs a DB migration. Admin: run 'ALTER TABLE contact_requests ADD COLUMN IF NOT EXISTS mode text DEFAULT ''admin'' CHECK (mode IN (''admin'',''peer''));' in Supabase." };
        }
        // For admin mode, retry without the column
        const fallback = await sb.from("contact_requests").insert({
          requester_id: me.id, target_intern_id: id, target_user_id: target.id,
          reason: reason || null, status: "pending",
        }).select("id").single();
        if (fallback.error) return { ok: false, error: fallback.error.message };
        insertedId = (fallback.data as { id: string }).id;
      } else {
        return { ok: false, error: error.message };
      }
    } else {
      insertedId = (inserted as { id: string }).id;
    }

    if (mode === "peer") {
      // Notify the target intern directly — LinkedIn-style
      await pushNotification({
        userId: target.id, kind: "system",
        title: `🤝 ${me.name || "Someone"} wants to connect`,
        body: reason || "Tap to review and accept or decline",
        url: "/messages/requests",
      }).catch(() => {});
    } else {
      // Notify admins
      const { data: admins } = await sb.from("users").select("id").in("role", ["admin", "super_admin"]).limit(10);
      for (const a of (admins || []) as Array<{ id: string }>) {
        await pushNotification({
          userId: a.id, kind: "system",
          title: "📨 Contact request",
          body: `${me.name || "A user"} wants to message ${id}`,
          url: "/admin/contact-allocation",
        }).catch(() => {});
      }
    }
    revalidatePath("/messages/requests"); revalidatePath("/admin/contact-allocation");
    return { ok: true, data: { id: insertedId! } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** List peer requests sent TO me (LinkedIn-style incoming). */
export async function listIncomingPeerRequests(): Promise<R<Array<{ id: string; requester_id: string; requester_name: string | null; requester_avatar: string | null; requester_intern_id: string | null; reason: string | null; created_at: string }>>> {
  try {
    const me = await requireMe();
    const q = supabaseAdmin().from("contact_requests")
      .select("id, requester_id, reason, created_at, requester:requester_id(name, avatar_url, intern_id)")
      .eq("target_user_id", me.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    // If the mode column exists, filter to peer-mode. Otherwise return empty
    // (admin-mode requests aren't for the intern to review).
    let data: unknown = null;
    const first = await q.eq("mode", "peer");
    if (first.error && (first.error.message?.includes("'mode'") || first.error.message?.includes("schema cache"))) {
      return { ok: true, data: [] }; // migration not run yet — no peer requests possible
    }
    data = first.data;
    const rows = ((data || []) as Array<{ id: string; requester_id: string; reason: string | null; created_at: string; requester?: { name?: string | null; avatar_url?: string | null; intern_id?: string | null } | { name?: string | null; avatar_url?: string | null; intern_id?: string | null }[] | null }>).map((r) => {
      const u = Array.isArray(r.requester) ? r.requester[0] : r.requester;
      return {
        id: r.id, requester_id: r.requester_id,
        requester_name: u?.name || null,
        requester_avatar: u?.avatar_url || null,
        requester_intern_id: u?.intern_id || null,
        reason: r.reason, created_at: r.created_at,
      };
    });
    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Target intern responds to a peer request. No admin needed. */
export async function reviewPeerRequest(id: string, accept: boolean): Promise<R> {
  try {
    const me = await requireMe();
    const sb = supabaseAdmin();
    // Try with mode column first; fall back if migration not run
    let req: { requester_id: string; target_user_id: string; mode?: string } | null = null;
    const first = await sb.from("contact_requests")
      .select("requester_id, target_user_id, mode")
      .eq("id", id).eq("status", "pending").maybeSingle();
    if (first.error && (first.error.message?.includes("'mode'") || first.error.message?.includes("schema cache"))) {
      const fb = await sb.from("contact_requests")
        .select("requester_id, target_user_id")
        .eq("id", id).eq("status", "pending").maybeSingle();
      if (fb.error) return { ok: false, error: fb.error.message };
      req = fb.data as typeof req;
    } else if (first.error) {
      return { ok: false, error: first.error.message };
    } else {
      req = first.data as typeof req;
    }
    if (!req) return { ok: false, error: "Request not found" };
    const r = req;
    if (r.target_user_id !== me.id) return { ok: false, error: "Not your request to review" };
    // If mode column exists and it's not peer, reject. Otherwise (migration
    // not yet run) we trust the flow — only peer requests surface here anyway.
    if (r.mode && r.mode !== "peer") return { ok: false, error: "This request needs admin approval" };
    await sb.from("contact_requests").update({
      status: accept ? "approved" : "rejected",
      reviewed_by: me.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (accept) {
      // Create the bidirectional contact pair directly
      const [a, b] = [r.requester_id, r.target_user_id].sort();
      await sb.from("contact_permissions").upsert({
        user_a: a, user_b: b,
        granted_by: me.id, granted_at: new Date().toISOString(), revoked_at: null,
        allow_files: true, allow_voice: true,
        source: "peer", note: null,
      }, { onConflict: "user_a,user_b" });
    }
    // Let the requester know either way
    await pushNotification({
      userId: r.requester_id, kind: "system",
      title: accept ? `✅ ${me.name || "Someone"} accepted your connect` : "❌ Connect request declined",
      body: accept ? "You can now message each other." : "They declined your connect request.",
      url: accept ? "/messages/contacts" : "/messages/requests",
    }).catch(() => {});
    revalidatePath("/messages/requests"); revalidatePath("/messages/contacts");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listMyContactRequests(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin().from("contact_requests")
      .select("*, target:target_user_id(intern_id)").eq("requester_id", me.id).order("created_at", { ascending: false });
    return { ok: true, data: (data || []) as Array<Record<string, unknown>> };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function listPendingRequestsForAdmin(): Promise<R<Array<Record<string, unknown>>>> {
  try {
    await requireAdmin();
    const { data } = await supabaseAdmin().from("contact_requests")
      .select("*, requester:requester_id(id, name, intern_id, role), target:target_user_id(id, name, intern_id, role)")
      .eq("status", "pending").order("created_at", { ascending: false });
    return { ok: true, data: (data || []) as Array<Record<string, unknown>> };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function reviewContactRequest(id: string, approve: boolean, adminNote?: string): Promise<R> {
  try {
    const me = await requireAdmin();
    const sb = supabaseAdmin();
    const { data: req } = await sb.from("contact_requests").select("requester_id, target_user_id").eq("id", id).maybeSingle();
    if (!req) return { ok: false, error: "Request not found" };
    await sb.from("contact_requests").update({
      status: approve ? "approved" : "rejected",
      reviewed_by: me.id, reviewed_at: new Date().toISOString(), admin_note: adminNote || null,
    }).eq("id", id);
    if (approve) {
      await allocateContact(req.requester_id, req.target_user_id, { note: `Via request ${id}` });
    }
    await pushNotification({
      userId: req.requester_id, kind: "system",
      title: approve ? "✅ Contact approved" : "❌ Contact request declined",
      body: approve ? "You can now message this contact." : adminNote || "Reach out to support if you need help.",
      url: approve ? "/messages/contacts" : "/messages/requests",
    }).catch(() => {});
    revalidatePath("/admin/contact-allocation"); revalidatePath("/messages/requests");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** User messaging settings */
export interface MySettings {
  privacy_level: "anonymous" | "partial" | "full";
  who_can_message: "admin_only" | "assigned" | "contacts";
  read_receipts: boolean;
  typing_indicator: boolean;
  display_mode: "name" | "id_only" | "nickname" | "role";
  nickname: string | null;
}

export async function getMyMessagingSettings(): Promise<R<MySettings>> {
  try {
    const me = await requireMe();
    const { data } = await supabaseAdmin().from("messaging_settings").select("*").eq("user_id", me.id).maybeSingle();
    return {
      ok: true,
      data: (data as MySettings) || {
        privacy_level: "partial", who_can_message: "assigned",
        read_receipts: true, typing_indicator: true, display_mode: "name", nickname: null,
      },
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateMyMessagingSettings(patch: Partial<MySettings>): Promise<R> {
  try {
    const me = await requireMe();
    await supabaseAdmin().from("messaging_settings").upsert({
      user_id: me.id, ...patch, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    revalidatePath("/settings"); revalidatePath("/messages");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Admin global policy */
export async function getGlobalMessagingPolicy(): Promise<R<Record<string, unknown>>> {
  try {
    await requireAdmin();
    const { data } = await supabaseAdmin().from("messaging_global_policy").select("*").eq("id", 1).maybeSingle();
    return { ok: true, data: (data || {}) as Record<string, unknown> };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function updateGlobalMessagingPolicy(patch: { intern_messaging_enabled?: boolean; allow_files?: boolean; allow_voice?: boolean; allow_group_chats?: boolean; retention_days?: number; rate_limit_per_min?: number }): Promise<R> {
  try {
    const me = await requireAdmin();
    if (me.role !== "super_admin") return { ok: false, error: "Super admin only" };
    await supabaseAdmin().from("messaging_global_policy").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", 1);
    await logAudit({
      actionCode: "admin.settings_changed", category: "admin",
      summary: "Global messaging policy updated",
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "messaging_policy", entityId: "global", metadata: patch,
    });
    revalidatePath("/admin/message-control");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function muteUser(userId: string, minutes: number): Promise<R> {
  try {
    const me = await requireAdmin();
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    await supabaseAdmin().from("messaging_settings").upsert({
      user_id: userId, muted_until: until, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    await logAudit({
      actionCode: "admin.user_suspended", category: "admin",
      summary: `Muted messaging for ${minutes}m`,
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "user", entityId: userId, severity: "warning",
    });
    revalidatePath("/admin/message-control");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function banFromMessaging(userId: string, permanent: boolean): Promise<R> {
  try {
    const me = await requireAdmin();
    const until = permanent ? new Date("2999-12-31T23:59:59Z").toISOString() : null;
    await supabaseAdmin().from("messaging_settings").upsert({
      user_id: userId, banned_until: until, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    await logAudit({
      actionCode: "admin.user_banned", category: "admin",
      summary: permanent ? "Banned from messaging" : "Lifted messaging ban",
      actorUserId: me.id, actorName: me.name, actorRole: me.role,
      entityType: "user", entityId: userId, severity: "critical",
    });
    revalidatePath("/admin/message-control");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
