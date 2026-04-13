"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

export interface SidebarBadges {
  notifications: number;
  messages: number;
  announcements: number;
  contactRequests: number;
  applications: number;
}

const EMPTY: SidebarBadges = { notifications: 0, messages: 0, announcements: 0, contactRequests: 0, applications: 0 };

/** Cheap, parallel counter fetch for sidebar badge display. Never throws. */
export async function getSidebarBadges(): Promise<SidebarBadges> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return EMPTY;
    const sb = supabaseAdmin();

    const safe = async <T,>(p: PromiseLike<T>, fb: T): Promise<T> => { try { return await p; } catch { return fb; } };

    const [notifRes, msgRes, annRes, reqRes, appRes] = await Promise.all([
      // Unread in-app notifications
      safe(
        sb.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", me.id).is("read_at", null),
        { count: 0 } as { count: number },
      ),
      // Total unread message count across rooms (chat_room_members.unread_count if it exists, else fallback to 0)
      safe(
        sb.from("chat_room_members").select("unread_count").eq("user_id", me.id),
        { data: [] } as { data: Array<{ unread_count: number }> },
      ),
      // Unread / unconfirmed visible announcements (matching audience and not yet confirmed)
      safe(announcementsUnread(me.id, me.role), 0),
      // Pending contact requests sent to this user (admins only) — for everyone, count pending I sent that have updates
      me.role === "admin" || me.role === "super_admin"
        ? safe(sb.from("contact_requests").select("*", { count: "exact", head: true }).eq("status", "pending"), { count: 0 } as { count: number })
        : Promise.resolve({ count: 0 }),
      // Recruiter: new applications
      me.role === "recruiter"
        ? safe(
            sb.from("opportunity_applications").select("*, opportunity:opportunity_id!inner(recruiter_id)", { count: "exact", head: true }).eq("status", "submitted").eq("opportunity.recruiter_id", me.id),
            { count: 0 } as { count: number },
          )
        : Promise.resolve({ count: 0 }),
    ]);

    const messages = ((msgRes.data as Array<{ unread_count: number }> | null) || []).reduce((s, r) => s + (r.unread_count || 0), 0);

    return {
      notifications: notifRes.count || 0,
      messages,
      announcements: typeof annRes === "number" ? annRes : 0,
      contactRequests: reqRes.count || 0,
      applications: appRes.count || 0,
    };
  } catch { return EMPTY; }
}

async function announcementsUnread(userId: string, role: string): Promise<number> {
  try {
    const sb = supabaseAdmin();
    const now = new Date().toISOString();
    const { data: anns } = await sb.from("announcements")
      .select("id, audience_type, audience_roles, audience_user_ids, expires_at")
      .eq("status", "published").lte("starts_at", now);
    const visible = ((anns || []) as Array<{ id: string; audience_type: string; audience_roles: string[] | null; audience_user_ids: string[] | null; expires_at: string | null }>).filter((a) => {
      if (a.audience_type === "all") return true;
      if (a.audience_type === "role" || a.audience_type === "portal") return (a.audience_roles || []).includes(role);
      if (a.audience_type === "user") return (a.audience_user_ids || []).includes(userId);
      return role === "super_admin";
    }).filter((a) => !a.expires_at || new Date(a.expires_at) >= new Date());
    if (visible.length === 0) return 0;
    const ids = visible.map((a) => a.id);
    const [{ data: reads }, { data: confs }] = await Promise.all([
      sb.from("announcement_reads").select("announcement_id").in("announcement_id", ids).eq("user_id", userId),
      sb.from("announcement_confirmations").select("announcement_id").in("announcement_id", ids).eq("user_id", userId),
    ]);
    const seen = new Set([
      ...((reads || []) as Array<{ announcement_id: string }>).map((r) => r.announcement_id),
      ...((confs || []) as Array<{ announcement_id: string }>).map((c) => c.announcement_id),
    ]);
    return visible.filter((a) => !seen.has(a.id)).length;
  } catch { return 0; }
}
