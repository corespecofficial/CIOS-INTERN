export interface WellnessCheckin {
  id: string;
  user_id: string;
  week_of: string;
  mood: number;
  stress: number;
  energy: number;
  notes: string | null;
  created_at: string;
}

export interface WellnessAggregate {
  week_of: string;
  avg_mood: number;
  avg_stress: number;
  avg_energy: number;
  count: number;
}

export const MOOD_LABELS = ["", "😞 Struggling", "😕 Low", "😐 Okay", "🙂 Good", "😄 Great"] as const;
export const STRESS_LABELS = ["", "😌 Very Calm", "🧘 Calm", "😤 Moderate", "😰 Stressed", "🤯 Overwhelmed"] as const;
export const ENERGY_LABELS = ["", "🪫 Drained", "😴 Tired", "⚡ Average", "💪 Energized", "🚀 Pumped"] as const;
