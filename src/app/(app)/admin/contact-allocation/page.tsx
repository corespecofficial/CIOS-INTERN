import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { listPendingRequestsForAdmin } from "@/app/actions/messaging-privacy";
import { AllocationClient } from "./allocation-client";

export const dynamic = "force-dynamic";

export default async function ContactAllocationPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const sb = supabaseAdmin();
  const [{ data: users }, { data: perms }, reqRes] = await Promise.all([
    sb.from("users").select("id, name, email, role, intern_id, avatar_url").order("name").limit(500),
    sb.from("contact_permissions").select("user_a, user_b, granted_at, source, note").is("revoked_at", null).order("granted_at", { ascending: false }).limit(200),
    listPendingRequestsForAdmin(),
  ]);
  return <AllocationClient
    users={(users || []) as Array<{ id: string; name: string; email: string; role: string; intern_id: string | null; avatar_url: string | null }>}
    perms={(perms || []) as Array<{ user_a: string; user_b: string; granted_at: string; source: string; note: string | null }>}
    requests={reqRes.ok ? (reqRes.data as Array<Record<string, unknown>>) : []}
  />;
}
