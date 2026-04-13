import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listAuditLogs, type AuditListFilters, type Severity, type Category } from "@/lib/audit";
import { AuditLogsClient } from "./audit-logs-client";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "admin" && me.role !== "super_admin") redirect("/dashboard");

  const sp = await searchParams;
  const filters: AuditListFilters = {
    search: sp.q || "",
    category: (sp.category as Category | undefined) || "",
    severity: (sp.severity as Severity | undefined) || "",
    success: (sp.success as "true" | "false" | undefined) || "",
    actionCode: sp.action || "",
    from: sp.from || "",
    to: sp.to || "",
    limit: 50,
    offset: parseInt(sp.offset || "0") || 0,
  };
  const { rows, total } = await listAuditLogs(filters);

  return <AuditLogsClient rows={rows} total={total} filters={filters} />;
}
