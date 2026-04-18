import { getCovenantWall } from "@/app/actions/eagle";
import { CovenantWallClient } from "@/app/(app)/eagle/wall/covenant-wall-client";

export const dynamic = "force-dynamic";

export default async function ProjectEagleWallPage() {
  const res = await getCovenantWall();
  const signatories = res.ok ? res.data : [];
  return <CovenantWallClient signatories={signatories} />;
}
