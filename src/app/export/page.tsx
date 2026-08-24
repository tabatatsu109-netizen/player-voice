"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { comparePeriods, fmt1 } from "@/lib/analysis";
import {
  csvComments,
  csvDailySummary,
  csvMetricGaps,
  csvPerPlayer,
  csvPeriodComparison,
  downloadCsv,
} from "@/lib/csv";
import { today } from "@/lib/date";
import { useTeamData } from "@/lib/useTeamData";

type Range = 7 | 30 | 90;

export default function ExportPage() {
  const [range, setRange] = useState<Range>(30);
  const { users, days, loading } = useTeamData(range);
  const stamp = today();

  const period = useMemo(() => comparePeriods(days), [days]);

  const files = [
    {
      name: "① 日ごとのまとめ",
      desc: "日ごとの回答人数・7項目の選手平均・指導者の点数・ちがい",
      file: `player-voice_日別サマリ_${stamp}.csv`,
      rows: () => csvDailySummary(days),
    },
    {
      name: "② 項目ごとのちがい",
      desc: "期間ぜんぶの平均で見た、7項目それぞれのちがい",
      file: `player-voice_項目別認識差_${stamp}.csv`,
      rows: () => csvMetricGaps(days),
    },
    {
      name: "③ 選手ひとりずつのデータ",
      desc: "選手ごと・日ごとの元の数字（グラフや計算に使う）",
      file: `player-voice_個人別_${stamp}.csv`,
      rows: () => csvPerPlayer(days, users),
    },
    {
      name: "④ 書いてくれた言葉ぜんぶ",
      desc: "選手と指導者が書いた文章を、日付順にまとめたもの",
      file: `player-voice_自由記述_${stamp}.csv`,
      rows: () => csvComments(days, users),
    },
    {
      name: "⑤ 前半と後半のくらべ",
      desc: "使った期間を半分に分けて、ちがいがどれだけ縮まったか",
      file: `player-voice_期間比較_${stamp}.csv`,
      rows: () => csvPeriodComparison(days),
    },
  ];

  const totalResponses = days.reduce((a, d) => a + d.playerCount, 0);

  return (
    <AppShell requireTeamData title="データを出す" subtitle="発表や分析に使うCSV">
      <div className="mb-3 flex gap-2">
        {([7, 30, 90] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold ${
              range === r
                ? "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800"
                : "border border-slate-300 bg-white text-slate-600"
            }`}
          >
            過去{r}日
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-xl bg-white p-3 text-xs text-slate-600">
これまでの{range}日のうち、練習があった日 <strong>{days.length}日</strong>／
        回答は合計 <strong>{totalResponses}件</strong>／登録している人 <strong>{users.length}人</strong>
        <p className="mt-1 text-[11px] text-slate-400">
ファイルはExcelでそのまま開けます（文字化けしません）。
        </p>
      </div>

      {loading && <p className="py-10 text-center text-sm text-slate-400">集計中…</p>}

      {!loading && (
        <>
          <div className="space-y-2">
            {files.map((f) => (
              <button
                key={f.file}
                onClick={() => downloadCsv(f.file, f.rows())}
                disabled={days.length === 0}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left disabled:opacity-40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800">{f.name}</span>
                  <span className="block text-[11px] leading-snug text-slate-500">
                    {f.desc}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold text-white">
                  CSV
                </span>
              </button>
            ))}
          </div>

          {/* 期間比較のプレビュー：プレゼンでそのまま話せる形にしておく */}
          <section className="mt-6">
            <h2 className="mb-1 text-sm font-black text-slate-800">
              前半と後半のくらべ（画面でも見られます）
            </h2>
            <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
練習があった日を、前半{period.firstHalf.length}日と後半
              {period.secondHalf.length}日に半分ずつ分けて、ちがいの大きさをくらべています。
              <strong>「縮まった分」がプラスなら、見え方のちがいが小さくなった</strong>ということです。
            </p>
            <div className="overflow-x-auto rounded-xl bg-white">
              <table className="w-full min-w-[420px] text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left font-bold">項目</th>
                    <th className="px-2 py-2 text-right font-bold">前半</th>
                    <th className="px-2 py-2 text-right font-bold">後半</th>
                    <th className="px-2 py-2 text-right font-bold">縮まった分</th>
                  </tr>
                </thead>
                <tbody>
                  {period.rows.map((r) => (
                    <tr key={r.key} className="border-t border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-700">{r.label}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {fmt1(r.firstHalfAbsGap) ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {fmt1(r.secondHalfAbsGap) ?? "—"}
                      </td>
                      <td
                        className={`px-2 py-2 text-right font-bold tabular-nums ${
                          (r.improvement ?? 0) > 0 ? "text-primary-600" : "text-slate-500"
                        }`}
                      >
                        {r.improvement === null
                          ? "—"
                          : `${r.improvement > 0 ? "+" : ""}${fmt1(r.improvement)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 rounded-xl bg-slate-100 p-3 text-[11px] leading-relaxed text-slate-600">
気をつけること：③と④には選手の名前が入っています。
            発表のスライドに載せるときは、名前を伏せるか、名前の入っていない①②⑤を使ってください。
          </p>
        </>
      )}
    </AppShell>
  );
}
