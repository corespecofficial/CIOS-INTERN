import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

type Role =
  | "intern" | "team_lead" | "admin" | "super_admin"
  | "instructor" | "moderator" | "finance" | "support" | "recruiter";

const VALID_ROLES: Role[] = [
  "intern", "team_lead", "admin", "super_admin",
  "instructor", "moderator", "finance", "support", "recruiter",
];

// Role → home path
const ROLE_HOME: Record<Role, string> = {
  intern: "/dashboard",
  team_lead: "/team-lead",
  admin: "/admin",
  super_admin: "/super-admin",
  instructor: "/instructor",
  moderator: "/moderator",
  finance: "/finance",
  support: "/support",
  recruiter: "/recruiter",
};

// Shared routes everyone can access
const SHARED_ROUTES = ["/profile", "/settings", "/notifications", "/post-auth", "/onboarding"];

// Per-role allowed route prefixes
const ROLE_ACCESS: Record<Role, string[]> = {
  intern: ["/dashboard", "/classroom", "/courses", "/tasks", "/messages", "/community", "/wallet", "/gamification", "/notes", "/performance", "/calendar", "/ai-hub", "/documents", "/recruitment", "/productivity", "/certificates", "/my-analytics", "/announcements"],
  team_lead: ["/team-lead", "/dashboard", "/classroom", "/courses", "/tasks", "/messages", "/community", "/wallet", "/gamification", "/notes", "/performance", "/calendar", "/ai-hub", "/documents", "/recruitment", "/productivity", "/certificates", "/my-analytics", "/announcements"],
  admin: ["/admin", "/dashboard", "/analytics", "/status", "/documents", "/productivity", "/courses", "/instructor", "/certificates"],
  super_admin: [
    "/dashboard","/classroom","/courses","/tasks","/messages","/community","/wallet","/gamification","/notes","/performance","/calendar",
    "/admin","/super-admin","/team-lead","/instructor","/moderator","/finance","/support",
    "/analytics","/documents","/ai-hub","/recruitment","/status","/productivity",
  ],
  instructor: ["/instructor", "/courses", "/messages", "/community", "/calendar", "/productivity", "/certificates"],
  moderator: ["/moderator", "/community", "/messages"],
  finance: ["/finance", "/wallet"],
  support: ["/support", "/messages"],
  recruiter: ["/recruiter", "/opportunities", "/talent", "/messages", "/notifications"],
};

const isProtectedRoute = createRouteMatcher([
  '/post-auth(.*)',
  '/dashboard(.*)', '/classroom(.*)', '/courses(.*)', '/tasks(.*)',
  '/messages(.*)', '/community(.*)', '/profile(.*)', '/wallet(.*)',
  '/gamification(.*)', '/performance(.*)', '/notes(.*)', '/calendar(.*)',
  '/notifications(.*)', '/settings(.*)', '/admin(.*)', '/super-admin(.*)',
  '/team-lead(.*)', '/instructor(.*)', '/moderator(.*)', '/finance(.*)', '/support(.*)',
  '/analytics(.*)', '/documents(.*)', '/ai-hub(.*)', '/recruitment(.*)', '/status(.*)',
  '/onboarding(.*)', '/productivity(.*)', '/certificates(.*)', '/my-analytics(.*)',
  '/recruiter', '/recruiter/(.*)', '/opportunities', '/opportunities/(.*)', '/talent', '/talent/(.*)',
  '/announcements', '/announcements/(.*)',
]);

function extractRole(source: unknown): Role | null {
  if (!source || typeof source !== "object") return null;
  const obj = source as Record<string, unknown>;
  const raw = obj.role;
  if (typeof raw === "string" && VALID_ROLES.includes(raw as Role)) return raw as Role;
  return null;
}

function matchPrefix(prefix: string, pathname: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}
function canAccess(role: Role, pathname: string): boolean {
  // Super admin has full access — they can preview every portal.
  if (role === "super_admin") return true;
  if (SHARED_ROUTES.some(r => matchPrefix(r, pathname))) return true;
  const allowed = ROLE_ACCESS[role] || [];
  return allowed.some(r => matchPrefix(r, pathname));
}

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return NextResponse.next();

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    await auth.protect();
    return NextResponse.next();
  }

  // Try sessionClaims first (fast) — check both publicMetadata AND direct metadata shortcut
  let role: Role | null =
    extractRole((sessionClaims as Record<string, unknown>)?.publicMetadata) ||
    extractRole((sessionClaims as Record<string, unknown>)?.metadata);

  // Fallback: fetch user directly from Clerk if session claims don't contain role
  if (!role) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      role = extractRole(user.publicMetadata) || "intern";
    } catch {
      role = "intern";
    }
  }

  const pathname = request.nextUrl.pathname;

  if (!canAccess(role, pathname)) {
    const home = ROLE_HOME[role] || "/dashboard";
    const url = request.nextUrl.clone();
    url.pathname = home;
    url.searchParams.set("denied", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
