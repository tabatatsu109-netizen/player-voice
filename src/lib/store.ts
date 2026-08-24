import { createLocalStore } from "./store.local";
import { createSupabaseStore } from "./store.supabase";
import type {
  CoachResponse,
  PlayerResponse,
  Session,
  SessionType,
  Team,
  User,
  WeeklyPlan,
} from "./types";

export interface RangeData {
  sessions: Session[];
  playerResponses: PlayerResponse[];
  coachResponses: CoachResponse[];
}

export type PlayerAnswer = Omit<
  PlayerResponse,
  "id" | "session_id" | "player_id" | "created_at"
>;
export type CoachAnswer = Omit<
  CoachResponse,
  "id" | "session_id" | "coach_id" | "created_at"
>;

export interface DataStore {
  readonly mode: "demo" | "supabase";
  listTeams(): Promise<Team[]>;
  getTeamByCode(code: string): Promise<Team | null>;
  listUsers(teamId: string): Promise<User[]>;
  createUser(input: {
    teamId: string;
    name: string;
    role: User["role"];
    position?: string | null;
    grade?: number | null;
  }): Promise<User>;
  /** from〜to（YYYY-MM-DD、両端含む）の全データ */
  loadRange(teamId: string, from: string, to: string): Promise<RangeData>;
  /** 同日・同種のセッションがあれば返し、なければ作る */
  ensureSession(input: {
    teamId: string;
    date: string;
    sessionType: SessionType;
    formation?: string | null;
    notes?: string | null;
  }): Promise<Session>;
  getPlayerResponse(
    sessionId: string,
    playerId: string
  ): Promise<PlayerResponse | null>;
  getCoachResponse(
    sessionId: string,
    coachId: string
  ): Promise<CoachResponse | null>;
  savePlayerResponse(
    sessionId: string,
    playerId: string,
    answer: PlayerAnswer
  ): Promise<void>;
  saveCoachResponse(
    sessionId: string,
    coachId: string,
    answer: CoachAnswer
  ): Promise<void>;
  saveWeeklyPlan(teamId: string, plan: WeeklyPlan): Promise<void>;
  getWeeklyPlan(
    teamId: string,
    weekStart: string
  ): Promise<WeeklyPlan | null>;
  listWeeklyPlans(teamId: string, limit?: number): Promise<WeeklyPlan[]>;
  /** デモモードのみ：サンプルデータを作り直す */
  reseed?(): Promise<void>;
}

let cached: DataStore | null = null;

/**
 * 環境変数が設定されていれば Supabase、なければデモモード（localStorage）。
 * プレゼン当日に接続が使えなくても画面が動くようにするための切り替え。
 */
export function getStore(): DataStore {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && key ? createSupabaseStore(url, key) : createLocalStore();
  return cached;
}
