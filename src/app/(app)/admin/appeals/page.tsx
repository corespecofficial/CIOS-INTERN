import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { adminGetAppeals, adminGetAppealStats } from "@/app/actions/compliance-appeals";
import { AdminAppealsClient } from "./admin-appeals-client";

export const dynamic = "force-dynamic";

export default async function AdminAppealsPage() {
  const me = await getCurrentDbUser();
  if (!me || !["admin", "super_admin"].includes(me.role)) redirect("/dashboard");

  const [appealsRes, statsRes] = await Promise.all([
    adminGetAppeals(),
    adminGetAppealStats(),
  ]);

  const appeals = appealsRes.ok && appealsRes.data ? appealsRes.data : [];
  const stats =
    statsRes.ok && statsRes.data
      ? statsRes.data
      : { pending: 0, approvedToday: 0, rejectedToday: 0, total: 0 };

  return <AdminAppealsClient appeals={appeals} stats={stats} />;
}
