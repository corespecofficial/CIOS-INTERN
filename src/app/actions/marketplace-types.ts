// Shared types and constants for the marketplace feature.
// NOT a "use server" file — safe to import from client components.

export interface Product {
  id: string;
  seller_id: string;
  seller_name: string | null;
  seller_avatar: string | null;
  /** CIOS credibility — xp + level + role come from the seller's profile. */
  seller_xp: number;
  seller_level: number;
  seller_role: string;
  /** Top-percentile rank across all interns, clamped 1-100 (or null if never ranked). */
  seller_percentile: number | null;
  title: string;
  description: string;
  category: string;
  price_ngn: number;
  price_usd: number | null;
  tags: string[];
  status: string;
  sales_count: number;
  rating: number;
  created_at: string;
  // Phase 1 public marketplace additions
  cover_image_url: string | null;
  /** NULL = fixed price. Set = pay-what-you-want floor in NGN. */
  pay_min_ngn: number | null;
  is_verified: boolean;
  is_featured: boolean;
  built_at_cios: boolean;
  slug: string | null;
}

export interface Purchase {
  id: string;
  product_id: string;
  product_title: string;
  amount_paid: number;
  currency: string;
  purchased_at: string;
}

export const CATEGORIES = [
  "UI/UX Templates",
  "Code Snippets",
  "Digital Art",
  "E-Books",
  "Video Courses",
  "Copywriting",
  "Marketing Kits",
  "Data Tools",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
