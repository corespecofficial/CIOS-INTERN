"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useUser } from "@clerk/nextjs";

/** Attaches signed-in user id + role to every Sentry event on the client. Renders nothing. */
export function SentryUser() {
  const { user, isSignedIn } = useUser();
  useEffect(() => {
    try {
      if (!isSignedIn || !user) { Sentry.setUser(null); return; }
      Sentry.setUser({
        id: user.id,
        segment: (user.publicMetadata?.role as string) || "intern",
      });
    } catch {/* ignore */}
  }, [isSignedIn, user]);
  return null;
}
