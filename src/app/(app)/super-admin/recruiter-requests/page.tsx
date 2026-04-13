import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { RecruiterRequestsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function RecruiterRequestsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "super_admin") redirect("/dashboard");
  const sb = supabaseAdmin();
  const [{ data: requests }, { data: pendingProfiles }] = await Promise.all([
    sb.from("recruiter_requests").select("*").order("created_at", { ascending: false }).limit(200),
    sb.from("recruiter_profiles")
      .select("user_id, company_name, recruiter_type, approval_status, created_at, users:user_id(name, email, avatar_url)")
      .in("approval_status", ["pending", "rejected"]).order("created_at", { ascending: false }),
  ]);
  return <RecruiterRequestsClient requests={requests || []} pending={pendingProfiles || []} />;
}
