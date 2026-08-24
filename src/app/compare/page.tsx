"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { GapInsightCard } from "@/components/GapInsightCard";
import GapRow from "@/components/GapRow";
import StatCard from "@/components/StatCard";
import GapBarChart from "@/components/charts/GapBarChart";
import { fmt1, topGaps } from "@/lib/analysis";
import { jpLabel, shortLabel } from "@/lib/date";
import { FORMATION_COMFORT } from "@/lib/metrics";
import { SESSION_TYPE_LABEL } from "@/lib/types";
import { useTeamData } from "@/lib/useTeamData";

function CompareInner() {
  const params = useSearchParams();
  const { users, days, loading } = useTeamData(30);
  const [selected, setSelected] = useState<string | null>(null);

  // URL の ?date= を初期値に、なければ最新日
  useEffect(() => {
    if (selected || days.length === 0) return;
    const q = params.get("date");
    const found = q && days.some((d) => d.date === q) ? q : days[days.length - 1].date;
    setSelected(found);
  }, [days, params, selected]);

  const day = useMemo(
    () => days.find((d) => d.date === selected) ?? null,
    [days, selected],
  );
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const top3 = day ? topGaps(day.gaps, 3) : [];

  return (
    <AppShell
      requireTeamData
      title="その日をくらべる"
      subtitle={selected ? jpLabel(selected) : undefined}
    >
      {loading && <p className="py-10 text-center text-sm text-slate-400">読み込み中…</p>}

      {!loading && days.length === 0 && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500">
          この30日間のデータがありません。
        </p>
      )}

      {!loading && day && (
        <>
          <label className="mb-3 block">
            <span className="text-[11px] font-bold text-slate-500">日を選ぶ</span>
            <select
              value={selected ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className="mt-0.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-bold"
            >
              {[...days].reverse().map((d) => (
                <option key={d.date} value={d.date}>
                  {shortLabel(d.date)}
                  {d.session ? ` ${SESSION_TYPE_LABEL[d.session.session_type]}` : ""}
                  （選手{d.playerCount}人／指導者{d.coachCount}人）
                </option>
              ))}
            </select>
          </label>

          <div className="mb-4 rounded-xl bg-white p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-slate-500">答えた選手</p>
                <p className="text-lg font-black tabular-nums">{day.playerCount}人</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">入力した指導者</p>
                <p className="text-lg font-black tabular-nums">{day.coachCount}人</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">フォーメーション</p>
                <p className="text-lg font-black">{day.session?.formation ?? "—"}</p>
              </div>
            </div>
            {day.session?.notes && (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                テーマ：{day.session.notes}
              </p>
            )}
          </div>

          {day.coachCount === 0 && (
            <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
この日は指導者が入力していないので、ちがいを出していません。
              入力なしを0点として計算すると数字がおかしくなるため、わざと空けています。
            </p>
          )}

          {top3.length > 0 && (
            <>
              <section className="mb-5 space-y-2">
                {top3.map((g) => (
                  <GapInsightCard key={g.key} gap={g} />
                ))}
              </section>

              <section className="mb-5">
                <h2 className="mb-1 text-sm font-black text-slate-800">
                  この日、見え方がいちばんちがった3つ（詳細）
                </h2>
                <div className="space-y-2">
                  {top3.map((g, i) => (
                    <GapRow key={g.key} gap={g} defaultOpen={i === 0} />
                  ))}
                </div>
              </section>
            </>
          )}

          <section className="mb-5 rounded-xl bg-white p-3">
            <h2 className="mb-1 text-sm font-black text-slate-800">
              7項目のちがい（ひと目で見る）
            </h2>
            <GapBarChart gaps={day.gaps} />
          </section>

          <section className="mb-5">
            <h2 className="mb-2 text-sm font-black text-slate-800">
              7項目をぜんぶ見る
            </h2>
            <div className="space-y-2">
              {day.gaps.map((g) => (
                <GapRow key={g.key} gap={g} />
              ))}
            </div>
          </section>

          <section className="mb-5">
            <h2 className="mb-2 text-sm font-black text-slate-800">
              フォーメーションのやりやすさ
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label={`${day.session?.formation ?? "この日のフォーメーション"}（選手平均）`}
                value={fmt1(day.formationComfort)}
                tone="player"
                hint={`1 ${FORMATION_COMFORT.low} 〜 10 ${FORMATION_COMFORT.high}`}
              />
              <StatCard
                label="この日の練習、指導者の手ごたえ"
                value={fmt1(
                  day.coachResponses.length > 0
                    ? day.coachResponses.reduce((a, c) => a + c.session_rating, 0) /
                        day.coachResponses.length
                    : null,
                )}
                tone="coach"
                hint="ねらい通りにできたか"
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
この項目は選手だけに聞いているので、ちがいは出せません。
              フォーメーションを変えるか考えるときの参考にしてください。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-black text-slate-800">
              この日、書いてくれた言葉
            </h2>
            <div className="space-y-2">
              {day.coachResponses.map((r) =>
                [r.message, r.comment].filter(Boolean).map((t, i) => (
                  <div
                    key={`${r.id}-${i}`}
                    className="rounded-xl border border-violet-200 bg-violet-50 p-3"
                  >
                    <p className="text-[10px] font-bold text-violet-700">
                      指導者・{byId.get(r.coach_id)?.name ?? ""}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-800">{t}</p>
                  </div>
                )),
              )}
              {day.playerResponses.map((r) =>
                [r.message, r.comment].filter(Boolean).map((t, i) => (
                  <div
                    key={`${r.id}-${i}`}
                    className="rounded-xl border border-sky-200 bg-sky-50 p-3"
                  >
                    <p className="text-[10px] font-bold text-sky-700">
                      選手・{byId.get(r.player_id)?.name ?? ""}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-800">{t}</p>
                  </div>
                )),
              )}
              {day.playerResponses.every((r) => !r.message && !r.comment) &&
                day.coachResponses.every((r) => !r.message && !r.comment) && (
                  <p className="rounded-xl bg-white p-4 text-xs text-slate-500">
                    この日は誰も書いていません。
                  </p>
                )}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-slate-400">
          読み込み中…
        </div>
      }
    >
      <CompareInner />
    </Suspense>
  );
}
