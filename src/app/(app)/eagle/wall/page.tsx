import { getCovenantWall } from "@/app/actions/eagle";
import { CovenantWallClient } from "./covenant-wall-client";

export const dynamic = "force-dynamic";

export default async function CovenantWallPage() {
  const res = await getCovenantWall();
  const signatories = res.ok ? res.data : [];
  return <CovenantWallClient signatories={signatories} />;
}
