import { BackBar } from "@/components/back-bar";
import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listTeams, getMyTeam } from "@/app/actions/teams";
import { TeamsClient } from "./teams-client";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const [teamsRes, mineRes] = await Promise.all([listTeams(), getMyTeam()]);
  const teams = teamsRes.ok ? teamsRes.data! : [];
  const mine = mineRes.ok ? mineRes.data! : { team: null, members: [] };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: "'Nunito', sans-serif" }}>
      <BackBar to="/dashboard" label="Back" />
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#E8EDF5", margin: 0 }}>🏳 Team challenges</h1>
      <p style={{ fontSize: 13, color: "#8892A4", margin: "4px 0 20px" }}>
        Squad up. Every week, the team with the most combined XP wins bragging rights.
      </p>
      <TeamsClient initialTeams={teams} initialMine={mine} />
    </div>
  );
}
