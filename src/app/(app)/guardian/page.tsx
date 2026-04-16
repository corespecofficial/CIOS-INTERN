import { getOrCreateGuardianInvite } from "@/app/actions/guardian";
import { GuardianManageClient } from "./guardian-manage-client";
export const dynamic = "force-dynamic";
export default async function GuardianManagePage() {
  const res = await getOrCreateGuardianInvite();
  return <GuardianManageClient invite={res.ok ? res.data! : null} />;
}
