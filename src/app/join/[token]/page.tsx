/**
 * Org-invite acceptance landing. Two paths:
 *
 *   - Signed in: redirect to /onboarding/intent?invite=<token> if not yet
 *     onboarded; if already onboarded, redeem inline and bounce to portal.
 *   - Signed out: forward to sign-in/sign-up with the token preserved in
 *     the redirect_url so post-auth → onboarding/intent picks it up.
 *
 * The actual redemption logic is in onboarding-intent.ts (redeemOrgInvite).
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentDbUser } from "@/lib/db";
import { redeemOrgInvite } from "@/app/actions/onboarding-intent";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ token: string }>; }

export default async function JoinByToken({ params }: Props) {
  const { token } = await params;
  const { userId } = await auth();

  if (!userId) {
    // Clerk handles signup/login; we ferry the token through redirect_url
    // so the new user lands on /onboarding/intent?invite=<token>, which
    // auto-redeems and routes into the org.
    const target = encodeURIComponent(`/onboarding/intent?invite=${encodeURIComponent(token)}`);
    redirect(`/sign-up?redirect_url=${target}`);
  }

  const me = await getCurrentDbUser();
  if (!me) redirect(`/sign-up?redirect_url=${encodeURIComponent(`/onboarding/intent?invite=${token}`)}`);

  // Already onboarded → redeem inline and route. Otherwise punt to the
  // intent gate so we capture spam signals + show the welcome flow.
  const completed = !!(me as unknown as { onboarding_completed_at?: string | null }).onboarding_completed_at;
  if (!completed) redirect(`/onboarding/intent?invite=${encodeURIComponent(token)}`);

  const r = await redeemOrgInvite(token);
  if (!r.ok) {
    // Land them somewhere sensible with the error visible.
    redirect(`/visitor?invite_error=${encodeURIComponent(r.error)}`);
  }
  redirect(r.data!.redirectTo);
}
