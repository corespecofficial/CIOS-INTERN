import { getCurrentDbUser } from "@/lib/db";
import { redirect } from "next/navigation";
import { listMyContacts } from "@/app/actions/messaging-privacy";
import { ContactsClient } from "./contacts-client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in");
  const res = await listMyContacts();
  return <ContactsClient initial={res.ok ? res.data! : []} myRole={me.role} />;
}
