import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getMyAppeals } from "@/app/actions/compliance-appeals";
import { getActiveSuspension } from "@/app/actions/compliance-suspensions";
import AppealsClient from "./appeals-client";

export const dynamic = "force-dynamic";

export default async function AppealsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [appealsRes, suspensionRes] = await Promise.all([
    getMyAppeals(),
    getActiveSuspension(),
  ]);

  const myAppeals = appealsRes.ok && appealsRes.data ? appealsRes.data : [];
  const activeSuspension =
    suspensionRes.ok && suspensionRes.data ? suspensionRes.data : null;

  return <AppealsClient myAppeals={myAppeals} activeSuspension={activeSuspension} />;
}
