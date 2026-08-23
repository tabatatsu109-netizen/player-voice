"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import GapRow from "@/components/GapRow";
import StatCard from "@/components/StatCard";
import GapBarChart from "@/components/charts/GapBarChart";
import TrendChart from "@/components/charts/TrendChart";
import { fmt1, round1, topGaps } from "@/lib/analysis";
import { shortLabel } from "@/lib/date";
import { GAP_LEVEL_LABEL, METRICS } from "@/lib/metrics";
import { SESSION_TYPE_LABEL } from "@/lib/types";
import { useTeamData } from "@/lib/useTeamData";

type Range = 7 | 30;

export default function DashboardPage() {
  const [range, setRange] = useState<Range>(7);
  const { users, days, loading, error } = useTeamData(range);

  const byId = useMemo(
    () => new Map(users.map((u) => [u.id, u])),
    [users],
  );

  const latest = days.length > 0 ? days[days.length - 1] : null;
  const latestTop3 = latest ? topGaps(latest.gaps, 3) : [];

  const conditionToday = latest?.gaps.find((g) => g.key === "condition") ?? null;
  const fatigueToday = latest?.gaps.find((g) => g.key === "fatigue") ?? null;

  // 推移グラフ用
  const trend = useMemo(
    () =>
      days.map((d) => {
        const get = (k: string, side: "playerAvg" | "coachValue") =>
          d.gaps.find((g) => g.key === k)?.[side] ?? null;
        return {
          label: shortLabel(d.date),
          回答人数: d.playerCount,
          選手_体調: round1(get("condition", "playerAvg")),
          指導者_体調: round1(get("condition", "coachValue")),
          選手_疲労: round1(get("fatigue", "playerAvg")),
          指導者_疲労: round1(get("fatigue", "coachValue")),
          選手_戦術理解: round1(get("tactical_understanding", "playerAvg")),
          指導者_戦術理解: round1(get("tactical_understanding", "coachValue")),
        };
      }),
    [days],
  );

  // 自由記述（新しい順）
  const comments = useMemo(() => {
    const out: {
      date: string;
      side: "player" | "coach";
      name: string;
      kind: string;
      text: string;
    }[] = [];
    for (const d of days) {
      for (const r of d.playerResponses) {
        const name = byId.get(r.player_id)?.name ?? "選手";
        if (r.message)
          out.push({ date: d.date, side: "player", name, kind: "コーチに伝えたいこと", text: r.message });
        if (r.comment)
          out.push({ date: d.date, side: "player", name, kind: "自由記述", text: r.comment });
      }
      for (const r of d.coachResponses) {
        const name = byId.get(r.coach_id)?.name ?? "指導者";
        if (r.message)
          out.push({ date: d.date, side: "coach", name, kind: "選手に伝えたいこと", text: r.message });
        if (r.comment)
          out.push({ date: d.date, side: "coach", name, kind: "自由記述", text: r.comment });
      }
    }
    return out.reverse();
  }, [days, byId]);

  const activeDays = days.filter((d) => d.playerCount > 0);
  const totalPlayers = users.filter((u) => u.role === "player").length;

  return (
    <AppShell requireTeamData title="チームのまとめ">
      {/* 期間切替 */}
      <div className="mb-3 flex gap-2">
        {([7, 30] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold ${
              range === r
                ? "bg-teal-700 text-white"
                : "border border-slate-300 bg-white text-slate-600"
            }`}
          >
            過去{r}日間
          </button>
        ))}
      </div>

      {/* 初めて見る人でも読み方が分かるように、いちばん上に置く */}
      <details className="mb-3 rounded-xl border border-teal-200 bg-teal-50 p-3">
        <summary className="cursor-pointer text-xs font-bold text-teal-900">
          このページの見方（はじめての人へ）
        </summary>
        <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-teal-900">
          <p>
            <span className="rounded bg-sky-100 px-1 font-bold text-sky-800">青</span>
            が選手の平均、
            <span className="rounded bg-violet-100 px-1 font-bold text-violet-800">紫</span>
            が指導者のつけた点数です。どちらも1〜10でつけています。
          </p>
          <p>
            2つの点数の差が大きいほど、「同じ練習なのに、見えているものがちがう」ということ。
            差が2.0以上になると色がつきます。
          </p>
          <p className="font-bold">
            正解を決めるための点数ではありません。「なんでそう思ったの？」と聞くきっかけとして使ってください。
          </p>
        </div>
      </details>

      {loading && <p className="py-10 text-center text-sm text-slate-400">集計中…</p>}
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>
      )}

      {!loading && !latest && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">
          まだデータがありません。選手と指導者の入力が集まると、ここに表示されます。
        </p>
      )}

      {!loading && latest && (
        <>
          {/* 最新日のサマリ */}
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-black text-slate-800">
              最新（{shortLabel(latest.date)}
              {latest.session ? `・${SESSION_TYPE_LABEL[latest.session.session_type]}` : ""}）
            </h2>
            <Link
              href={`/compare?date=${latest.date}`}
              className="text-xs font-bold text-teal-700"
            >
              この日をくわしく見る →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard
              label="答えた人数"
              value={latest.playerCount}
              unit="人"
              hint={`部員 ${totalPlayers}人のうち`}
            />
            <StatCard
              label="みんなの体調（平均）"
              value={fmt1(conditionToday?.playerAvg)}
              tone="player"
              hint={
                conditionToday?.coachValue != null
                  ? `指導者の見方 ${fmt1(conditionToday.coachValue)}`
                  : "指導者未入力"
              }
            />
            <StatCard
              label="みんなのつかれ具合（平均）"
              value={fmt1(fatigueToday?.playerAvg)}
              tone="player"
              hint={
                fatigueToday?.coachValue != null
                  ? `指導者の見方 ${fmt1(fatigueToday.coachValue)}`
                  : "指導者未入力"
              }
            />
            <StatCard
              label="つかれ具合のちがい"
              value={
                fatigueToday?.gap != null
                  ? `${fatigueToday.gap > 0 ? "+" : ""}${fmt1(fatigueToday.gap)}`
                  : null
              }
              tone={
                fatigueToday?.absGap != null && fatigueToday.absGap >= 2
                  ? "alert"
                  : "default"
              }
              hint="選手の平均 − 指導者"
            />
          </div>

          {/* 認識差 上位3項目 */}
          <section className="mt-5">
            <h2 className="mb-1 text-sm font-black text-slate-800">
              いま、いちばん見え方がちがう3つ
            </h2>
            <p className="mb-2 text-[11px] text-slate-500">
どちらが正しいかではなく、「なんでそう思った？」と聞くきっかけにしてください。
            </p>
            {latestTop3.length === 0 ? (
              <p className="rounded-xl bg-white p-4 text-xs text-slate-500">
この日はまだ指導者が入力していないので、くらべられません。
              </p>
            ) : (
              <div className="space-y-2">
                {latestTop3.map((g, i) => (
                  <GapRow key={g.key} gap={g} defaultOpen={i === 0} />
                ))}
              </div>
            )}
          </section>

          {/* 全項目の認識差 */}
          <section className="mt-5 rounded-xl bg-white p-3">
            <h2 className="mb-1 text-sm font-black text-slate-800">
              いちばん新しい日のちがい（7項目）
            </h2>
            <GapBarChart gaps={latest.gaps} />
          </section>

          {/* 推移 */}
          <section className="mt-5 space-y-4">
            <h2 className="text-sm font-black text-slate-800">
              この{range}日間の動き
            </h2>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">つかれ具合</p>
              <TrendChart
                data={trend}
                series={[
                  { dataKey: "選手_疲労", name: "選手の平均", color: "#0284c7" },
                  { dataKey: "指導者_疲労", name: "指導者の見方", color: "#7c3aed", dashed: true },
                ]}
              />
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">体調</p>
              <TrendChart
                data={trend}
                series={[
                  { dataKey: "選手_体調", name: "選手の平均", color: "#0284c7" },
                  { dataKey: "指導者_体調", name: "指導者の見方", color: "#7c3aed", dashed: true },
                ]}
              />
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">戦術のわかりやすさ</p>
              <TrendChart
                data={trend}
                series={[
                  { dataKey: "選手_戦術理解", name: "選手の平均", color: "#0284c7" },
                  { dataKey: "指導者_戦術理解", name: "指導者の見方", color: "#7c3aed", dashed: true },
                ]}
              />
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">回答人数</p>
              <TrendChart
                data={trend}
                series={[{ dataKey: "回答人数", name: "回答人数", color: "#0d9488" }]}
                height={140}
                domain={[0, Math.max(totalPlayers, 1)]}
              />
            </div>
          </section>

          {/* 期間平均のギャップ一覧 */}
          <section className="mt-5">
            <h2 className="mb-2 text-sm font-black text-slate-800">
              この{range}日間の平均で見たちがい
            </h2>
            <div className="overflow-x-auto rounded-xl bg-white">
              <table className="w-full min-w-[420px] text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left font-bold">項目</th>
                    <th className="px-2 py-2 text-right font-bold">選手</th>
                    <th className="px-2 py-2 text-right font-bold">指導者</th>
                    <th className="px-2 py-2 text-right font-bold">ちがい</th>
                    <th className="px-2 py-2 text-right font-bold">判定</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m) => {
                    const vals = activeDays
                      .map((d) => d.gaps.find((g) => g.key === m.key))
                      .filter((g) => g && g.gap !== null);
                    const p =
                      vals.length > 0
                        ? vals.reduce((a, g) => a + (g!.playerAvg ?? 0), 0) / vals.length
                        : null;
                    const c =
                      vals.length > 0
                        ? vals.reduce((a, g) => a + (g!.coachValue ?? 0), 0) / vals.length
                        : null;
                    const gap = p !== null && c !== null ? p - c : null;
                    const level =
                      gap === null
                        ? null
                        : Math.abs(gap) >= 3
                          ? "critical"
                          : Math.abs(gap) >= 2
                            ? "wide"
                            : Math.abs(gap) >= 1
                              ? "slight"
                              : "aligned";
                    return (
                      <tr key={m.key} className="border-t border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-700">
                          {m.label}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-sky-700">
                          {fmt1(p) ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-violet-700">
                          {fmt1(c) ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-bold tabular-nums">
                          {gap === null ? "—" : `${gap > 0 ? "+" : ""}${fmt1(gap)}`}
                        </td>
                        <td className="px-2 py-2 text-right text-[10px] text-slate-500">
                          {level ? GAP_LEVEL_LABEL[level] : "未比較"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 自由記述 */}
          <section className="mt-5">
            <h2 className="mb-1 text-sm font-black text-slate-800">
              書いてくれた言葉（{comments.length}件）
            </h2>
            <p className="mb-2 text-[11px] text-slate-500">
点数だけでは分からない「そう思った理由」が書いてあります。
            </p>
            <div className="space-y-2">
              {comments.length === 0 && (
                <p className="rounded-xl bg-white p-4 text-xs text-slate-500">
                  まだ何も書かれていません。
                </p>
              )}
              {comments.slice(0, 40).map((c, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3 ${
                    c.side === "player"
                      ? "border-sky-200 bg-sky-50"
                      : "border-violet-200 bg-violet-50"
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-500">
                    {shortLabel(c.date)}・{c.side === "player" ? "選手" : "指導者"}・
                    {c.name}・{c.kind}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-800">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
