"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import StatCard from "@/components/StatCard";
import TrendChart from "@/components/charts/TrendChart";
import { fmt1, mean, round1 } from "@/lib/analysis";
import { shortLabel } from "@/lib/date";
import { METRICS } from "@/lib/metrics";
import { SESSION_TYPE_LABEL, type PlayerResponse } from "@/lib/types";
import { useTeamData } from "@/lib/useTeamData";

type Range = 7 | 30;

function PlayersInner() {
  const params = useSearchParams();
  const [range, setRange] = useState<Range>(30);
  const { users, days, loading } = useTeamData(range);
  const [playerId, setPlayerId] = useState<string>("");

  const players = useMemo(
    () => users.filter((u) => u.role === "player"),
    [users],
  );

  useEffect(() => {
    if (playerId || players.length === 0) return;
    const q = params.get("id");
    setPlayerId(q && players.some((p) => p.id === q) ? q : players[0].id);
  }, [params, playerId, players]);

  const player = players.find((p) => p.id === playerId) ?? null;

  /** 選択中の選手の日別データ（チーム平均も並べて比較できるようにする） */
  const rows = useMemo(() => {
    return days
      .map((d) => {
        const mine = d.playerResponses.find((r) => r.player_id === playerId) ?? null;
        const teamAvg = (field: keyof PlayerResponse) =>
          mean(d.playerResponses.map((r) => r[field] as number));
        const coachOf = (key: string) =>
          d.gaps.find((g) => g.key === key)?.coachValue ?? null;
        return {
          date: d.date,
          label: shortLabel(d.date),
          session: d.session,
          mine,
          本人_体調: mine?.condition ?? null,
          チーム平均_体調: round1(teamAvg("condition")),
          本人_疲労: mine?.fatigue ?? null,
          チーム平均_疲労: round1(teamAvg("fatigue")),
          本人_強度: mine?.intensity ?? null,
          チーム平均_強度: round1(teamAvg("intensity")),
          指導者_強度: round1(coachOf("intensity")),
          本人_戦術理解: mine?.tactical_understanding ?? null,
          チーム平均_戦術理解: round1(teamAvg("tactical_understanding")),
          指導者_戦術理解: round1(coachOf("tactical_understanding")),
        };
      })
      .filter((r) => r.mine !== null || r.チーム平均_体調 !== null);
  }, [days, playerId]);

  const mineOnly = rows.filter((r) => r.mine);
  const answerRate =
    days.length > 0 ? Math.round((mineOnly.length / days.length) * 100) : 0;

  const avgOf = (field: keyof PlayerResponse) =>
    fmt1(mean(mineOnly.map((r) => r.mine![field] as number)));

  const comments = useMemo(
    () =>
      rows
        .filter((r) => r.mine && (r.mine.message || r.mine.comment))
        .reverse(),
    [rows],
  );

  return (
    <AppShell requireTeamData title="選手ひとりずつ" subtitle={player?.name}>
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

      <label className="mb-3 block">
        <span className="text-[11px] font-bold text-slate-500">選手を選ぶ</span>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="mt-0.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-bold"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.position ? `（${p.position}${p.grade ? ` / ${p.grade}年` : ""}）` : ""}
            </option>
          ))}
        </select>
      </label>

      <p className="mb-4 rounded-xl bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-600">
