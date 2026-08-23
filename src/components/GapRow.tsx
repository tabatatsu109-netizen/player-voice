"use client";

import { useState } from "react";
import type { MetricGap } from "@/lib/analysis";
import { fmt1 } from "@/lib/analysis";
import {
  GAP_LEVEL_BAR,
  GAP_LEVEL_CLASS,
  GAP_LEVEL_LABEL,
  hint,
  interpret,
} from "@/lib/metrics";

const MAX_GAP = 5; // バーの振れ幅の上限

interface Props {
  gap: MetricGap;
  /** 初期状態で解説を開く */
  defaultOpen?: boolean;
}

/**
 * 1項目分の「選手にはこう見えている／指導者にはこう見えている」を並べる行。
 * 差の数値だけでなく、必ず日本語の読み取りと話し合いのヒントを添える。
 */
export default function GapRow({ gap, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const { def, playerAvg, coachValue, playerSd } = gap;

  if (gap.gap === null) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-3">
        <p className="text-sm font-bold text-slate-700">{def.label}</p>
        <p className="mt-1 text-xs text-slate-500">
          {playerAvg === null
            ? "選手の回答がまだありません"
            : "指導者の入力がないので、まだくらべられません"}
        </p>
      </div>
    );
  }

  const g = gap.gap;
  const level = gap.level!;
  const ratio = Math.min(Math.abs(g) / MAX_GAP, 1) * 50; // 中央から片側最大50%
  const tip = hint(def, g);

  return (
    <div className={`rounded-xl border bg-white p-3 ${GAP_LEVEL_CLASS[level].split(" ").pop()}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-bold text-slate-800">{def.label}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${GAP_LEVEL_CLASS[level]}`}
          >
            {GAP_LEVEL_LABEL[level]}
          </span>
          <span className="w-12 text-right text-lg font-black tabular-nums text-slate-800">
            {g > 0 ? "+" : ""}
            {fmt1(g)}
          </span>
          <span className="text-slate-400">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {/* 選手・指導者の値 */}
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-sky-50 py-1.5">
          <p className="text-[10px] text-sky-700">選手の平均</p>
          <p className="text-xl font-black tabular-nums text-sky-800">
            {fmt1(playerAvg)}
          </p>
          {playerSd !== null && (
            <p className="text-[10px] text-sky-600">人によるちがい ±{fmt1(playerSd)}</p>
          )}
        </div>
        <div className="rounded-lg bg-violet-50 py-1.5">
          <p className="text-[10px] text-violet-700">指導者</p>
          <p className="text-xl font-black tabular-nums text-violet-800">
            {fmt1(coachValue)}
          </p>
          <p className="text-[10px] text-violet-600">&nbsp;</p>
        </div>
      </div>

      {/* 中央0の振れバー */}
      <div className="relative mt-2 h-3 rounded-full bg-slate-100">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-300" />
        <div
          className={`absolute top-0 h-full rounded-full ${GAP_LEVEL_BAR[level]}`}
          style={
            g >= 0
              ? { left: "50%", width: `${ratio}%` }
              : { right: "50%", width: `${ratio}%` }
          }
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
        <span>← 指導者の方が高い</span>
        <span>選手の方が高い →</span>
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-2">
          <p className="text-xs leading-relaxed text-slate-700">
            <span className="font-bold">どういうこと？　</span>
            {interpret(def, g)}
          </p>
          {tip && (
            <p className="rounded-lg bg-teal-50 p-2 text-xs leading-relaxed text-teal-900">
              <span className="font-bold">話すきっかけに　</span>
              {tip}
            </p>
          )}
          <p className="text-[10px] leading-relaxed text-slate-400">
            選手の質問：「{def.playerQuestion}」／指導者の質問：「{def.coachQuestion}」
            <br />
            1 = {def.low} ／ 10 = {def.high}
          </p>
        </div>
      )}
    </div>
  );
}
