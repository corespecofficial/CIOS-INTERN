import { getMyPitch } from "@/app/actions/startup";
import { StartupClient } from "./startup-client";
export const dynamic = "force-dynamic";
export default async function StartupPage() {
  const res = await getMyPitch();
  return <StartupClient existing={res.ok ? res.data ?? null : null} />;
}
