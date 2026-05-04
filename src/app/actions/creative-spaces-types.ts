// Shared types + constants for Creative Spaces. Pure — safe to import from
// either server or client code.

export interface CreativeSpace {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_avatar: string | null;
  /** Credibility join (Phase 2). */
  owner_xp: number;
  owner_level: number;
  owner_role: string;
  owner_percentile: number | null;

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
  meeting_link: string | null;
  is_live: boolean;
  created_at: string;
  updated_at: string;

  // Phase 2 additions
  cover_image_url: string | null;
  intro_video_url: string | null;
  outcomes: string[];
  syllabus: SyllabusSection[];
  rating: number;
  review_count: number;
  is_featured: boolean;
  slug: string | null;

  // p390 host-portal additions — links the public listing to the per-host
  // tenant org spawned on approval (NULL until reviewed). The admin review
  // surface uses this to show "✓ Organization created" + org details.
  org_id: string | null;
  org_slug: string | null;
  org_member_count: number | null;
}

export interface SyllabusSection {
  title: string;
  lessons: string[];
}

export interface SpaceReview {
  id: string;
  space_id: string;
  reviewer_id: string;
  reviewer_name: string | null;
  reviewer_avatar: string | null;
  rating: number;
  body: string | null;
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

export type SpaceCategory = (typeof SPACE_CATEGORIES)[number];
