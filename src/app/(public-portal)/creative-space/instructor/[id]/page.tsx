import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/lib/db";
import { listSpacesByOwner } from "@/app/actions/creative-spaces";
import { creatorCredibility } from "@/lib/creator-credibility";
import { InstructorProfileClient } from "./instructor-profile-client";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://cios-intern.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) return { title: "Instructor not found · CIOS" };
  const title = `${profile.name} — CIOS Instructor`;
  const description = profile.bio?.slice(0, 160) || `Courses by ${profile.name}, a CIOS ${profile.role.replace("_", " ")}.`;
  return {
    title,
    description,
    alternates: { canonical: `/creative-space/instructor/${id}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${SITE}/creative-space/instructor/${id}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
  };
}

export default async function InstructorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, spacesRes] = await Promise.all([
    getPublicProfile(id),
    listSpacesByOwner(id),
  ]);
  if (!profile) return notFound();
  const spaces = spacesRes.ok ? spacesRes.data! : [];
  const percentile = spaces[0]?.owner_percentile ?? null;
  const cred = creatorCredibility({ xp: profile.xp, level: profile.level, role: profile.role, percentile });

  return (
    <InstructorProfileClient
      instructorId={id}
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
      spaces={spaces}
      credBadge={cred.badge}
      credTier={cred.tier}
      provenance={cred.provenance}
    />
  );
}
