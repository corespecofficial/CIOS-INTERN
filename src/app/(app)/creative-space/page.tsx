import { listApprovedSpaces } from "@/app/actions/creative-spaces";
import { CreativeSpaceClient } from "./creative-space-client";
// Revalidate every 5 minutes — space listings don't change second-by-second
export const revalidate = 300;
export default async function CreativeSpacePage() {
  const res = await listApprovedSpaces({ limit: 50 });
  return <CreativeSpaceClient spaces={res.ok ? res.data! : []} />;
}
