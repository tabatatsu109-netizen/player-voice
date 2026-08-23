import type { DayAggregate, PeriodComparison } from "./analysis";
import { averageOver, comparePeriods, mean, round1 } from "./analysis";
import { METRICS } from "./metrics";
import { SESSION_TYPE_LABEL, type User } from "./types";

type Cell = string | number | null | undefined;

function escape(v: Cell): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Cell[][]): string {
  return rows.map((r) => r.map(escape).join(",")).join("\r\n");
}

/** Excel で文字化けしないよう BOM 付き UTF-8 で保存 */
export function downloadCsv(filename: string, rows: Cell[][]) {
  const blob = new Blob(["﻿" + toCsv(rows)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const n1 = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : round1(v);

/* ---------------- 1. 日別サマリ ---------------- */
export function csvDailySummary(days: DayAggregate[]): Cell[][] {
  const head: Cell[] = ["日付", "種別", "フォーメーション", "回答人数", "指導者入力数"];
  for (const m of METRICS) {
    head.push(`${m.label}_選手平均`, `${m.label}_選手SD`, `${m.label}_指導者`, `${m.label}_認識差`);
  }
  head.push("フォーメーションのやりやすさ_選手平均");

  const rows: Cell[][] = [head];
  for (const d of days) {
    const row: Cell[] = [
      d.date,
      d.session ? SESSION_TYPE_LABEL[d.session.session_type] : "",
      d.session?.formation ?? "",
      d.playerCount,
      d.coachCount,
    ];
    for (const m of METRICS) {
      const g = d.gaps.find((x) => x.key === m.key);
      row.push(n1(g?.playerAvg), n1(g?.playerSd), n1(g?.coachValue), n1(g?.gap));
    }
    row.push(n1(d.formationComfort));
    rows.push(row);
  }
  return rows;
}

/* ---------------- 2. 項目別ギャップ（期間平均） ---------------- */
export function csvMetricGaps(days: DayAggregate[]): Cell[][] {
  const rows: Cell[][] = [
    ["項目", "選手平均", "指導者平均", "認識差(選手-指導者)", "認識差の大きさ", "比較できた日数"],
  ];
  for (const m of METRICS) {
    const p = averageOver(days, m.key, "playerAvg");
    const c = averageOver(days, m.key, "coachValue");
    const comparable = days.filter(
      (d) => d.gaps.find((g) => g.key === m.key)?.gap !== null,
    ).length;
    rows.push([
      m.label,
      n1(p),
      n1(c),
      p !== null && c !== null ? n1(p - c) : "",
      p !== null && c !== null ? n1(Math.abs(p - c)) : "",
      comparable,
    ]);
  }
  return rows;
}

/* ---------------- 3. 個人別（生データ） ---------------- */
export function csvPerPlayer(days: DayAggregate[], users: User[]): Cell[][] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const head: Cell[] = ["日付", "選手名", "ポジション", "学年"];
  for (const m of METRICS) head.push(m.label);
  head.push("フォーメーションのやりやすさ", "コーチに伝えたいこと", "自由記述");

  const rows: Cell[][] = [head];
  for (const d of days) {
    for (const r of d.playerResponses) {
      const u = byId.get(r.player_id);
      const row: Cell[] = [d.date, u?.name ?? r.player_id, u?.position ?? "", u?.grade ?? ""];
      for (const m of METRICS) row.push(r[m.playerField] as number);
      row.push(r.formation_comfort, r.message ?? "", r.comment ?? "");
      rows.push(row);
    }
  }
  return rows;
}

/* ---------------- 4. 自由記述一覧 ---------------- */
export function csvComments(days: DayAggregate[], users: User[]): Cell[][] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const rows: Cell[][] = [["日付", "立場", "氏名", "種類", "内容"]];
  for (const d of days) {
    for (const r of d.playerResponses) {
      const name = byId.get(r.player_id)?.name ?? r.player_id;
      if (r.message) rows.push([d.date, "選手", name, "コーチに伝えたいこと", r.message]);
      if (r.comment) rows.push([d.date, "選手", name, "自由記述", r.comment]);
    }
    for (const r of d.coachResponses) {
      const name = byId.get(r.coach_id)?.name ?? r.coach_id;
      if (r.message) rows.push([d.date, "指導者", name, "選手に伝えたいこと", r.message]);
      if (r.comment) rows.push([d.date, "指導者", name, "自由記述", r.comment]);
    }
  }
  return rows;
}

/* ---------------- 5. 前半／後半 期間比較 ---------------- */
export function csvPeriodComparison(days: DayAggregate[]): Cell[][] {
  const { firstHalf, secondHalf, rows: cmp } = comparePeriods(days);
  const rows: Cell[][] = [];
  rows.push(["期間", "開始日", "終了日", "日数", "延べ回答人数", "1日あたり平均回答人数"]);
  const summarize = (label: string, list: DayAggregate[]): Cell[] => [
    label,
    list[0]?.date ?? "",
    list[list.length - 1]?.date ?? "",
    list.length,
    list.reduce((a, b) => a + b.playerCount, 0),
    n1(mean(list.map((d) => d.playerCount))),
  ];
  rows.push(summarize("前半", firstHalf));
  rows.push(summarize("後半", secondHalf));
  rows.push([]);
  rows.push([
    "項目",
    "前半_選手平均",
    "後半_選手平均",
    "前半_指導者平均",
    "後半_指導者平均",
    "前半_平均認識差",
    "後半_平均認識差",
    "改善量(前半-後半)",
  ]);
  for (const r of cmp as PeriodComparison[]) {
    rows.push([
      r.label,
      n1(r.firstHalfPlayerAvg),
      n1(r.secondHalfPlayerAvg),
      n1(r.firstHalfCoachAvg),
      n1(r.secondHalfCoachAvg),
      n1(r.firstHalfAbsGap),
      n1(r.secondHalfAbsGap),
      n1(r.improvement),
    ]);
  }
  return rows;
}
