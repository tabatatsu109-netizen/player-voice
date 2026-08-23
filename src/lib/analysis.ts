import { METRICS, type MetricDef, type MetricKey, gapLevel, type GapLevel } from "./metrics";
import type { CoachResponse, PlayerResponse, Session } from "./types";

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** 母標準偏差（チーム内のばらつき） */
export function sd(values: number[]): number | null {
  const m = mean(values);
  if (m === null || values.length === 0) return null;
  const v = values.reduce((a, b) => a + (b - m) ** 2, 0) / values.length;
  return Math.sqrt(v);
}

export function round1(n: number | null): number | null {
  return n === null ? null : Math.round(n * 10) / 10;
}

/** 画面表示用。小数第1位で桁をそろえる（6 ではなく 6.0 と出す） */
export function fmt1(n: number | null | undefined): string | null {
  return n === null || n === undefined ? null : n.toFixed(1);
}

export interface MetricGap {
  def: MetricDef;
  key: MetricKey;
  /** 選手平均（回答0人なら null） */
  playerAvg: number | null;
  /** 選手間のばらつき */
  playerSd: number | null;
  /** 指導者評価（未入力なら null） */
  coachValue: number | null;
  /** 選手平均 − 指導者評価（どちらか欠けたら null＝未比較） */
  gap: number | null;
  absGap: number | null;
  level: GapLevel | null;
}

/** 1セッション分（＝ある日）の全項目の認識差 */
export function computeGaps(
  players: PlayerResponse[],
  coaches: CoachResponse[]
): MetricGap[] {
  return METRICS.map((def) => {
    const pVals = players
      .map((p) => p[def.playerField] as number)
      .filter((v): v is number => typeof v === "number");
    const cVals = coaches
      .map((c) => c[def.coachField] as number)
      .filter((v): v is number => typeof v === "number");

    const playerAvg = mean(pVals);
    const coachValue = mean(cVals);
    const gap =
      playerAvg !== null && coachValue !== null ? playerAvg - coachValue : null;

    return {
      def,
      key: def.key,
      playerAvg,
      playerSd: sd(pVals),
      coachValue,
      gap,
      absGap: gap === null ? null : Math.abs(gap),
      level: gap === null ? null : gapLevel(Math.abs(gap)),
    };
  });
}

/** 認識差が大きい上位 n 項目（未比較は除外） */
export function topGaps(gaps: MetricGap[], n = 3): MetricGap[] {
  return gaps
    .filter((g) => g.absGap !== null)
    .sort((a, b) => (b.absGap ?? 0) - (a.absGap ?? 0))
    .slice(0, n);
}

export interface DayAggregate {
  date: string;
  session: Session | null;
  playerCount: number;
  coachCount: number;
  gaps: MetricGap[];
  /** 選手のみの設問 */
  formationComfort: number | null;
  playerResponses: PlayerResponse[];
  coachResponses: CoachResponse[];
}

export interface AggregateInput {
  sessions: Session[];
  playerResponses: PlayerResponse[];
  coachResponses: CoachResponse[];
}

/** 日付ごとに集計（同日に複数セッションがある場合はまとめて1日として扱う） */
export function aggregateByDate(input: AggregateInput): DayAggregate[] {
  const sessionsByDate = new Map<string, Session[]>();
  for (const s of input.sessions) {
    const arr = sessionsByDate.get(s.date) ?? [];
    arr.push(s);
    sessionsByDate.set(s.date, arr);
  }

  const dates = [...sessionsByDate.keys()].sort();
  return dates.map((date) => {
    const ids = new Set((sessionsByDate.get(date) ?? []).map((s) => s.id));
    const players = input.playerResponses.filter((r) => ids.has(r.session_id));
    const coaches = input.coachResponses.filter((r) => ids.has(r.session_id));
    const comfort = mean(players.map((p) => p.formation_comfort));
    return {
      date,
      session: (sessionsByDate.get(date) ?? [])[0] ?? null,
      playerCount: players.length,
      coachCount: coaches.length,
      gaps: computeGaps(players, coaches),
      formationComfort: comfort,
      playerResponses: players,
      coachResponses: coaches,
    };
  });
}

/** 推移グラフ用の1行 */
export interface TrendPoint {
  date: string;
  label: string;
  playerCount: number;
  [key: string]: string | number | null;
}

/**
 * 期間比較：運用期間を前半／後半に2分割し、項目ごとの平均 |認識差| を比べる。
 * 改善量 = 前半の平均|G| − 後半の平均|G|（正なら認識差が縮まった）
 */
export interface PeriodComparison {
  key: MetricKey;
  label: string;
  firstHalfAbsGap: number | null;
  secondHalfAbsGap: number | null;
  improvement: number | null;
  firstHalfPlayerAvg: number | null;
  secondHalfPlayerAvg: number | null;
  firstHalfCoachAvg: number | null;
  secondHalfCoachAvg: number | null;
}

export interface PeriodSplit {
  firstHalf: DayAggregate[];
  secondHalf: DayAggregate[];
  rows: PeriodComparison[];
}

export function comparePeriods(days: DayAggregate[]): PeriodSplit {
  const usable = days.filter((d) => d.playerCount > 0);
  const mid = Math.ceil(usable.length / 2);
  const firstHalf = usable.slice(0, mid);
  const secondHalf = usable.slice(mid);

  const pick = (
    list: DayAggregate[],
    key: MetricKey,
    field: "absGap" | "playerAvg" | "coachValue"
  ) =>
    mean(
      list
        .map((d) => d.gaps.find((g) => g.key === key)?.[field] ?? null)
        .filter((v): v is number => v !== null)
    );

  const rows: PeriodComparison[] = METRICS.map((def) => {
    const a = pick(firstHalf, def.key, "absGap");
    const b = pick(secondHalf, def.key, "absGap");
    return {
      key: def.key,
      label: def.label,
      firstHalfAbsGap: a,
      secondHalfAbsGap: b,
      improvement: a !== null && b !== null ? a - b : null,
      firstHalfPlayerAvg: pick(firstHalf, def.key, "playerAvg"),
      secondHalfPlayerAvg: pick(secondHalf, def.key, "playerAvg"),
      firstHalfCoachAvg: pick(firstHalf, def.key, "coachValue"),
      secondHalfCoachAvg: pick(secondHalf, def.key, "coachValue"),
    };
  });

  return { firstHalf, secondHalf, rows };
}

/** 期間全体の平均（ダッシュボードの見出し数値用） */
export function averageOver(
  days: DayAggregate[],
  key: MetricKey,
  side: "playerAvg" | "coachValue" | "absGap"
): number | null {
  return mean(
    days
      .map((d) => d.gaps.find((g) => g.key === key)?.[side] ?? null)
      .filter((v): v is number => v !== null)
  );
}
