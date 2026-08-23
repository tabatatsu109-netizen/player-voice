import type { CoachResponse, PlayerResponse } from "./types";

export type MetricKey =
  | "condition"
  | "fatigue"
  | "intensity"
  | "effort"
  | "purpose_understanding"
  | "tactical_understanding"
  | "team_mood";

export interface MetricDef {
  key: MetricKey;
  /** 画面に出す短い名前（9文字以内。グラフの軸に入る長さにする） */
  label: string;
  /** 選手側の設問文 */
  playerQuestion: string;
  /** 指導者側の設問文（＝選手がどう感じたかの推定） */
  coachQuestion: string;
  /** 1 の意味 / 10 の意味 */
  low: string;
  high: string;
  playerField: keyof PlayerResponse;
  coachField: keyof CoachResponse;
  /** 差が正（選手 > 指導者）のときの読み取り */
  positiveMeaning: string;
  /** 差が負（選手 < 指導者）のときの読み取り */
  negativeMeaning: string;
  /** 差が大きいときの話し合いのヒント */
  hintPositive: string;
  hintNegative: string;
}

/**
 * 見え方をくらべる7項目。
 * 「どちらが正しいか」ではなく「どう見えているか」を並べるための定義。
 * 画面に出す言葉は、高校生と指導者がそのまま読めるやさしさを優先する。
 */
export const METRICS: MetricDef[] = [
  {
    key: "condition",
    label: "体調",
    playerQuestion: "今日の体調は？",
    coachQuestion: "選手全体の体調はどうだった？",
    low: "かなり悪い",
    high: "とても良い",
    playerField: "condition",
    coachField: "condition_estimate",
    positiveMeaning: "指導者が思っているより、選手は元気です。",
    negativeMeaning: "指導者が思っているより、選手は元気ではありません。",
    hintPositive:
      "選手にはまだ余力がありそうです。強度を上げてよい日か、本人たちに聞いてみましょう。",
    hintNegative:
      "思ったより状態が落ちています。誰がしんどいのか、個人のページで見てみましょう。",
  },
  {
    key: "fatigue",
    label: "つかれ具合",
    playerQuestion: "今日のつかれ具合は？",
    coachQuestion: "選手はどれくらいつかれていると思う？",
    low: "つかれていない",
    high: "限界に近い",
    playerField: "fatigue",
    coachField: "fatigue_estimate",
    positiveMeaning: "指導者が思っているより、選手はつかれています。",
    negativeMeaning: "指導者が思っているより、選手はつかれていません。",
    hintPositive:
      "「まだ走れる」と見えても、選手は限界に近いかもしれません。どの練習が一番きつかったか聞いてみましょう。",
    hintNegative:
      "選手にはまだ余裕があります。量や強度を見直す余地があるか話してみましょう。",
  },
  {
    key: "intensity",
    label: "練習のきつさ",
    playerQuestion: "今日の練習はきつかった？",
    coachQuestion: "今日の練習はどれくらいのきつさにした？",
    low: "とても軽い",
    high: "とてもきつい",
    playerField: "intensity",
    coachField: "intensity",
    positiveMeaning: "指導者が考えたより、選手にはきつい練習になっています。",
    negativeMeaning: "指導者が考えたより、選手は軽く感じています。",
    hintPositive:
      "同じメニューでも、きつさの感じ方は人によってちがいます。どの部分がきつかったかを聞くと、次の練習を作りやすくなります。",
    hintNegative:
      "ねらった負荷がかかっていないかもしれません。メニューの意図を先に伝えてからやってみましょう。",
  },
  {
    key: "effort",
    label: "がんばり具合",
    playerQuestion: "自分はしっかり取り組めた？",
    coachQuestion: "選手はしっかり取り組んでいたと思う？",
    low: "できなかった",
    high: "全力でやれた",
    playerField: "effort",
    coachField: "effort_estimate",
    positiveMeaning:
      "選手はやっているつもりですが、指導者にはそう見えていません。",
    negativeMeaning: "指導者の見方より、選手のほうが自分に厳しく点をつけています。",
    hintPositive:
      "「サボっているように見える」動きにも、理由があるかもしれません。何を考えてその動きをしたのか聞くところから始めましょう。",
    hintNegative:
      "選手は自分に厳しくなっています。できていたところを具体的にほめると、基準がそろいます。",
  },
  {
    key: "purpose_understanding",
    label: "目的が伝わったか",
    playerQuestion: "今日の練習の目的はわかった？",
    coachQuestion: "今日の練習の目的は選手に伝わったと思う？",
    low: "わからない",
    high: "はっきりわかった",
    playerField: "purpose_understanding",
    coachField: "purpose_understanding_estimate",
    positiveMeaning: "指導者が思っている以上に、選手は目的をわかっています。",
    negativeMeaning:
      "指導者は「伝わった」と思っていますが、選手には届いていません。",
    hintNegative:
      "説明を増やすより、順番や言葉を変えるほうが効くかもしれません。練習の最後に「今日は何のための練習だった？」と選手に言わせてみましょう。",
    hintPositive:
      "ねらいはきちんと届いています。次の試合とのつながりまで話せる状態です。",
  },
  {
    key: "tactical_understanding",
    label: "戦術のわかりやすさ",
    playerQuestion: "今日の戦術はどれくらいわかっている？",
    coachQuestion: "選手は戦術をどれくらいわかっていると思う？",
    low: "ほとんどわからない",
    high: "人に説明できる",
    playerField: "tactical_understanding",
    coachField: "tactical_understanding_estimate",
    positiveMeaning: "指導者が思っている以上に、選手は戦術をわかっています。",
    negativeMeaning:
      "指導者は「わかっているはず」と思っていますが、実際はまだ届いていません。",
    hintNegative:
      "わかっているつもりで進めると、試合中の判断がそろいません。1つの場面だけを図や動画で切り取って確認してみましょう。",
    hintPositive:
      "土台はできています。選手側から「こうしたい」を引き出せる状態です。",
  },
  {
    key: "team_mood",
    label: "チームの雰囲気",
    playerQuestion: "今日のチームの雰囲気は？",
    coachQuestion: "今日のチームの雰囲気はどうだった？",
    low: "とても重い",
    high: "とても良い",
    playerField: "team_mood",
    coachField: "team_mood_estimate",
    positiveMeaning: "指導者が思っているより、選手が感じる空気は良いです。",
    negativeMeaning: "指導者が思っているより、選手が感じる空気は重いです。",
    hintNegative:
      "外から見える雰囲気と、中にいる感覚はちがいます。その日に何があったのか、書いてくれた言葉を読んでみましょう。",
    hintPositive:
      "選手の手ごたえは良さそうです。何が良かったのかを言葉にしておくと、また同じ状態を作れます。",
  },
];

