// Plan metadata for the recruiter paywall. Shared between server (enforces
// quotas) and client (renders the pricing card + upgrade CTA). Kept tiny and
// pure so "use server" modules never have to export anything non-async.

export type RecruiterPlan = "free" | "growth" | "pro" | "enterprise";

export interface PlanDef {
  id: RecruiterPlan;
  label: string;
  priceNgn: number;        // 0 = free
  activeListings: number | null; // null = unlimited
  badge?: string;
  tagline: string;
  features: string[];
}

export const RECRUITER_PLANS: PlanDef[] = [
  {
    id: "free",
    label: "Starter",
    priceNgn: 0,
    activeListings: 1,
    tagline: "Test the platform",
    features: [
      "1 active listing",
      "Browse the CIOS talent pool",
      "Applicant XP + level badges",
      "Interview scheduling",
    ],
  },
  {
    id: "growth",
    label: "Growth",
    priceNgn: 15_000,
    activeListings: 5,
    tagline: "Teams hiring 2-5 roles",
    features: [
      "5 active listings",
      "Saved searches + alerts",
      "Promoted listing (1×)",
      "CSV export of applicants",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    priceNgn: 45_000,
    activeListings: null,
    badge: "Most popular",
    tagline: "Unlimited hiring",
    features: [
      "Unlimited active listings",
      "Unlimited promoted listings",
      "Advanced analytics + funnel",
      "Priority talent-pool ranking",
      "Placement fee: 5% of monthly salary",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    priceNgn: 0, // custom
    activeListings: null,
    tagline: "Custom integrations",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "SSO + team seats",
      "Custom branding on postings",
      "Placement fee: negotiated",
    ],
  },
];

export function planLabel(id: string): string {
  return RECRUITER_PLANS.find((p) => p.id === id)?.label || "Starter";
}
