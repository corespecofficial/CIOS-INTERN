"use server";

import { getCurrentDbUser, supabaseAdmin } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getEngagementFeatures } from "@/app/actions/engagement-v2";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export interface TeamRow {
  id: string; name: string; color: string; emoji: string;
  captain_id: string; created_at: string; member_count: number;
  xp_week: number; is_mine: boolean;
}

export interface TeamMember {
  user_id: string; name: string | null; avatar_url: string | null; xp: number; joined_at: string;
}

function startOfWeekUTC(resetDayIso: number): Date {
  const now = new Date();
  const day = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
  const diff = (day - resetDayIso + 7) % 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
}

/** All teams ranked by combined weekly XP. */
export async function listTeams(): Promise<R<TeamRow[]>> {
  try {
    const me = await getCurrentDbUser();
    const features = await getEngagementFeatures();
    if (!features.teams) return { ok: true, data: [] };

    const sb = supabaseAdmin();
    const [{ data: teams }, { data: members }, { data: myMember }] = await Promise.all([
      sb.from("teams").select("id, name, color, emoji, captain_id, created_at"),
      sb.from("team_members").select("team_id, user_id"),
      me ? sb.from("team_members").select("team_id").eq("user_id", me.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const teamRows = (teams || []) as Array<{ id: string; name: string; color: string; emoji: string; captain_id: string; created_at: string }>;
    const memberRows = (members || []) as Array<{ team_id: string; user_id: string }>;
    const myTeamId = (myMember as { data?: { team_id?: string } | null } | { team_id?: string } | null) && "team_id" in (myMember as object) ? (myMember as { team_id: string }).team_id : (myMember as { data?: { team_id?: string } } | null)?.data?.team_id;

    const membersByTeam = new Map<string, string[]>();
    for (const m of memberRows) {
      if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, []);
      membersByTeam.get(m.team_id)!.push(m.user_id);
    }

    // Weekly XP sum: aggregate xp_events for each user, group by team.
    const since = startOfWeekUTC(features.leaderboardResetDay || 1).toISOString();
    const allUserIds = [...new Set(memberRows.map((m) => m.user_id))];
    const { data: events } = allUserIds.length > 0 ? await sb.from("xp_events")
      .select("user_id, amount")
      .in("user_id", allUserIds)
      .gte("created_at", since) : { data: [] };
    const xpByUser = new Map<string, number>();
    for (const e of (events || []) as Array<{ user_id: string; amount: number }>) {
      xpByUser.set(e.user_id, (xpByUser.get(e.user_id) || 0) + (e.amount || 0));
    }

    const rows: TeamRow[] = teamRows.map((t) => {
      const userIds = membersByTeam.get(t.id) || [];
      const xpWeek = userIds.reduce((s, u) => s + (xpByUser.get(u) || 0), 0);
      return {
        ...t, member_count: userIds.length, xp_week: xpWeek,
        is_mine: !!me && myTeamId === t.id,
      };
    }).sort((a, b) => b.xp_week - a.xp_week);

    return { ok: true, data: rows };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getMyTeam(): Promise<R<{ team: TeamRow | null; members: TeamMember[] }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: mem } = await sb.from("team_members")
      .select("team_id").eq("user_id", me.id).maybeSingle();
    if (!mem) return { ok: true, data: { team: null, members: [] } };
    const teamId = (mem as { team_id: string }).team_id;

    const list = await listTeams();
    const team = list.ok ? (list.data?.find((t) => t.id === teamId) || null) : null;

    const { data: members } = await sb.from("team_members")
      .select("user_id, joined_at, user:user_id(name, avatar_url, xp)")
      .eq("team_id", teamId);
    const rows = ((members || []) as Array<{ user_id: string; joined_at: string; user?: { name: string | null; avatar_url: string | null; xp: number } | Array<{ name: string | null; avatar_url: string | null; xp: number }> | null }>)
      .map((m) => {
        const u = Array.isArray(m.user) ? m.user[0] : m.user;
        return { user_id: m.user_id, joined_at: m.joined_at, name: u?.name || null, avatar_url: u?.avatar_url || null, xp: u?.xp || 0 };
      });
    return { ok: true, data: { team, members: rows } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function createTeam(name: string, emoji: string, color: string): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.teams) return { ok: false, error: "Teams disabled" };
    if (!name.trim() || name.trim().length < 3) return { ok: false, error: "Team name must be 3+ chars" };

    const sb = supabaseAdmin();
    // Already in a team?
    const { data: mine } = await sb.from("team_members").select("team_id").eq("user_id", me.id).maybeSingle();
    if (mine) return { ok: false, error: "Leave your current team first" };

    const { data, error } = await sb.from("teams")
      .insert({ name: name.trim(), emoji: emoji || "🏳", color: color || "#1E88E5", captain_id: me.id })
      .select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Create failed" };
    await sb.from("team_members").insert({ team_id: data.id, user_id: me.id });
    revalidatePath("/teams");
    return { ok: true, data: { id: data.id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function joinTeam(teamId: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const features = await getEngagementFeatures();
    if (!features.teams) return { ok: false, error: "Teams disabled" };
    const teamSize = features.teamSize || 4;

    const sb = supabaseAdmin();
    const { data: mine } = await sb.from("team_members").select("team_id").eq("user_id", me.id).maybeSingle();
    if (mine) return { ok: false, error: "Leave your current team first" };

    const { count } = await sb.from("team_members").select("user_id", { count: "exact", head: true }).eq("team_id", teamId);
    if ((count || 0) >= teamSize) return { ok: false, error: `Team is full (${teamSize} max)` };

    const { error } = await sb.from("team_members").insert({ team_id: teamId, user_id: me.id });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/teams");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function leaveTeam(): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: mine } = await sb.from("team_members").select("team_id").eq("user_id", me.id).maybeSingle();
    if (!mine) return { ok: false, error: "You are not in a team" };
    const teamId = (mine as { team_id: string }).team_id;

    // If captain leaves and others remain, pass captaincy to the earliest joiner.
    const { data: team } = await sb.from("teams").select("captain_id").eq("id", teamId).maybeSingle();
    const captainId = (team as { captain_id: string } | null)?.captain_id;

    await sb.from("team_members").delete().eq("team_id", teamId).eq("user_id", me.id);

    if (captainId === me.id) {
      const { data: next } = await sb.from("team_members")
        .select("user_id").eq("team_id", teamId).order("joined_at", { ascending: true }).limit(1).maybeSingle();
      if (next) {
        await sb.from("teams").update({ captain_id: (next as { user_id: string }).user_id }).eq("id", teamId);
      } else {
        // Team emptied out — delete it.
        await sb.from("teams").delete().eq("id", teamId);
      }
    }
    revalidatePath("/teams");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
