import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { ComposerClient } from "./composer-client";

export const dynamic = "force-dynamic";

export default async function CreateAnnouncementPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  let perm: { allowed_audiences: string[]; max_priority: string; can_send: boolean } | null = null;
  try {
    const { data } = await supabaseAdmin().from("announcement_permissions").select("*").eq("role", me.role).maybeSingle();
    perm = data as { allowed_audiences: string[]; max_priority: string; can_send: boolean } | null;
  } catch {/* migration not run */}
  if (!perm?.can_send) redirect("/announcements");
  return <ComposerClient permission={perm} role={me.role} />;
}
