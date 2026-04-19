import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { getMyPartner, listPartnerClients, listPartnerPayouts } from "@/app/actions/partners";
import PartnersClient from "./partners-client";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const pRes = await getMyPartner();
  const partner = pRes.ok ? pRes.data : null;
  let clients = [];
  let payouts = [];
  if (partner) {
    const [cRes, poRes] = await Promise.all([listPartnerClients(partner.id), listPartnerPayouts(partner.id)]);
    if (cRes.ok) clients = cRes.data ?? [];
    if (poRes.ok) payouts = poRes.data ?? [];
  }
  return <PartnersClient partner={partner} initialClients={clients} payouts={payouts} />;
}
