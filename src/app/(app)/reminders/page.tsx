import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { RemindersClient } from "./reminders-client";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  let reminders: Array<Record<string, unknown>> = [];
  try {
    const { data } = await supabaseAdmin().from("reminders").select("*").eq("user_id", me.id).order("due_at", { ascending: true });
    reminders = data || [];
  } catch {/* table may not exist yet */}
  return <RemindersClient initial={reminders} />;
}
