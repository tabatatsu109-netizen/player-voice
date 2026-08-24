import { addDays, today } from "./date";
import type { CoachAnswer, DataStore, PlayerAnswer, RangeData } from "./store";
import type {
  CoachResponse,
  PlayerResponse,
  Session,
  SessionType,
  Team,
  User,
  WeeklyPlan,
} from "./types";

const KEY = "player-voice-db-v3";

interface DB {
  teams: Team[];
  users: User[];
  sessions: Session[];
  playerResponses: PlayerResponse[];
  coachResponses: CoachResponse[];
  weeklyPlans: WeeklyPlan[];
}

/* ------------------------------------------------------------------ */
/* 乱数（毎回同じサンプルデータになるよう種を固定）                      */
/* ------------------------------------------------------------------ */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** 平均 center・広がり spread の 1〜10 の整数を返す */
function score(rng: () => number, center: number, spread = 1.2): number {
  const g = (rng() + rng() + rng() - 1.5) * 2; // ざっくり正規分布に近づける
  return Math.max(1, Math.min(10, Math.round(center + g * spread)));
}

let uidCounter = 0;
function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}_${uidCounter.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/* ------------------------------------------------------------------ */
/* サンプルデータ生成                                                   */
/* ------------------------------------------------------------------ */

const PLAYER_NAMES = [
  "阿部 蓮",
  "石川 悠真",
  "植松 孝弘",
  "大西 陽翔",
  "川口 湊",
  "佐藤 大和",
  "鈴木 蒼真",
  "高橋 律",
  "田中 陽向",
  "中村 颯",
  "西村 樹",
  "橋本 湊斗",
  "藤原 奏太",
  "松本 陽大",
  "森 一颯",
  "山口 蓮斗",
  "山田 悠斗",
  "吉田 朝陽",
  "渡辺 陸",
];

const POSITIONS = ["GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW"];

const PLAYER_COMMENTS = [
  "他のチームがグラウンドを使っていたので、ストレッチをしながら待っていました。勝手にアップを始めていいのか分かりませんでした。",
  "正直、足がかなり重いです。昨日の走りが残っています。",
  "4-4-2の方が守備のときの立ち位置が分かりやすいです。",
  "今日のメニューの狙いが途中まで分かりませんでした。最初に説明があると助かります。",
  "ミスした後に声が止まってしまう時間がありました。",
  "自分なりに全力でやったつもりですが、伝わっていない気がします。",
  "3-5-2のときにサイドが1人になるので、戻るのがきついです。",
  "紅白戦は強度が上がって良かったです。",
  "テストが近くて睡眠時間が短いです。",
  "戦術の話をもう一度、図で見せてほしいです。",
  "",
  "",
  "",
];

const COACH_COMMENTS = [
  "全体的に強度は狙い通り。もう少し球際で戦ってほしい。",
  "アップの入りが遅い。自分たちで判断して動き出してほしい。",
  "3-5-2の狙いは繰り返し伝えている。理解は進んでいるはず。",
  "疲労は見えるが、この時期は乗り越えてほしい。",
  "紅白戦の質は良かった。",
  "",
  "",
];

function pick(rng: () => number, list: string[]): string {
  return list[Math.floor(rng() * list.length)] ?? "";
}

function seedDB(): DB {
  const rng = makeRng(20260401);
  const team: Team = {
    id: "team_demo",
    name: "韮崎高校サッカー部",
    join_code: "NIRASAKI",
  };

  const users: User[] = [
    { id: "coach_1", team_id: team.id, name: "監督 佐々木", role: "coach", active: true },
    { id: "coach_2", team_id: team.id, name: "コーチ 大村", role: "coach", active: true },
    { id: "admin_1", team_id: team.id, name: "管理者（研究担当）", role: "admin", active: true },
    ...PLAYER_NAMES.map((name, i) => ({
      id: `player_${i + 1}`,
      team_id: team.id,
      name,
      role: "player" as const,
      position: POSITIONS[i % POSITIONS.length],
      grade: (i % 3) + 1,
      active: true,
    })),
  ];

  const players = users.filter((u) => u.role === "player");
  const coaches = users.filter((u) => u.role === "coach");

  const sessions: Session[] = [];
  const playerResponses: PlayerResponse[] = [];
  const coachResponses: CoachResponse[] = [];

  const end = today();
  const DAYS = 30;

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const [y, m, d] = date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    if (dow === 1) continue; // 月曜はオフ

    const progress = (DAYS - 1 - i) / (DAYS - 1); // 0 → 1
    const isMatch = dow === 0;
    const sessionType: SessionType = isMatch ? "training_game" : "practice";
    const formation = progress < 0.5 ? "4-4-2" : "3-5-2";

    const session: Session = {
      id: `sess_${date}`,
      team_id: team.id,
      date,
      session_type: sessionType,
      formation,
      notes: isMatch
        ? "練習試合（40分ハーフ）"
        : progress < 0.5
          ? "ビルドアップの原則づくり"
          : "3-5-2でのサイドの守備",
    };
    sessions.push(session);

    // 出席率およそ 85〜100%
    const attending = players.filter(() => rng() > 0.12);

    // ---- 検証したい4ケースを再現する形で認識差を設計 ----
    // 期間の後半ほど差が縮む（対話が生まれた効果を想定）
    const shrink = 1 - progress * 0.25;
    const fatigueCenter = (isMatch ? 8.3 : 7.6) - progress * 0.3;
    const intensityCenter = isMatch ? 8.1 : 7.4;

    for (const p of players) {
      if (!attending.includes(p)) continue;
      const personal = (Number(p.id.split("_")[1]) % 5) - 2; // 個人差 -2〜+2
      playerResponses.push({
        id: uid("pr"),
        session_id: session.id,
        player_id: p.id,
        condition: score(rng, 6.4 - personal * 0.2, 1.4),
        fatigue: score(rng, fatigueCenter + personal * 0.25, 1.3),
        intensity: score(rng, intensityCenter, 1.2),
        effort: score(rng, 7.9, 1.1),
        purpose_understanding: score(rng, 5.8 + progress * 1.0, 1.5),
        tactical_understanding: score(rng, 5.1 + progress * 0.9, 1.5),
        team_mood: score(rng, 6.5, 1.4),
        formation_comfort: score(rng, formation === "4-4-2" ? 7.4 : 5.4, 1.5),
        message: rng() > 0.75 ? pick(rng, PLAYER_COMMENTS) : "",
        comment: rng() > 0.82 ? pick(rng, PLAYER_COMMENTS) : "",
        created_at: `${date}T19:30:00`,
      });
    }

    const respondingCoaches = rng() > 0.6 ? coaches : [coaches[0]];
    for (const c of respondingCoaches) {
      coachResponses.push({
        id: uid("cr"),
        session_id: session.id,
        coach_id: c.id,
        condition_estimate: score(rng, 6.9, 0.9),
        // 疲労を低く見積もる（ケース2）
        fatigue_estimate: score(rng, fatigueCenter - 3.2 * shrink, 0.9),
        // 強度は「軽め」のつもり
        intensity: score(rng, intensityCenter - 1.8 * shrink, 0.8),
        // 取り組みは選手の自己評価より低く見る（ケース4）
        effort_estimate: score(rng, 7.9 - 2.4 * shrink, 0.9),
        // 「伝わったはず」と高く見積もる（ケース1）
        purpose_understanding_estimate: score(rng, 8.4, 0.8),
        // 戦術理解も高く見積もる（ケース3）
        tactical_understanding_estimate: score(rng, 8.1, 0.8),
        team_mood_estimate: score(rng, 7.2, 0.9),
        session_rating: score(rng, 7.0, 1.0),
        message: rng() > 0.7 ? pick(rng, COACH_COMMENTS) : "",
        comment: rng() > 0.8 ? pick(rng, COACH_COMMENTS) : "",
        created_at: `${date}T21:00:00`,
      });
    }
  }

  return { teams: [team], users, sessions, playerResponses, coachResponses };
}

