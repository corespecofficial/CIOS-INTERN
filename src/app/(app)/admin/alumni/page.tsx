import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { AdminAlumniClient } from "./admin-alumni-client";

export const dynamic = "force-dynamic";

export default async function AdminAlumniPage() {
  const me = await getCurrentDbUser();
  if (!me || !["admin", "super_admin"].includes(me.role)) redirect("/dashboard");

  const sb = supabaseAdmin();
  const [{ data: interns }, { data: pendingStories }] = await Promise.all([
    sb.from("users").select("id, name, avatar_url, email, xp, performance, level, role, graduated_at, cohort_number").in("role", ["intern", "alumni"]).order("xp", { ascending: false }).limit(100),
    sb.from("alumni_stories").select("id, user_id, title, body, company, role, status, created_at, author:users!alumni_stories_user_id_fkey(name,avatar_url)").eq("status", "pending").order("created_at", { ascending: true }),
  ]);

  return (
    <AdminAlumniClient
      interns={(interns || []) as Array<{ id: string; name: string | null; avatar_url: string | null; email: string | null; xp: number; performance: number; level: number; role: string; graduated_at: string | null; cohort_number: number | null }>}
      pendingStories={(pendingStories || []) as Array<{ id: string; user_id: string; title: string; body: string; company: string | null; role: string | null; status: string; created_at: string; author?: { name?: string | null; avatar_url?: string | null } | null }>}
    />
  );
}
