export interface StartupPitch {
  id: string;
  founder_id: string;
  founder_name: string | null;
  founder_avatar: string | null;
  /** Founder credibility from CIOS profile */
  founder_xp?: number;
  founder_level?: number;
  founder_role?: string;
  startup_name: string;
  tagline: string;
  description: string;
  category: string;
  stage: string;
  looking_for: string[];
  website_url: string | null;
  pitch_deck_url: string | null;
  is_public: boolean;
  views: number;
  status: string;
  interest_count?: number;
  created_at: string;
  // Phase 5 additions
  cover_image_url: string | null;
  slug: string | null;
  country: string | null;
  team_size: number | null;
  founded_year: number | null;
  monthly_revenue_usd: number | null;
  raising_amount_usd: number | null;
  is_featured: boolean;
}

export const STARTUP_CATEGORIES = [
  "EdTech", "FinTech", "HealthTech", "AgriTech",
  "E-Commerce", "SaaS", "Media & Content",
  "Logistics", "Clean Energy", "AI & Automation", "Other",
] as const;

export const STARTUP_STAGES = [
  { value: "idea", label: "💡 Idea Stage" },
  { value: "prototype", label: "🔧 Prototype" },
  { value: "mvp", label: "🚀 MVP" },
  { value: "revenue", label: "💰 Generating Revenue" },
  { value: "scaling", label: "📈 Scaling" },
] as const;

export const LOOKING_FOR_OPTIONS = [
  "Co-Founder", "Mentor", "Investor", "Technical Partner",
  "Designer", "Marketing Help", "Beta Users", "Feedback",
] as const;
