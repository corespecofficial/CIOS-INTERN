import {
  countUsers,
  countActive24h,
  countPendingFines,
  sumRevenue,
  listUsersForAdmin,
  recentAuditLogs,
  countUsersByRole,
} from "@/lib/db";
import { AdminDashboard } from "@/app/(app)/dashboard/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [total, active, revenue, fines, users, audits, byRole] = await Promise.all([
    countUsers(),
    countActive24h(),
    sumRevenue(),
    countPendingFines(),
    listUsersForAdmin(25),
    recentAuditLogs(8),
    countUsersByRole(),
  ]);

  const internsCount = (byRole["intern"] || 0) + (byRole["team_lead"] || 0);

  return (
    <AdminDashboard
      stats={{ interns: internsCount, activeNow: active, revenue, pendingFines: fines, total }}
      users={users}
      audits={audits}
    />
  );
}
