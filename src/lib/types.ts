export type Role = "player" | "coach" | "admin";
export type SessionType = "practice" | "match" | "training_game";

export interface Team {
  id: string;
  name: string;
  join_code: string;
}

export interface User {
  id: string;
  team_id: string;
  name: string;
  role: Role;
  position?: string | null;
  grade?: number | null;
  active: boolean;
}

export interface Session {
  id: string;
  team_id: string;
  date: string; // YYYY-MM-DD
  session_type: SessionType;
  formation?: string | null;
  notes?: string | null;
}

export interface PlayerResponse {
  id: string;
  session_id: string;
  player_id: string;
  condition: number;
  fatigue: number;
  intensity: number;
  effort: number;
  purpose_understanding: number;
  tactical_understanding: number;
  team_mood: number;
  formation_comfort: number;
  message?: string | null;
  comment?: string | null;
  created_at: string;
}

export interface CoachResponse {
  id: string;
  session_id: string;
  coach_id: string;
  condition_estimate: number;
  fatigue_estimate: number;
  intensity: number;
  effort_estimate: number;
  purpose_understanding_estimate: number;
  tactical_understanding_estimate: number;
  team_mood_estimate: number;
  session_rating: number;
  message?: string | null;
  comment?: string | null;
  created_at: string;
}

/** ログイン中のユーザー（localStorage に保持） */
export interface AuthState {
  userId: string;
  teamId: string;
  name: string;
  role: Role;
}

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  practice: "練習",
  match: "公式戦",
  training_game: "練習試合",
};

export const FORMATIONS = [
  "4-4-2",
  "4-3-3",
  "4-2-3-1",
  "3-5-2",
  "3-4-3",
  "5-3-2",
  "その他",
];
