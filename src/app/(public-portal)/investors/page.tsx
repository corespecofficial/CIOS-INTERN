import type { Metadata } from "next";
import { listPublicPitches, getPlatformStats } from "@/app/actions/startup";
import { InvestorsLandingClient } from "./investors-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invest in Africa's digital future · CIOS",
  description:
    "Vetted CIOS interns, alumni and mentors building startups across Africa. Browse pitches, track your watchlist, and meet founders before everyone else.",
  openGraph: {
    title: "CIOS Investors",
    description: "Discover Africa's most promising founders — vetted by CIOS performance data.",
    type: "website",
  },
  alternates: { canonical: "/investors" },
};

export default async function InvestorsPage() {
  const [pitchesRes, statsRes] = await Promise.all([
    listPublicPitches({ limit: 30 }),
    getPlatformStats(),
  ]);
  return (
    <InvestorsLandingClient
      pitches={pitchesRes.ok ? pitchesRes.data! : []}
      stats={statsRes.ok ? statsRes.data! : { interns: 0, alumni: 0, placements: 0, countries: 5, hackathons: 0 }}
    />
  );
}
