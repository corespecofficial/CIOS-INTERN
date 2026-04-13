"use client";

import { useUser } from "@clerk/nextjs";
import type { Role } from "@/store/use-app-store";

const VALID_ROLES: Role[] = [
  "intern",
  "team_lead",
  "admin",
  "super_admin",
  "instructor",
  "moderator",
  "finance",
  "support",
];

export function useCurrentUser() {
  const { user, isSignedIn, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return {
      id: null,
      name: null,
      firstName: null,
      email: null,
      avatarUrl: null,
      initials: "UU",
      role: "intern" as Role,
      isSignedIn: false,
      isLoaded,
    };
  }

  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName = user.fullName || [firstName, lastName].filter(Boolean).join(" ") || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Intern User";
  const email = user.primaryEmailAddress?.emailAddress || "";

  let initials = "IU";
  if (firstName && lastName) initials = (firstName[0] + lastName[0]).toUpperCase();
  else if (firstName) initials = firstName.slice(0, 2).toUpperCase();
  else if (email) initials = email.slice(0, 2).toUpperCase();

  // Read role from Clerk publicMetadata — source of truth
  const rawRole = (user.publicMetadata?.role as string | undefined) || "intern";
  const role: Role = VALID_ROLES.includes(rawRole as Role) ? (rawRole as Role) : "intern";

  return {
    id: user.id,
    name: fullName,
    firstName: firstName || fullName.split(" ")[0] || "Intern",
    email,
    avatarUrl: user.imageUrl || null,
    initials,
    role,
    isSignedIn: !!isSignedIn,
    isLoaded,
  };
}

/* Helper: get the default landing route for a role */
export function getRoleHomePath(role: Role): string {
  const map: Record<Role, string> = {
    intern: "/dashboard",
    team_lead: "/team-lead",
    admin: "/admin",
    super_admin: "/super-admin",
    instructor: "/instructor",
    moderator: "/moderator",
    finance: "/finance",
    support: "/support",
  };
  return map[role] || "/dashboard";
}

/* Helper: check if a role has access to a path */
export function roleCanAccess(role: Role, pathname: string): boolean {
  // Super admin can access everything
  if (role === "super_admin") return true;

  // Shared routes: everyone can access these (profile, settings, notifications)
  const sharedRoutes = ["/profile", "/settings", "/notifications"];
  if (sharedRoutes.some(r => pathname.startsWith(r))) return true;

  // Role-specific routes
  const roleRoutes: Record<Role, string[]> = {
    intern: ["/dashboard", "/classroom", "/courses", "/tasks", "/messages", "/community", "/wallet", "/gamification", "/notes", "/performance", "/calendar"],
    team_lead: ["/team-lead", "/dashboard", "/classroom", "/courses", "/tasks", "/messages", "/community", "/wallet", "/gamification", "/notes", "/performance", "/calendar"],
    admin: ["/admin", "/dashboard"],
    super_admin: [], // super admin bypasses all checks above
    instructor: ["/instructor", "/courses", "/messages", "/community", "/calendar"],
    moderator: ["/moderator", "/community", "/messages"],
    finance: ["/finance", "/wallet"],
    support: ["/support", "/messages"],
  };

  const allowed = roleRoutes[role] || [];
  return allowed.some(r => pathname.startsWith(r));
}
