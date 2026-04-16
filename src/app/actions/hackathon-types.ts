export interface Hackathon {
  id: string;
  title: string;
  description: string;
  theme: string | null;
  banner_url: string | null;
  starts_at: string;
  ends_at: string;
  registration_deadline: string | null;
  prize_pool: string | null;
  max_team_size: number;
  min_team_size: number;
  status: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  team_count?: number;
}

export interface HackathonTeam {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  created_by: string;
  is_open: boolean;
  created_at: string;
  members: HackathonMember[];
  my_role?: string | null;
}

export interface HackathonMember {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
}

export interface HackathonSubmission {
  id: string;
  hackathon_id: string;
  team_id: string;
  team_name: string | null;
  title: string;
  description: string;
  demo_url: string | null;
  repo_url: string | null;
  submitted_at: string;
  score: number | null;
  rank: number | null;
  judge_notes: string | null;
}
