import { listInactiveInterns } from "@/app/actions/inactive-interns";
import { InactiveClient } from "./inactive-client";

export const dynamic = "force-dynamic";

export default async function InactiveInternsPage() {
  const r = await listInactiveInterns(7);
  return <InactiveClient initial={r.ok ? r.data || [] : []} />;
}