この画面は指導者と管理者しか見られません。選手どうしがお互いの点数を見ることはできません。
        個人の点数は成績をつけるためではなく、<strong>声をかける相手を見つけるため</strong>のものです。
      </p>

      {loading && <p className="py-10 text-center text-sm text-slate-400">読み込み中…</p>}

      {!loading && player && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatCard label="答えた日数" value={mineOnly.length} unit="日" hint={`練習があった日のうち ${answerRate}%`} />
            <StatCard label="体調の平均" value={avgOf("condition")} tone="player" />
            <StatCard label="つかれ具合の平均" value={avgOf("fatigue")} tone="player" />
            <StatCard label="戦術の平均" value={avgOf("tactical_understanding")} tone="player" />
          </div>

          <section className="mt-5 space-y-4">
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">
                体調（本人とチーム平均）
              </p>
              <TrendChart
                data={rows}
                series={[
                  { dataKey: "本人_体調", name: player.name, color: "#0284c7" },
                  { dataKey: "チーム平均_体調", name: "チーム平均", color: "#94a3b8", dashed: true },
                ]}
              />
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">
                つかれ具合（本人とチーム平均）
              </p>
              <TrendChart
                data={rows}
                series={[
                  { dataKey: "本人_疲労", name: player.name, color: "#e11d48" },
                  { dataKey: "チーム平均_疲労", name: "チーム平均", color: "#94a3b8", dashed: true },
                ]}
              />
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">
                練習のきつさ（本人と指導者）
              </p>
              <TrendChart
                data={rows}
                series={[
                  { dataKey: "本人_強度", name: player.name, color: "#0284c7" },
                  { dataKey: "指導者_強度", name: "指導者", color: "#7c3aed", dashed: true },
                ]}
              />
            </div>
            <div className="rounded-xl bg-white p-3">
              <p className="mb-1 text-xs font-bold text-slate-600">
                戦術のわかりやすさ（本人と指導者）
              </p>
              <TrendChart
                data={rows}
                series={[
                  { dataKey: "本人_戦術理解", name: player.name, color: "#0284c7" },
                  { dataKey: "指導者_戦術理解", name: "指導者", color: "#7c3aed", dashed: true },
                ]}
              />
            </div>
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-sm font-black text-slate-800">
              7項目の平均（本人とチーム）
            </h2>
            <div className="overflow-x-auto rounded-xl bg-white">
              <table className="w-full min-w-[360px] text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left font-bold">項目</th>
                    <th className="px-2 py-2 text-right font-bold">本人</th>
                    <th className="px-2 py-2 text-right font-bold">チーム平均</th>
                    <th className="px-2 py-2 text-right font-bold">ちがい</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((m) => {
                    const own = mean(
                      mineOnly.map((r) => r.mine![m.playerField] as number),
                    );
                    const team = mean(
                      days.flatMap((d) =>
                        d.playerResponses.map((r) => r[m.playerField] as number),
                      ),
                    );
                    const diff = own !== null && team !== null ? own - team : null;
                    return (
                      <tr key={m.key} className="border-t border-slate-100">
                        <td className="px-2 py-2 font-medium text-slate-700">{m.label}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{fmt1(own) ?? "—"}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-slate-500">
                          {fmt1(team) ?? "—"}
                        </td>
                        <td
                          className={`px-2 py-2 text-right font-bold tabular-nums ${
                            diff !== null && Math.abs(diff) >= 1.5
                              ? "text-orange-600"
                              : "text-slate-600"
                          }`}
                        >
                          {diff === null ? "—" : `${diff > 0 ? "+" : ""}${fmt1(diff)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-sm font-black text-slate-800">
              この選手が書いた言葉（{comments.length}件）
            </h2>
            <div className="space-y-2">
              {comments.length === 0 && (
                <p className="rounded-xl bg-white p-4 text-xs text-slate-500">
                  この期間は何も書いていません。
                </p>
              )}
              {comments.map((r) => (
                <div key={r.date} className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                  <p className="text-[10px] font-bold text-sky-700">
                    {shortLabel(r.date)}
                    {r.session ? `・${SESSION_TYPE_LABEL[r.session.session_type]}` : ""}
                  </p>
                  {r.mine!.message && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-800">
                      <span className="font-bold">コーチへ：</span>
                      {r.mine!.message}
                    </p>
                  )}
                  {r.mine!.comment && (
                    <p className="mt-1 text-xs leading-relaxed text-slate-800">
                      <span className="font-bold">メモ：</span>
                      {r.mine!.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}

export default function PlayersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-slate-400">
          読み込み中…
        </div>
      }
    >
      <PlayersInner />
    </Suspense>
  );
}
