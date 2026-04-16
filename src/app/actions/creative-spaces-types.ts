export interface CreativeSpace {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  title: string;
  description: string;
  category: string;
  format: string;
  price_per_student: number;
  capacity: number;
  status: string;
  tags: string[];
  schedule: string | null;
  duration_weeks: number | null;
  enrollment_count: number;
  created_at: string;
}

export const SPACE_CATEGORIES = [
  "Web Development",
  "UI/UX Design",
  "Digital Marketing",
  "Data Analytics",
  "Video Editing",
  "Copywriting",
  "AI & Automation",
  "Business Development",
  "Creative Writing",
  "Photography",
  "Other",
] as const;
