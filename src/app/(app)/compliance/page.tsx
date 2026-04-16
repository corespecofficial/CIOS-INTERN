import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMyAssignedTasks } from "@/app/actions/compliance-tasks";
import { getMyComplianceStatus } from "@/app/actions/compliance-fines";
import ComplianceClient from "./compliance-client";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [tasksRes, statusRes] = await Promise.all([
    getMyAssignedTasks(),
    getMyComplianceStatus(),
  ]);

  const tasks = tasksRes.ok && tasksRes.data ? tasksRes.data : [];
  const status = statusRes.ok && statusRes.data
    ? statusRes.data
    : {
        pendingTasks: [],
        unpaidFines: [],
        totalUnpaidAmount: 0,
        activeSuspension: null,
        violationCount: 0,
        isBlocked: false,
        blockReason: null,
      };

  return <ComplianceClient tasks={tasks} status={status} />;
}
