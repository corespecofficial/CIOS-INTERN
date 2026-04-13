import { supabaseAdmin } from "@/lib/db";

/** Does user A have permission to message user B? Admins bypass. */
export async function canMessage(fromUserId: string, toUserId: string): Promise<boolean> {
  if (fromUserId === toUserId) return true;
  const sb = supabaseAdmin();
  const [meRes, themRes] = await Promise.all([
    sb.from("users").select("role").eq("id", fromUserId).maybeSingle(),
    sb.from("users").select("role").eq("id", toUserId).maybeSingle(),
  ]);
  const myRole = meRes.data?.role;
  if (myRole === "super_admin" || myRole === "admin") return true;
  if (themRes.data?.role === "super_admin" || themRes.data?.role === "admin") return true;

  // Check mute/ban
  const { data: settings } = await sb.from("messaging_settings").select("banned_until, muted_until").eq("user_id", fromUserId).maybeSingle();
  const now = new Date();
  if (settings?.banned_until && new Date(settings.banned_until) > now) return false;
  if (settings?.muted_until && new Date(settings.muted_until) > now) return false;

  // Check bidirectional permission row
  const { data: perm } = await sb.from("contact_permissions").select("id, revoked_at")
    .or(`and(user_a.eq.${fromUserId},user_b.eq.${toUserId}),and(user_a.eq.${toUserId},user_b.eq.${fromUserId})`)
    .maybeSingle();
  if (perm && !perm.revoked_at) return true;
  return false;
}

/** List contact user IDs that a given user is allowed to message. */
export async function listAllowedContacts(userId: string): Promise<string[]> {
  const sb = supabaseAdmin();
  const { data: me } = await sb.from("users").select("role").eq("id", userId).maybeSingle();
  if (me?.role === "super_admin" || me?.role === "admin") {
    const { data: all } = await sb.from("users").select("id").neq("id", userId);
    return (all || []).map((u) => (u as { id: string }).id);
  }
  const { data: perms } = await sb.from("contact_permissions").select("user_a, user_b")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .is("revoked_at", null);
  const out = new Set<string>();
  for (const p of (perms || []) as Array<{ user_a: string; user_b: string }>) {
    if (p.user_a === userId) out.add(p.user_b);
    else out.add(p.user_a);
  }
  return Array.from(out);
}

/** Mask a user's identity based on the viewer's role and the target's privacy level. */
export interface MaskedIdentity {
  id: string;
  displayName: string;
  internId: string | null;
  avatarUrl: string | null;
  role: string;
  masked: boolean;
}

export async function maskIdentity(viewerId: string, targetId: string): Promise<MaskedIdentity | null> {
  const sb = supabaseAdmin();
  const [meRes, themRes, settingsRes] = await Promise.all([
    sb.from("users").select("role").eq("id", viewerId).maybeSingle(),
    sb.from("users").select("id, name, role, avatar_url, intern_id").eq("id", targetId).maybeSingle(),
    sb.from("messaging_settings").select("privacy_level, display_mode, nickname").eq("user_id", targetId).maybeSingle(),
  ]);
  if (!themRes.data) return null;
  const t = themRes.data as { id: string; name: string; role: string; avatar_url: string | null; intern_id: string | null };
  const settings = settingsRes.data as { privacy_level?: string; display_mode?: string; nickname?: string } | null;
  const viewerRole = meRes.data?.role;

  // Admins always see full identity
  if (viewerRole === "super_admin" || viewerRole === "admin") {
    return { id: t.id, displayName: t.name, internId: t.intern_id, avatarUrl: t.avatar_url, role: t.role, masked: false };
  }

  const mode = settings?.display_mode || "name";
  const privacy = settings?.privacy_level || "partial";
  if (privacy === "anonymous" || mode === "id_only") {
    return { id: t.id, displayName: t.intern_id || "Anonymous", internId: t.intern_id, avatarUrl: null, role: t.role, masked: true };
  }
  if (mode === "nickname" && settings?.nickname) {
    return { id: t.id, displayName: settings.nickname, internId: t.intern_id, avatarUrl: t.avatar_url, role: t.role, masked: true };
  }
  if (mode === "role") {
    const roleLabel = t.role.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return { id: t.id, displayName: `${roleLabel}${t.intern_id ? ` · ${t.intern_id}` : ""}`, internId: t.intern_id, avatarUrl: null, role: t.role, masked: true };
  }
  return { id: t.id, displayName: t.name, internId: t.intern_id, avatarUrl: t.avatar_url, role: t.role, masked: false };
}

export interface GlobalPolicy {
  intern_messaging_enabled: boolean;
  allow_files: boolean;
  allow_voice: boolean;
  allow_group_chats: boolean;
  retention_days: number;
  rate_limit_per_min: number;
}

export async function getGlobalPolicy(): Promise<GlobalPolicy> {
  try {
    const { data } = await supabaseAdmin().from("messaging_global_policy").select("*").eq("id", 1).maybeSingle();
    if (data) return data as GlobalPolicy;
  } catch {/* table may not exist yet */}
  return { intern_messaging_enabled: true, allow_files: true, allow_voice: true, allow_group_chats: true, retention_days: 365, rate_limit_per_min: 30 };
}
