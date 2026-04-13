import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { getGlobalMessagingPolicy } from "@/app/actions/messaging-privacy";
import { ControlClient } from "./control-client";

export const dynamic = "force-dynamic";

export default async function MessageControlPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const sb = supabaseAdmin();
  const [policyRes, { data: mutedUsers }] = await Promise.all([
    getGlobalMessagingPolicy(),
    sb.from("messaging_settings")
      .select("user_id, muted_until, banned_until, users:user_id(name, intern_id, role, avatar_url)")
      .or("muted_until.gt.now(),banned_until.gt.now()").limit(100),
  ]);

  return <ControlClient
    isSuperAdmin={me.role === "super_admin"}
    policy={(policyRes.ok ? policyRes.data : {}) as Record<string, unknown>}
    muted={(mutedUsers || []) as Array<Record<string, unknown>>}
  />;
}
