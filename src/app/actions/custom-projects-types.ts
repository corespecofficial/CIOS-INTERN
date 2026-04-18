/** Client-safe types for custom projects — no "use server", safe to import anywhere. */

export type SectionType =
  | "essay" | "rating_scale" | "text_fields" | "planner"
  | "goal_grid" | "file_upload" | "covenant" | "free_form";

export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  essay: "Essay / Reflection",
  rating_scale: "Rating Scale (Pillars)",
  text_fields: "Text Fields",
  planner: "Day Planner",
  goal_grid: "Goal-Setting Grid",
  file_upload: "File Upload",
  covenant: "Covenant / Agreement",
  free_form: "Free-Form Response",
};

export const SECTION_TYPE_ICONS: Record<SectionType, string> = {
  essay: "✍️", rating_scale: "🏛️", text_fields: "📝",
  planner: "📅", goal_grid: "🎯", file_upload: "🎨",
  covenant: "🤝", free_form: "💬",
};

// ── Section config discriminated union ─────────────────────────────────────────

export interface SectionBase {
  id: string;
  label: string;
  points: number;
  type: SectionType;
  instructions?: string;
}

export interface EssaySection extends SectionBase {
  type: "essay";
  config: { questions: Array<{ id: string; text: string; wordTarget?: number }> };
}
export interface RatingScaleSection extends SectionBase {
  type: "rating_scale";
  config: { pillars: Array<{ id: string; name: string; description?: string }>; minLabel?: string; maxLabel?: string };
}
export interface TextFieldsSection extends SectionBase {
  type: "text_fields";
  config: { fields: Array<{ id: string; label: string; multiline?: boolean; placeholder?: string }> };
}
export interface PlannerSection extends SectionBase {
  type: "planner";
  config: { days: number; dayNames?: string[] };
}
export interface GoalGridSection extends SectionBase {
  type: "goal_grid";
  config: { horizons: Array<{ label: string; count: number }> };
}
export interface FileUploadSection extends SectionBase {
  type: "file_upload";
  config: { uploadLabel?: string; extraFields?: Array<{ id: string; label: string }> };
}
export interface CovenantSection extends SectionBase {
  type: "covenant";
  config: { text: string };
}
export interface FreeFormSection extends SectionBase {
  type: "free_form";
  config: { label?: string; placeholder?: string; wordTarget?: number };
}

export type SectionConfig =
  | EssaySection | RatingScaleSection | TextFieldsSection | PlannerSection
  | GoalGridSection | FileUploadSection | CovenantSection | FreeFormSection;

// ── Project & submission types ──────────────────────────────────────────────────

export interface Project {
  id: string;
  title: string;
  description: string;
  emoji: string;
  instructions: string;
  deadline: string | null;
  late_fine_amount: number;
  xp_on_submit: number;
  xp_bonus_threshold: number;
  xp_bonus_amount: number;
  status: "draft" | "published" | "archived";
  sections: SectionConfig[];
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed on fetch
  submission_count?: number;
  my_submission?: ProjectSubmissionSummary | null;
}

export interface ProjectSubmission {
  id: string;
  project_id: string;
  user_id: string;
  status: "draft" | "submitted" | "late" | "graded";
  answers: Record<string, unknown>;
  total_score: number | null;
  overall_feedback: string | null;
  late_fine_applied: boolean;
  submitted_at: string | null;
  graded_at: string | null;
  graded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSubmissionSummary {
  id: string;
  status: "draft" | "submitted" | "late" | "graded";
  total_score: number | null;
  submitted_at: string | null;
}

export interface ProjectSectionScore {
  id: string;
  submission_id: string;
  section_id: string;
  score: number;
  max_score: number;
  feedback: string | null;
  graded_at: string | null;
}

export type ProjectInput = {
  title: string;
  description: string;
  emoji: string;
  instructions: string;
  deadline: string | null;
  late_fine_amount: number;
  xp_on_submit: number;
  xp_bonus_threshold: number;
  xp_bonus_amount: number;
  sections: SectionConfig[];
  cover_image_url: string | null;
};
