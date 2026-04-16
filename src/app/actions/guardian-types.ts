export interface GuardianInvite {
  id: string;
  intern_id: string;
  token: string;
  guardian_name: string | null;
  guardian_email: string | null;
  is_active: boolean;
  last_viewed_at: string | null;
  created_at: string;
}

export interface InternSummary {
  id: string;
  name: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  performance: number;
  streak: number;
  tasks_completed: number;
  tasks_total: number;
  last_active_at: string | null;
  role: string;
}
