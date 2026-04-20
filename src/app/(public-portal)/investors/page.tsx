import type { Metadata } from "next";
import { listPublicPitches } from "@/app/actions/startup";
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
  // Public pitch list only — platform stats (intern/alumni/placement counts)
  // are intentionally NOT shown to investors. Those are admin-internal numbers
  // that distract from the value prop (find founders, not read HR metrics).
  const pitchesRes = await listPublicPitches({ limit: 30 });
  return <InvestorsLandingClient pitches={pitchesRes.ok ? pitchesRes.data! : []} />;
}
