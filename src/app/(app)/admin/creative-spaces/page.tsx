import { adminListSpaces } from "@/app/actions/creative-spaces";
import { AdminCreativeSpacesClient } from "./admin-creative-spaces-client";
export const dynamic = "force-dynamic";
export default async function AdminCreativeSpacesPage() {
  const [pending, all] = await Promise.all([
    adminListSpaces("pending"),
    adminListSpaces(),
  ]);
  return (
    <AdminCreativeSpacesClient
      pendingSpaces={pending.ok ? pending.data! : []}
      allSpaces={all.ok ? all.data! : []}
    />
  );
}
