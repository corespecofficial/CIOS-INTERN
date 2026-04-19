import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listMyOkrs } from "@/app/actions/okrs";
import OkrsClient from "./okrs-client";

export const dynamic = "force-dynamic";

export default async function OkrsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listMyOkrs();
  return <OkrsClient initialOkrs={res.ok ? res.data ?? [] : []} />;
}
