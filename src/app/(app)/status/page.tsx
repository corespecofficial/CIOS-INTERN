export const dynamic = "force-dynamic";

import { getCurrentDbUser } from "@/lib/db";
import { getSystemIncidents, getUpcomingMaintenance } from "@/app/actions/system-status";
import StatusClient from "./status-client";

export default async function StatusPage() {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const [healthRes, incidents, maintenance, me] = await Promise.all([
    fetch(`${BASE_URL}/api/health`, { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null),
    getSystemIncidents(),
    getUpcomingMaintenance(),
    getCurrentDbUser(),
  ]);

  const isAdmin = !!(me && ["admin", "super_admin"].includes(me.role));

  return (
    <StatusClient
      services={healthRes?.services ?? []}
      incidents={incidents}
      maintenance={maintenance}
      checkedAt={healthRes?.checkedAt ?? null}
      isAdmin={isAdmin}
      allOperational={healthRes?.allOperational ?? false}
    />
  );
}
