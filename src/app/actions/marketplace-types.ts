// Shared types and constants for the marketplace feature.
// NOT a "use server" file — safe to import from client components.

export interface Product {
  id: string;
  seller_id: string;
  seller_name: string | null;
  seller_avatar: string | null;
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