export const METRIC_BY_KEY: Record<MetricKey, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.key, m])
) as Record<MetricKey, MetricDef>;

/** 選手だけに聞く項目（くらべる相手がいない） */
export const FORMATION_COMFORT = {
  label: "フォーメーションのやりやすさ",
  playerQuestion: "今日のフォーメーションはプレーしやすかった？",
  low: "やりにくい",
  high: "やりやすい",
};

export type GapLevel = "aligned" | "slight" | "wide" | "critical";

export function gapLevel(absGap: number): GapLevel {
  if (absGap >= 3) return "critical";
  if (absGap >= 2) return "wide";
  if (absGap >= 1) return "slight";
  return "aligned";
}

export const GAP_LEVEL_LABEL: Record<GapLevel, string> = {
  aligned: "だいたい同じ",
  slight: "少しちがう",
  wide: "けっこうちがう",
  critical: "話し合おう",
};

/** Tailwind クラス（背景・文字） */
export const GAP_LEVEL_CLASS: Record<GapLevel, string> = {
  aligned: "bg-slate-100 text-slate-600 border-slate-200",
  slight: "bg-amber-50 text-amber-700 border-amber-200",
  wide: "bg-orange-50 text-orange-700 border-orange-300",
  critical: "bg-red-50 text-red-700 border-red-300",
};

export const GAP_LEVEL_BAR: Record<GapLevel, string> = {
  aligned: "bg-slate-400",
  slight: "bg-amber-400",
  wide: "bg-orange-500",
  critical: "bg-red-500",
};

/** 差の向きに応じた読み取り文 */
export function interpret(def: MetricDef, gap: number): string {
  if (Math.abs(gap) < 1) return "選手と指導者で、見え方はほぼ同じです。";
  return gap > 0 ? def.positiveMeaning : def.negativeMeaning;
}

/** 差の向きに応じた話し合いのヒント */
export function hint(def: MetricDef, gap: number): string | null {
  if (Math.abs(gap) < 2) return null;
  return gap > 0 ? def.hintPositive : def.hintNegative;
}
