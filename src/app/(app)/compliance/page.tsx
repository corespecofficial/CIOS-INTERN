import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMyAssignedTasks } from "@/app/actions/compliance-tasks";
import { getMyComplianceStatus } from "@/app/actions/compliance-fines";
import ComplianceClient from "./compliance-client";
import { settleFlutterwaveReturn } from "@/app/actions/payments/initiate-topup";

export const dynamic = "force-dynamic";

export default async function CompliancePage({ searchParams }: { searchParams: Promise<{ payment_ref?: string; tx_ref?: string; transaction_id?: string; status?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const query = await searchParams;
  const reference = query.payment_ref || query.tx_ref;
  if (query.status === "successful" && reference && query.transaction_id) {
    await settleFlutterwaveReturn(reference, query.transaction_id);
  }

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
