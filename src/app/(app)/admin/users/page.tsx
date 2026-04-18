import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminUsersClient from "./admin-users-client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["admin", "super_admin"];

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
  last_active_at: string | null;
  is_suspended: boolean;
  track: string | null;
  cohort: string | null;
}

export default async function AdminUsersPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (!ADMIN_ROLES.includes(me.role)) redirect("/dashboard");

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select("id, name, email, role, avatar_url, xp, level, streak, performance, created_at, last_active_at, is_suspended, track, cohort")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return (
      <div style={{ padding: 24, color: "#EF5350" }}>
        Error loading users: {error.message}
      </div>
    );
  }

  return <AdminUsersClient users={(data as AdminUserRow[]) || []} />;
}
