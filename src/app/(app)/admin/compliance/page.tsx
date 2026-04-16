import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { adminGetAdminComplianceStats } from "@/app/actions/compliance-disciplinary";
import { adminGetAllFines } from "@/app/actions/compliance-fines";
import { adminGetActiveSuspensions } from "@/app/actions/compliance-suspensions";
import { getAdminTasks } from "@/app/actions/compliance-tasks";
import { AdminComplianceClient } from "./admin-compliance-client";

export const dynamic = "force-dynamic";

export default async function AdminCompliancePage() {
  const me = await getCurrentDbUser();
  if (!me || !["admin", "super_admin"].includes(me.role)) redirect("/dashboard");

  const [statsRes, finesRes, suspensionsRes, tasksRes] = await Promise.all([
    adminGetAdminComplianceStats(),
    adminGetAllFines(),
    adminGetActiveSuspensions(),
    getAdminTasks(),
  ]);

  const stats = statsRes.ok && statsRes.data
    ? statsRes.data
    : {
        totalTasks: 0,
        activeTasks: 0,
        missedToday: 0,
        totalUnpaidFines: 0,
        unpaidFineAmount: 0,
        activeSuspensions: 0,
        pendingAppeals: 0,
        atRiskUsers: 0,
      };

  return (
    <AdminComplianceClient
      stats={stats}
      fines={finesRes.ok && finesRes.data ? finesRes.data : []}
      suspensions={suspensionsRes.ok && suspensionsRes.data ? suspensionsRes.data : []}
      tasks={tasksRes.ok && tasksRes.data ? tasksRes.data : []}
    />
  );
}
