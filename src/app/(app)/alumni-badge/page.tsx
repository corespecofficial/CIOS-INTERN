import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyAlumniBadge } from "@/app/actions/alumni-badge";
import AlumniBadgeClient from "./alumni-badge-client";

export const dynamic = "force-dynamic";

export default async function AlumniBadgePage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getMyAlumniBadge();
  return <AlumniBadgeClient badge={res.ok ? res.data ?? null : null} userName={me.name || "Alumni"} />;
}
