import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getPublicProfile } from "@/lib/db";
import { listProductsBySeller } from "@/app/actions/marketplace";
import { creatorCredibility } from "@/lib/creator-credibility";
import { CreatorProfileClient } from "./creator-profile-client";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

// Server-authoritative — see instructor profile page for why this is
// computed server-side instead of in the client via useCurrentUser.
const COMMUNITY_PROFILE_ROLES = new Set([
  "intern", "team_lead", "admin", "super_admin",
  "instructor", "moderator", "finance", "support",
  "recruiter", "mentor", "alumni",
]);

async function viewerCanSeeFullActivity(): Promise<boolean> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) return false;
    const claims = sessionClaims as Record<string, unknown> | null;
    const meta = (claims?.publicMetadata ?? claims?.metadata ?? null) as Record<string, unknown> | null;
    const role = typeof meta?.role === "string" ? (meta.role as string) : null;
    return !!role && COMMUNITY_PROFILE_ROLES.has(role);
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) return { title: "Creator not found · CIOS Marketplace" };

  const title = `${profile.name} — CIOS Creator Shop`;
  const description = profile.bio?.slice(0, 160) || `Digital products by ${profile.name}, a CIOS ${profile.role.replace("_", " ")}.`;
  return {
    title,
    description,
    alternates: { canonical: `/marketplace/creator/${id}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${SITE}/marketplace/creator/${id}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
  };
}

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [profile, productsRes, canSeeFullActivity] = await Promise.all([
    getPublicProfile(id),
    listProductsBySeller(id),
    viewerCanSeeFullActivity(),
  ]);

  if (!profile) return notFound();

  const products = productsRes.ok ? productsRes.data! : [];
  // Derive a percentile from the first product (all share the same seller)
  const percentile = products[0]?.seller_percentile ?? null;
  const cred = creatorCredibility({
    xp: profile.xp,
    level: profile.level,
    role: profile.role,
    percentile,
  });

  return (
    <CreatorProfileClient
      creatorId={id}
      name={profile.name}
      avatarUrl={profile.avatar_url}
      coverUrl={profile.cover_url}
      role={profile.role}
      bio={profile.bio}
      headline={profile.headline}
      location={profile.location}
      xp={profile.xp}
      level={profile.level}
      streak={profile.streak}
      reputation={profile.reputation}
      joined={profile.joined}
      products={products}
      credBadge={cred.badge}
      credTier={cred.tier}
      provenance={cred.provenance}
      canSeeFullActivity={canSeeFullActivity}
    />
  );
}
