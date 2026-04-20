export interface InterviewQuestion {
  id: string;
  question: string;
  type: "behavioral" | "technical" | "situational";
  tip?: string;
}

export interface QuestionFeedback {
  questionId: string;
  score: number;
  strengths: string;
  improvements: string;
  sampleAnswer: string;
}

export const TRACKS = [
  "UI/UX Design",
  "Web Development",
  "Digital Marketing",
  "Data Analytics",
  "Video Editing",
  "Copywriting",
  "AI & Automation",
  "Business Development",
] as const;

export type Track = (typeof TRACKS)[number];
