import type { Metadata } from "next";
import { PricingSection } from "@/components/marketing/pricing-section";

export const metadata: Metadata = { title: "Pricing · CIOS", description: "Honest, regional pricing for serious hiring. Auto-adjusts to your local currency." };

export default function PricingPage() {
  return <PricingSection />;
}
