import { DeferredPage } from "@/components/deferred-page";

export default function EarningsPage() {
  return (
    <DeferredPage
      icon="💰"
      title="Earnings & payouts"
      description="Revenue dashboards, sales history, payout requests, coupons and refund tracking require Paystack integration (P3.1). Your course sale records will accumulate here once payments are live."
      alternatives={[{ label: "Course analytics", href: "/analytics" }]}
    />
  );
}
