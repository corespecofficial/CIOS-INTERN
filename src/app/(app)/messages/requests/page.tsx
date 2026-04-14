import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listMyContactRequests, listIncomingPeerRequests } from "@/app/actions/messaging-privacy";
import { RequestsClient } from "./requests-client";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [outRes, inRes] = await Promise.all([
    listMyContactRequests(),
    listIncomingPeerRequests(),
  ]);
  const outgoing = outRes.ok ? (outRes.data as unknown as Parameters<typeof RequestsClient>[0]["outgoing"]) : [];
  const incoming = inRes.ok ? inRes.data! : [];
  return <RequestsClient outgoing={outgoing} incoming={incoming} />;
}
