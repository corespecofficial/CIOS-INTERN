export interface Placement {
  id: string;
  interview_id: string;
  recruiter_id: string;
  candidate_id: string;
  candidate_name: string | null;
  candidate_avatar: string | null;
  starting_salary: number | null;
  hire_confirmed_at: string;
  placement_fee: number | null;
  fee_type: string;
  fee_status: string;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
  // joined from interviews
  job_title: string | null;
  company_name: string | null;
}

export interface PlacementStats {
  total_placements: number;
  total_fees_pending: number;
  total_fees_paid: number;
  avg_salary: number;
}

// Fee calculation: 5% of first month salary OR flat ₦50,000
export const FLAT_FEE_NGN = 50000;
export const PERCENTAGE_FEE = 0.05; // 5% of monthly salary (annual / 12 * 5%)
