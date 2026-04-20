"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";

type R<T> = { ok: true; data: T } | { ok: false; error: string };

export interface RecruiterCandidate {
  /** Supabase users.id */
  user_id: string;
  /** Clerk id — needed for Ably presence channel naming */
  clerk_id: string | null;
  name: string;
  avatar_url: string | null;
  headline: string | null;
  /** Short summary of why this candidate is in the recruiter's contact list */
  via: string;
  /** Most-recent application status across all the recruiter's listings */
  latest_status: string | null;
  /** Most-recent application date — used to sort + group */
  latest_at: string;
  /** Existing direct chat_room id with this candidate, if any */
  room_id: string | null;
  /** Quick credibility tags from the candidate's profile */
  xp: number;
  level: number;
}

/**
 * Returns every CIOS user who has applied to one of the recruiter's
 * opportunities — the only people the recruiter is allowed to message.
 *
 * Implementation notes:
 *   - One DB read per dimension; we then merge in-memory.
 *   - We compute the "via" string ("Applied to: <listing title>") so the UI
 *     never has to round-trip back for context on a candidate row.
 *   - room_id, when present, lets the client open the existing direct chat
 *     instantly without re-running getOrCreateDirectRoom().
 */
export async function listRecruiterCandidates(): Promise<R<RecruiterCandidate[]>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (me.role !== "recruiter" && me.role !== "admin" && me.role !== "super_admin") {
      return { ok: false, error: "Recruiter role required" };
    }

    const sb = supabaseAdmin();

    // 1. Get all listings owned by this recruiter (admins/super_admins see all
    //    applications across all opportunities — useful for triage / coverage).
    let oppQuery = sb.from("opportunities").select("id, title");
    if (me.role === "recruiter") oppQuery = oppQuery.eq("recruiter_id", me.id);
    const { data: opps } = await oppQuery;
    const oppRows = (opps || []) as Array<{ id: string; title: string }>;
    if (oppRows.length === 0) return { ok: true, data: [] };

    const oppIds = oppRows.map((o) => o.id);
    const titleById = new Map(oppRows.map((o) => [o.id, o.title]));

    // 2. Pull every application to those listings.
    const { data: apps } = await sb
      .from("opportunity_applications")
      .select("applicant_id, opportunity_id, status, created_at")
      .in("opportunity_id", oppIds)
      .order("created_at", { ascending: false });
    const appRows = (apps || []) as Array<{ applicant_id: string; opportunity_id: string; status: string; created_at: string }>;
    if (appRows.length === 0) return { ok: true, data: [] };

    // 3. Bucket by applicant — keep the most recent application as the "latest".
    type Bucket = { latest: string; latest_status: string; via: string };
    const byUser = new Map<string, Bucket>();
    for (const a of appRows) {
      const existing = byUser.get(a.applicant_id);
      if (!existing || a.created_at > existing.latest) {
        byUser.set(a.applicant_id, {
          latest: a.created_at,
          latest_status: a.status,
          via: `Applied to: ${titleById.get(a.opportunity_id) ?? "your listing"}`,
        });
      }
    }
    const userIds = Array.from(byUser.keys());

    // 4. Fetch candidate profiles + existing direct rooms in parallel.
    const [profilesRes, roomsRes] = await Promise.all([
      sb
        .from("users")
        .select("id, clerk_id, name, avatar_url, headline, xp, level")
        .in("id", userIds),
      // Find direct rooms the recruiter shares with each candidate. We search
      // for chat_room_members rows where the user is one of the candidates,
      // then cross-check that the recruiter is also in the same room.
      sb
        .from("chat_room_members")
        .select("user_id, chat_room_id, room:chat_rooms!chat_room_members_chat_room_id_fkey(type)")
        .in("user_id", userIds),
    ]);

    const profileById = new Map<string, { id: string; clerk_id: string | null; name: string; avatar_url: string | null; headline: string | null; xp: number; level: number }>();
    for (const p of (profilesRes.data || []) as Array<{ id: string; clerk_id: string | null; name: string; avatar_url: string | null; headline: string | null; xp: number; level: number }>) {
      profileById.set(p.id, p);
    }

    // candidate_user_id -> [room ids that user is in]
    const candidateRoomIds = new Map<string, string[]>();
    type RoomMemberRow = { user_id: string; chat_room_id: string; room: { type: string } | { type: string }[] | null };
    for (const r of (roomsRes.data || []) as RoomMemberRow[]) {
      const room = Array.isArray(r.room) ? r.room[0] : r.room;
      if (room?.type !== "direct") continue;
      const list = candidateRoomIds.get(r.user_id) ?? [];
      list.push(r.chat_room_id);
      candidateRoomIds.set(r.user_id, list);
    }

    // Resolve which of those rooms ALSO contains the recruiter — that's the DM.
    const allCandidateRoomIds = Array.from(new Set(Array.from(candidateRoomIds.values()).flat()));
    const recruiterDirectRooms = new Set<string>();
    if (allCandidateRoomIds.length > 0) {
      const { data: mine } = await sb
        .from("chat_room_members")
        .select("chat_room_id")
        .eq("user_id", me.id)
        .in("chat_room_id", allCandidateRoomIds);
      for (const m of (mine || []) as Array<{ chat_room_id: string }>) {
        recruiterDirectRooms.add(m.chat_room_id);
      }
    }

    // 5. Build the response, sorted by most-recent application.
    const result: RecruiterCandidate[] = userIds
      .map((uid) => {
        const profile = profileById.get(uid);
        const meta = byUser.get(uid)!;
        const sharedRoomId = (candidateRoomIds.get(uid) ?? []).find((rid) => recruiterDirectRooms.has(rid)) ?? null;
        return {
          user_id: uid,
          clerk_id: profile?.clerk_id ?? null,
          name: profile?.name ?? "Candidate",
          avatar_url: profile?.avatar_url ?? null,
          headline: profile?.headline ?? null,
          via: meta.via,
          latest_status: meta.latest_status,
          latest_at: meta.latest,
          room_id: sharedRoomId,
          xp: Number(profile?.xp ?? 0),
          level: Number(profile?.level ?? 1),
        };
      })
      .sort((a, b) => (a.latest_at < b.latest_at ? 1 : -1));

    return { ok: true, data: result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
