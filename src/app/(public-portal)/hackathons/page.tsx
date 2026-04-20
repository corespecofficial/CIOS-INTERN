import type { Metadata } from "next";
import { listHackathons } from "@/app/actions/hackathons";
import { HackathonsBrowseClient } from "./hackathons-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CIOS Hackathons — build, compete, win across Africa",
  description:
    "Open hackathons run by CIOS and partner orgs. Form teams with vetted CIOS interns, ship in days, win prizes. Sign up free to register or judge.",
  openGraph: {
    title: "CIOS Hackathons",
    description: "Build, compete and win in Africa-first hackathons hosted on CIOS.",
    type: "website",
  },
  alternates: { canonical: "/hackathons" },
};

export default async function HackathonsPage() {
  const res = await listHackathons({ limit: 60 });
  return <HackathonsBrowseClient hackathons={res.ok ? res.data! : []} />;
}
