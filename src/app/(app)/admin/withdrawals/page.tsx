import { adminGetWithdrawals } from "@/app/actions/payments/withdraw";
import AdminWithdrawalsClient from "./withdrawals-client";

export const dynamic = "force-dynamic";

export default async function AdminWithdrawalsPage() {
  const res = await adminGetWithdrawals();
  const withdrawals = res.ok ? (res.data ?? []) : [];
  return <AdminWithdrawalsClient withdrawals={withdrawals} />;
}
