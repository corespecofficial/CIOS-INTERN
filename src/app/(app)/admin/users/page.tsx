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
  orgs?: Array<{ org_id: string; org_name: string; org_slug: string; role: string; member_id: string }>;
}

export interface ScopedOrg { id: string; slug: string; name: string }

export default async function AdminUsersPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");

  const sb = supabaseAdmin();

  // /admin/users is ALWAYS org-scoped. Platform-wide user listing
  // lives at /super-admin/users.
  //
  // Visibility map:
  //   - super_admin  → preview-mode: scoped to EVERY active org so
  //                    they can audit what each org admin sees.
  //   - admin / owner / org_admin → only the orgs they own/admin.
  //   - everyone else → bounced to /dashboard.
  let myOrgs: ScopedOrg[] = [];

  if (me.role === "super_admin") {
    const { data } = await sb
      .from("creative_orgs")
      .select("id, slug, name, status")
      .neq("status", "archived")
      .order("name", { ascending: true })
      .limit(500);
    myOrgs = ((data || []) as Array<{ id: string; slug: string; name: string; status: string }>).map((o) => ({
      id: o.id, slug: o.slug, name: o.name,
    }));
  } else {
    const { data: myOrgRows } = await sb
      .from("org_members")
      .select("org_id, role, creative_orgs!inner(id, slug, name, status)")
      .eq("user_id", me.id)
      .in("role", ["owner", "org_admin"])
      .eq("status", "active");
    type MyOrg = { org_id: string; role: string; creative_orgs: { id: string; slug: string; name: string; status: string } };
    myOrgs = ((myOrgRows || []) as unknown as MyOrg[])
      .filter((r) => r.creative_orgs.status !== "archived")
      .map((r) => ({ id: r.creative_orgs.id, slug: r.creative_orgs.slug, name: r.creative_orgs.name }));
  }

  // No orgs at all (the platform truly has none, OR the requester
  // owns/admins none and isn't super_admin) → bounce.
  if (myOrgs.length === 0) {
    if (me.role === "super_admin") {
      // Super-admin landed here on a brand-new platform with zero orgs.
      // Show an empty-state instead of redirecting, so they can confirm
      // the page works — but no users to render either.
      return <AdminUsersClient users={[]} myOrgs={[]} />;
    }
    redirect("/dashboard");
  }

  let users: AdminUserRow[] = [];

  // STRICT scoping: only users with an active org_members row in one
  // of the requester's owned/admined orgs are eligible. Anyone at
  // the platform level (super_admin / admin / public_user / intern)
  // who isn't a member of any of these orgs is intentionally NOT
  // visible. The .in("id", uniqueUserIds) below is the hard wall.
  const orgIds = myOrgs.map((o) => o.id);
  // Pull org_members.id too — updateMemberRole is keyed on it.
  const { data: memberRows } = await sb
    .from("org_members")
    .select("id, user_id, org_id, role")
    .in("org_id", orgIds)
    .eq("status", "active")
    .limit(2000);
  type Row = { id: string; user_id: string; org_id: string; role: string };
  const memberRowsTyped = (memberRows || []) as Row[];

  const uniqueUserIds = Array.from(new Set(memberRowsTyped.map((r) => r.user_id)));
  if (uniqueUserIds.length > 0) {
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
      arr.push({ org_id: r.org_id, org_name: o.name, org_slug: o.slug, role: r.role, member_id: r.id });
      orgsByUser.set(r.user_id, arr);
    }
    // Mask platform-level role so we never leak "this user is
    // super_admin elsewhere on the platform". Their standing on this
    // page is conveyed by the per-org role selector below.
    users = ((userRows || []) as AdminUserRow[]).map((u) => ({
      ...u,
      role: "member",
      level: levelFromXP(u.xp ?? 0),
      orgs: orgsByUser.get(u.id) || [],
    }));
  }

  return <AdminUsersClient users={users} myOrgs={myOrgs} />;
}
