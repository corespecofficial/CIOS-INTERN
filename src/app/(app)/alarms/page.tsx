import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { AlarmsClient } from "./alarms-client";

export const dynamic = "force-dynamic";

export default async function AlarmsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  let alarms: Array<Record<string, unknown>> = [];
  try {
    const { data } = await supabaseAdmin().from("alarms").select("*").eq("user_id", me.id).order("time_of_day");
    alarms = data || [];
  } catch {/* table may not exist yet */}
  return <AlarmsClient initialAlarms={alarms} />;
}
