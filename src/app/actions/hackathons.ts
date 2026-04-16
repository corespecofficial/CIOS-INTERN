"use server";

import { supabaseAdmin, getCurrentDbUser } from "@/lib/db";
import { revalidatePath } from "next/cache";
import type { Hackathon, HackathonTeam, HackathonSubmission, HackathonMember } from "./hackathon-types";

export type { Hackathon, HackathonTeam, HackathonSubmission, HackathonMember } from "./hackathon-types";

type R<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function listHackathons(): Promise<R<Hackathon[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("hackathons")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(50);
    // Get team counts
    const ids = ((data || []) as Hackathon[]).map((h) => h.id);
    const { data: counts } = ids.length > 0
      ? await sb.from("hackathon_teams").select("hackathon_id").in("hackathon_id", ids)
      : { data: [] };
    const countMap = new Map<string, number>();
    for (const r of (counts || []) as Array<{ hackathon_id: string }>) {
      countMap.set(r.hackathon_id, (countMap.get(r.hackathon_id) || 0) + 1);
    }
    return { ok: true, data: ((data || []) as Hackathon[]).map((h) => ({ ...h, team_count: countMap.get(h.id) || 0 })) };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getHackathon(id: string): Promise<R<Hackathon>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("hackathons").select("*").eq("id", id).maybeSingle();
    if (!data) return { ok: false, error: "Hackathon not found" };
    return { ok: true, data: data as Hackathon };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getHackathonTeams(hackathonId: string): Promise<R<HackathonTeam[]>> {
  try {
    const me = await getCurrentDbUser();
    const sb = supabaseAdmin();
    const { data: teams } = await sb.from("hackathon_teams")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: true });
    if (!teams || teams.length === 0) return { ok: true, data: [] };
    const teamIds = (teams as HackathonTeam[]).map((t) => t.id);
    const { data: members } = await sb.from("hackathon_team_members")
      .select("team_id, user_id, role, user:users!hackathon_team_members_user_id_fkey(name, avatar_url)")
      .in("team_id", teamIds);
    type MRow = { team_id: string; user_id: string; role: string; user?: { name?: string | null; avatar_url?: string | null } | Array<{ name?: string | null; avatar_url?: string | null }> | null };
    const membersByTeam = new Map<string, HackathonMember[]>();
    for (const m of (members || []) as MRow[]) {
      const u = Array.isArray(m.user) ? m.user[0] : m.user;
      if (!membersByTeam.has(m.team_id)) membersByTeam.set(m.team_id, []);
      membersByTeam.get(m.team_id)!.push({ user_id: m.user_id, name: u?.name || null, avatar_url: u?.avatar_url || null, role: m.role });
    }
    return {
      ok: true,
      data: (teams as HackathonTeam[]).map((t) => {
        const teamMembers = membersByTeam.get(t.id) || [];
        const myRole = me ? (teamMembers.find((m) => m.user_id === me.id)?.role || null) : null;
        return { ...t, members: teamMembers, my_role: myRole };
      }),
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function createTeam(hackathonId: string, name: string, description?: string): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (name.trim().length < 2) return { ok: false, error: "Team name too short" };
    const sb = supabaseAdmin();
    // Check not already in a team for this hackathon
    const { data: existing } = await sb.from("hackathon_team_members")
      .select("team_id, team:hackathon_teams!hackathon_team_members_team_id_fkey(hackathon_id)")
      .eq("user_id", me.id);
    type ExRow = { team_id: string; team?: { hackathon_id?: string } | Array<{ hackathon_id?: string }> | null };
    const alreadyInTeam = ((existing || []) as ExRow[]).some((r) => {
      const t = Array.isArray(r.team) ? r.team[0] : r.team;
      return t?.hackathon_id === hackathonId;
    });
    if (alreadyInTeam) return { ok: false, error: "You are already in a team for this hackathon" };
    const { data: team, error } = await sb.from("hackathon_teams").insert({ hackathon_id: hackathonId, name: name.trim(), description: description || null, created_by: me.id }).select("id").single();
    if (error || !team) return { ok: false, error: error?.message || "Failed to create team" };
    const teamId = (team as { id: string }).id;
    await sb.from("hackathon_team_members").insert({ team_id: teamId, user_id: me.id, role: "leader" });
    revalidatePath(`/hackathons/${hackathonId}`);
    return { ok: true, data: { id: teamId } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function joinTeam(teamId: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    const sb = supabaseAdmin();
    const { data: team } = await sb.from("hackathon_teams").select("hackathon_id, is_open").eq("id", teamId).maybeSingle();
    if (!team) return { ok: false, error: "Team not found" };
    const t = team as { hackathon_id: string; is_open: boolean };
    if (!t.is_open) return { ok: false, error: "This team is not accepting members" };
    // Check max size
    const { count } = await sb.from("hackathon_team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId);
    const { data: hackathon } = await sb.from("hackathons").select("max_team_size").eq("id", t.hackathon_id).maybeSingle();
    const maxSize = (hackathon as { max_team_size: number } | null)?.max_team_size || 4;
    if ((count || 0) >= maxSize) return { ok: false, error: "Team is full" };
    const { error } = await sb.from("hackathon_team_members").insert({ team_id: teamId, user_id: me.id, role: "member" });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "Already in this team" };
      return { ok: false, error: error.message };
    }
    revalidatePath(`/hackathons/${t.hackathon_id}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function submitProject(hackathonId: string, teamId: string, input: { title: string; description: string; demoUrl?: string; repoUrl?: string }): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me) return { ok: false, error: "Unauthorized" };
    if (input.title.trim().length < 3) return { ok: false, error: "Title too short" };
    if (input.description.trim().length < 20) return { ok: false, error: "Description too short" };
    const sb = supabaseAdmin();
    // Verify user is in the team
    const { count } = await sb.from("hackathon_team_members").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("user_id", me.id);
    if (!count) return { ok: false, error: "You are not in this team" };
    const { data, error } = await sb.from("hackathon_submissions").upsert({
      hackathon_id: hackathonId, team_id: teamId,
      title: input.title.trim(), description: input.description.trim(),
      demo_url: input.demoUrl || null, repo_url: input.repoUrl || null,
    }, { onConflict: "hackathon_id,team_id" }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed to submit" };
    revalidatePath(`/hackathons/${hackathonId}`);
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function getLeaderboard(hackathonId: string): Promise<R<HackathonSubmission[]>> {
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from("hackathon_submissions")
      .select("*, team:hackathon_teams!hackathon_submissions_team_id_fkey(name)")
      .eq("hackathon_id", hackathonId)
      .not("score", "is", null)
      .order("score", { ascending: false });
    type SRow = Record<string, unknown> & { team?: { name?: string } | Array<{ name?: string }> | null };
    return {
      ok: true,
      data: ((data || []) as SRow[]).map((r, i) => {
        const t = Array.isArray(r.team) ? r.team[0] : r.team;
        return { ...r, team_name: t?.name || null, rank: i + 1 } as HackathonSubmission;
      }),
    };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function adminCreateHackathon(input: {
  title: string; description: string; theme?: string; starts_at: string; ends_at: string;
  registration_deadline?: string; prize_pool?: string; max_team_size?: number; min_team_size?: number; tags?: string[];
}): Promise<R<{ id: string }>> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    const { data, error } = await sb.from("hackathons").insert({
      title: input.title, description: input.description, theme: input.theme || null,
      starts_at: input.starts_at, ends_at: input.ends_at,
      registration_deadline: input.registration_deadline || null,
      prize_pool: input.prize_pool || null,
      max_team_size: input.max_team_size || 4,
      min_team_size: input.min_team_size || 1,
      tags: input.tags || [],
      created_by: me.id,
    }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Failed" };
    revalidatePath("/hackathons");
    revalidatePath("/admin/hackathons");
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function adminScoreSubmission(submissionId: string, score: number, judgeNotes?: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    await sb.from("hackathon_submissions").update({ score, judge_notes: judgeNotes || null }).eq("id", submissionId);
    revalidatePath("/admin/hackathons");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

export async function adminUpdateHackathonStatus(hackathonId: string, status: string): Promise<R> {
  try {
    const me = await getCurrentDbUser();
    if (!me || !["admin","super_admin"].includes(me.role)) return { ok: false, error: "Admins only" };
    const sb = supabaseAdmin();
    await sb.from("hackathons").update({ status, updated_at: new Date().toISOString() }).eq("id", hackathonId);
    revalidatePath("/hackathons");
    revalidatePath("/admin/hackathons");
    return { ok: true };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}
