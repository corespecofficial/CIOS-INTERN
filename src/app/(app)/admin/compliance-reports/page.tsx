import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { redirect } from "next/navigation";
import { ComplianceClient } from "./compliance-client";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const { data: history } = await supabaseAdmin()
    .from("compliance_exports")
    .select("id, generated_by, report_type, format, filters, row_count, created_at, users:generated_by(name)")
    .order("created_at", { ascending: false }).limit(30);

  return <ComplianceClient history={(history || []) as unknown as ComplianceHistoryRow[]} />;
}

export interface ComplianceHistoryRow {
  id: string; report_type: string; format: string; filters: Record<string, unknown>; row_count: number; created_at: string;
  users: { name: string } | null;
}
