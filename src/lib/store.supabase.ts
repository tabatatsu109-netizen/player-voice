import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CoachAnswer, DataStore, PlayerAnswer, RangeData } from "./store";
import type { CoachResponse, PlayerResponse, Session, Team, User } from "./types";

/**
 * Supabase 実装。テーブル定義は supabase/schema.sql と対応。
 * store.local.ts と同じ DataStore インターフェースなので、画面側の変更は不要。
 */
export function createSupabaseStore(url: string, anonKey: string): DataStore {
  const sb: SupabaseClient = createClient(url, anonKey);

  const unwrap = <T,>(res: { data: T | null; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data as T;
  };

  return {
    mode: "supabase",

    async listTeams() {
      return unwrap(await sb.from("teams").select("*").order("name")) as Team[];
    },

    async getTeamByCode(code) {
      const { data, error } = await sb
        .from("teams")
        .select("*")
        .ilike("join_code", code.trim())
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Team) ?? null;
    },

    async listUsers(teamId) {
      return unwrap(
        await sb
          .from("users")
          .select("*")
          .eq("team_id", teamId)
          .eq("active", true)
          .order("name"),
      ) as User[];
    },

    async createUser({ teamId, name, role, position, grade }) {
      const { data, error } = await sb
        .from("users")
        .insert({
          team_id: teamId,
          name,
          role,
          position: position ?? null,
          grade: grade ?? null,
          active: true,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as User;
    },

    async loadRange(teamId, from, to): Promise<RangeData> {
      const sessions = unwrap(
        await sb
          .from("sessions")
          .select("*")
          .eq("team_id", teamId)
          .gte("date", from)
          .lte("date", to)
          .order("date"),
      ) as Session[];

      if (sessions.length === 0) {
        return { sessions: [], playerResponses: [], coachResponses: [] };
      }
      const ids = sessions.map((s) => s.id);
      const [playerResponses, coachResponses] = await Promise.all([
        sb
          .from("player_responses")
          .select("*")
          .in("session_id", ids)
          .then((r) => unwrap(r) as PlayerResponse[]),
        sb
          .from("coach_responses")
          .select("*")
          .in("session_id", ids)
          .then((r) => unwrap(r) as CoachResponse[]),
      ]);
      return { sessions, playerResponses, coachResponses };
    },

    async ensureSession({ teamId, date, sessionType, formation, notes }) {
      const { data: found, error: findError } = await sb
        .from("sessions")
        .select("*")
        .eq("team_id", teamId)
        .eq("date", date)
        .eq("session_type", sessionType)
        .maybeSingle();
      if (findError) throw new Error(findError.message);

      if (found) {
        const patch: Partial<Session> = {};
        if (formation) patch.formation = formation;
        if (notes) patch.notes = notes;
        if (Object.keys(patch).length === 0) return found as Session;
        const { data, error } = await sb
          .from("sessions")
          .update(patch)
          .eq("id", (found as Session).id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as Session;
      }

      const { data, error } = await sb
        .from("sessions")
        .insert({
          team_id: teamId,
          date,
          session_type: sessionType,
          formation: formation ?? null,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Session;
    },

    async getPlayerResponse(sessionId, playerId) {
      const { data, error } = await sb
        .from("player_responses")
        .select("*")
        .eq("session_id", sessionId)
        .eq("player_id", playerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as PlayerResponse) ?? null;
    },

    async getCoachResponse(sessionId, coachId) {
      const { data, error } = await sb
        .from("coach_responses")
        .select("*")
        .eq("session_id", sessionId)
        .eq("coach_id", coachId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as CoachResponse) ?? null;
    },

    async savePlayerResponse(sessionId, playerId, answer: PlayerAnswer) {
      const { error } = await sb
        .from("player_responses")
        .upsert(
          { session_id: sessionId, player_id: playerId, ...answer },
          { onConflict: "session_id,player_id" },
        );
      if (error) throw new Error(error.message);
    },

    async saveCoachResponse(sessionId, coachId, answer: CoachAnswer) {
      const { error } = await sb
        .from("coach_responses")
        .upsert(
          { session_id: sessionId, coach_id: coachId, ...answer },
          { onConflict: "session_id,coach_id" },
        );
      if (error) throw new Error(error.message);
    },
  };
}