/* ------------------------------------------------------------------ */
/* localStorage 実装                                                    */
/* ------------------------------------------------------------------ */

const EMPTY: DB = {
  teams: [],
  users: [],
  sessions: [],
  playerResponses: [],
  coachResponses: [],
  weeklyPlans: [],
};

function read(): DB {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as DB;
    } catch {
      /* 壊れていたら作り直す */
    }
  }
  const db = seedDB();
  window.localStorage.setItem(KEY, JSON.stringify(db));
  return db;
}

function write(db: DB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
}

export function createLocalStore(): DataStore {
  return {
    mode: "demo",

    async listTeams() {
      return read().teams;
    },

    async getTeamByCode(code) {
      const c = code.trim().toUpperCase();
      return read().teams.find((t) => t.join_code.toUpperCase() === c) ?? null;
    },

    async listUsers(teamId) {
      return read().users.filter((u) => u.team_id === teamId && u.active);
    },

    async createUser({ teamId, name, role, position, grade }) {
      const db = read();
      const user: User = {
        id: uid("u"),
        team_id: teamId,
        name,
        role,
        position: position ?? null,
        grade: grade ?? null,
        active: true,
      };
      db.users.push(user);
      write(db);
      return user;
    },

    async loadRange(teamId, from, to): Promise<RangeData> {
      const db = read();
      const sessions = db.sessions.filter(
        (s) => s.team_id === teamId && s.date >= from && s.date <= to,
      );
      const ids = new Set(sessions.map((s) => s.id));
      return {
        sessions,
        playerResponses: db.playerResponses.filter((r) => ids.has(r.session_id)),
        coachResponses: db.coachResponses.filter((r) => ids.has(r.session_id)),
      };
    },

    async ensureSession({ teamId, date, sessionType, formation, notes }) {
      const db = read();
      const found = db.sessions.find(
        (s) => s.team_id === teamId && s.date === date && s.session_type === sessionType,
      );
      if (found) {
        if (formation) found.formation = formation;
        if (notes) found.notes = notes;
        write(db);
        return found;
      }
      const session: Session = {
        id: uid("sess"),
        team_id: teamId,
        date,
        session_type: sessionType,
        formation: formation ?? null,
        notes: notes ?? null,
      };
      db.sessions.push(session);
      write(db);
      return session;
    },

    async getPlayerResponse(sessionId, playerId) {
      return (
        read().playerResponses.find(
          (r) => r.session_id === sessionId && r.player_id === playerId,
        ) ?? null
      );
    },

    async getCoachResponse(sessionId, coachId) {
      return (
        read().coachResponses.find(
          (r) => r.session_id === sessionId && r.coach_id === coachId,
        ) ?? null
      );
    },

    async savePlayerResponse(sessionId, playerId, answer: PlayerAnswer) {
      const db = read();
      const idx = db.playerResponses.findIndex(
        (r) => r.session_id === sessionId && r.player_id === playerId,
      );
      const row: PlayerResponse = {
        id: idx >= 0 ? db.playerResponses[idx].id : uid("pr"),
        session_id: sessionId,
        player_id: playerId,
        created_at: new Date().toISOString(),
        ...answer,
      };
      if (idx >= 0) db.playerResponses[idx] = row;
      else db.playerResponses.push(row);
      write(db);
    },

    async saveCoachResponse(sessionId, coachId, answer: CoachAnswer) {
      const db = read();
      const idx = db.coachResponses.findIndex(
        (r) => r.session_id === sessionId && r.coach_id === coachId,
      );
      const row: CoachResponse = {
        id: idx >= 0 ? db.coachResponses[idx].id : uid("cr"),
        session_id: sessionId,
        coach_id: coachId,
        created_at: new Date().toISOString(),
        ...answer,
      };
      if (idx >= 0) db.coachResponses[idx] = row;
      else db.coachResponses.push(row);
      write(db);
    },

    async saveWeeklyPlan(teamId, plan) {
      const db = read();
      const idx = db.weeklyPlans.findIndex(
        (p) => p.team_id === teamId && p.week_start === plan.week_start,
      );
      if (idx >= 0) db.weeklyPlans[idx] = plan;
      else db.weeklyPlans.push(plan);
      write(db);
    },

    async getWeeklyPlan(teamId, weekStart) {
      return (
        read().weeklyPlans.find(
          (p) => p.team_id === teamId && p.week_start === weekStart,
        ) ?? null
      );
    },

    async listWeeklyPlans(teamId, limit = 4) {
      const plans = read().weeklyPlans
        .filter((p) => p.team_id === teamId)
        .sort((a, b) => b.week_start.localeCompare(a.week_start));
      return plans.slice(0, limit);
    },

    async reseed() {
      write(seedDB());
    },
  };
}
