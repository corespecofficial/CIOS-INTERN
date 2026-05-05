/**
 * /admin/users — scoped user list.
 *
 * Visibility rules:
 *   - super_admin → sees every user on the platform (the list is
 *     drawn straight from the users table).
 *   - admin / org_admin / owner → sees ONLY users who are active
 *     members of an org they personally own or admin. Non-staff
 *     admins should never have visibility into other tenants' users.
 *
 * The "scoped orgs" set is derived from org_members where the
 * requester's role is owner/org_admin. We then list every user_id
 * that has an org_members row in any of those orgs (deduped) and
 * pull their users-row in one query. No cross-tenant leakage.
 */

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { levelFromXP } from "@/lib/gamification-shared";
import AdminUsersClient from "./admin-users-client";

export const dynamic = "force-dynamic";

const PLATFORM_ADMIN_ROLES = ["admin", "super_admin"];

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  avatar_url: string | null;
  xp: number;
  level: number;
  streak: number;
  performance: number;
  created_at: string;
  last_seen: string | null;
  status: string;
  cohort_number: number | null;
  /** Org memberships for this user, scoped to orgs the requester
   *  has visibility into. Empty for super_admin platform-wide view. */
  orgs?: Array<{ org_id: string; org_name: string; org_slug: string; role: string }>;
}

export interface ScopedOrg { id: string; slug: string; name: string }

export default async function AdminUsersPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const sb = supabaseAdmin();

  // Determine scope: super_admin (platform), platform admin (also platform —
  // legacy), or org admin (only their orgs).
  const isSuperAdmin = me.role === "super_admin";
  const isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(me.role);

  // Pull orgs where the requester is owner/org_admin. This is what
  // gates non-super_admin visibility.
  const { data: myOrgRows } = await sb
    .from("org_members")
    .select("org_id, role, creative_orgs!inner(id, slug, name, status)")
    .eq("user_id", me.id)
    .in("role", ["owner", "org_admin"])
    .eq("status", "active");
  type MyOrg = { org_id: string; role: string; creative_orgs: { id: string; slug: string; name: string; status: string } };
  const myOrgs: ScopedOrg[] = ((myOrgRows || []) as unknown as MyOrg[])
    .filter((r) => r.creative_orgs.status !== "archived")
    .map((r) => ({ id: r.creative_orgs.id, slug: r.creative_orgs.slug, name: r.creative_orgs.name }));

  // Deny if the requester is neither a platform admin NOR an owner/
  // org_admin of any org. Without one of those, this page has nothing
  // useful to show and we shouldn't leak even the chrome.
  if (!isPlatformAdmin && myOrgs.length === 0) redirect("/dashboard");

  let users: AdminUserRow[] = [];

  if (isSuperAdmin) {
    // Platform-wide list — same as before.
    const { data, error } = await sb
      .from("users")
      .select("id, name, email, role, avatar_url, xp, level, streak, performance, created_at, last_seen, status, cohort_number")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      return <div style={{ padding: 24, color: "#EF5350", fontSize: 14 }}>Error loading users: {error.message}</div>;
    }
    users = ((data || []) as AdminUserRow[]).map((u) => ({ ...u, level: levelFromXP(u.xp ?? 0) }));
  } else {
    // Scoped to the requester's orgs. Two-step pull:
    //   1) every (user_id, org_id, role) in those orgs, active only;
    //   2) the users rows for that distinct user_id set.
    const orgIds = myOrgs.map((o) => o.id);
    const { data: memberRows } = await sb
      .from("org_members")
      .select("user_id, org_id, role")
      .in("org_id", orgIds)
      .eq("status", "active")
      .limit(2000);
    type Row = { user_id: string; org_id: string; role: string };
    const memberRowsTyped = (memberRows || []) as Row[];

    const uniqueUserIds = Array.from(new Set(memberRowsTyped.map((r) => r.user_id)));
    if (uniqueUserIds.length === 0) {
      users = [];
    } else {
      const { data: userRows, error: uErr } = await sb
        .from("users")
        .select("id, name, email, role, avatar_url, xp, level, streak, performance, created_at, last_seen, status, cohort_number")
        .in("id", uniqueUserIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (uErr) {
        return <div style={{ padding: 24, color: "#EF5350", fontSize: 14 }}>Error loading users: {uErr.message}</div>;
      }
      const orgById = new Map<string, ScopedOrg>(myOrgs.map((o) => [o.id, o]));
      const orgsByUser = new Map<string, AdminUserRow["orgs"]>();
      for (const r of memberRowsTyped) {
        const o = orgById.get(r.org_id);
        if (!o) continue;
        const arr = orgsByUser.get(r.user_id) || [];
        arr.push({ org_id: r.org_id, org_name: o.name, org_slug: o.slug, role: r.role });
        orgsByUser.set(r.user_id, arr);
      }
      users = ((userRows || []) as AdminUserRow[]).map((u) => ({
        ...u,
        level: levelFromXP(u.xp ?? 0),
        orgs: orgsByUser.get(u.id) || [],
      }));
    }
  }

  return <AdminUsersClient users={users} myOrgs={isSuperAdmin ? null : myOrgs} />;
}
