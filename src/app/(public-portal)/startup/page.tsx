import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyPitch } from "@/app/actions/startup";
import { StartupClient } from "./startup-client";

export const dynamic = "force-dynamic";

/**
 * Founder pitch dashboard. Lives in the public-portal shell so founders
 * (interns, public users, alumni) get a consistent surface for managing
 * their startup pitch — no intern sidebar baggage.
 *
 * Auth-gated because pitching is a self-service action, but anyone signed
 * in (including public_user) can pitch — that's the whole point of the
 * Phase 5 expansion.
 */
export default async function StartupFounderPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/startup");

  const res = await getMyPitch();
  return <StartupClient existing={res.ok ? (res.data ?? null) : null} />;
}
