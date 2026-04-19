import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getCurrentRound } from "@/app/actions/voting";
import VotingClient from "./voting-client";

export const dynamic = "force-dynamic";

export default async function VotingPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await getCurrentRound();
  if (!res.ok) {
    return <div style={{ padding: 32, color: "#EF5350" }}>Failed to load: {res.error}</div>;
  }
  return <VotingClient round={res.data.round} initialSubmissions={res.data.submissions} />;
}
