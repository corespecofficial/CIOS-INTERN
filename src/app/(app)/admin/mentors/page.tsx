import { supabaseAdmin } from "@/lib/db";
import AdminMentorsClient from "./admin-mentors-client";

export const dynamic = "force-dynamic";

export interface AdminMentorRow {
  user_id: string;
  bio: string | null;
  expertise_tags: string[];
  max_mentees: number;
  is_available: boolean;
  session_rate: number | null;
  rating: number;
  sessions_done: number;
  name: string | null;
  avatar_url: string | null;
  active_mentees: number;
  pending_requests: number;
}

export default async function AdminMentorsPage() {
  const sb = supabaseAdmin();

  const { data: mentors } = await sb
    .from("mentors")
    .select("*, user:users!mentors_user_id_fkey(name,avatar_url)")
    .order("sessions_done", { ascending: false });

  type MentorRow = {
    user_id: string; bio: string | null; expertise_tags: string[];
    max_mentees: number; is_available: boolean; session_rate: number | null;
    rating: number; sessions_done: number;
    user?: { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null;
  };

  // Get mentorship counts for each mentor
  const mentorIds = ((mentors || []) as MentorRow[]).map((m) => m.user_id);
  let activeCounts: Record<string, number> = {};
  let pendingCounts: Record<string, number> = {};

  if (mentorIds.length > 0) {
    const { data: active } = await sb
      .from("mentorships")
      .select("mentor_id")
      .in("mentor_id", mentorIds)
      .eq("status", "active");
    const { data: pending } = await sb
      .from("mentorships")
      .select("mentor_id")
      .in("mentor_id", mentorIds)
      .eq("status", "pending");

    (active || []).forEach((r: { mentor_id: string }) => {
      activeCounts[r.mentor_id] = (activeCounts[r.mentor_id] || 0) + 1;
    });
    (pending || []).forEach((r: { mentor_id: string }) => {
      pendingCounts[r.mentor_id] = (pendingCounts[r.mentor_id] || 0) + 1;
    });
  }

  const rows: AdminMentorRow[] = ((mentors || []) as MentorRow[]).map((m) => {
    const u = Array.isArray(m.user) ? m.user[0] : m.user;
    return {
      user_id: m.user_id,
      bio: m.bio,
      expertise_tags: m.expertise_tags,
      max_mentees: m.max_mentees,
      is_available: m.is_available,
      session_rate: m.session_rate,
      rating: m.rating,
      sessions_done: m.sessions_done,
      name: u?.name || null,
      avatar_url: u?.avatar_url || null,
      active_mentees: activeCounts[m.user_id] || 0,
      pending_requests: pendingCounts[m.user_id] || 0,
    };
  });

  return <AdminMentorsClient mentors={rows} />;
}
