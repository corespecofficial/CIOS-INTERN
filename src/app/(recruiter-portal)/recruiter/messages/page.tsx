import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/db";
import { listRecruiterCandidates } from "@/app/actions/recruiter-messaging";
import { RecruiterMessagesClient } from "./messages-client";

export const dynamic = "force-dynamic";

/**
 * Recruiter messaging — runs INSIDE the recruiter portal shell. No redirect
 * to the intern /messages page.
 *
 * Contact restriction: the candidate list contains only users who have
 * applied to one of this recruiter's listings (admins/super_admins see
 * applicants across all listings). The same Ably realtime + sendMessage
 * server action backs the chat, so messages appear in the candidate's
 * regular inbox + push notifications without the recruiter ever leaving
 * their portal.
 */
export default async function RecruiterMessagesPage() {
  const me = await getCurrentDbUser();
  if (!me) redirect("/sign-in?redirect_url=/recruiter/messages");
  if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") {
    redirect("/opportunities");
  }

  const res = await listRecruiterCandidates();
  const candidates = res.ok ? res.data : [];

  return <RecruiterMessagesClient candidates={candidates} meId={me.id} />;
}
