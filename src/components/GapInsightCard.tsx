"use client";

import type { MetricGap } from "@/lib/analysis";

interface GapInsightCardProps {
  gap: MetricGap;
  hint?: string;
  question?: string;
}

export function GapInsightCard({
  gap,
  hint,
  question,
}: GapInsightCardProps) {
  const value = gap.gap ?? 0;
  const sign = value > 0 ? "+" : "";
  const absValue = Math.abs(value);
  const isLarge = absValue >= 2;

  const defaultHint = isLarge
    ? value > 0
      ? "選手が思うより、指導者は厳しく評価しています"
      : "指導者が思うより、選手はポジティブに感じています"
    : "見方が少しズレています。話し合うきっかけにしてください";

  const defaultQuestion = isLarge
    ? `この「${gap.def.label}」について、なぜそう思ったか聞いてみましょう`
    : `この「${gap.def.label}」について、話し合うといいかもしれません`;

  const statusColor = isLarge
    ? "from-red-50 to-accent-50"
    : "from-amber-50 to-accent-50";

  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${statusColor} border-l-4 ${isLarge ? "border-red-500" : "border-accent-500"} p-4 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl">🎯</div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900">ここに注目してください</h3>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-semibold text-slate-700">{gap.def.label}</span>
        <span
          className={`text-lg font-bold ${isLarge ? "text-red-600" : "text-amber-600"}`}
        >
          {sign}
          {absValue.toFixed(1)}
        </span>
      </div>

      {(hint || defaultHint) && (
        <div className="mt-3 flex gap-2">
          <div className="text-lg">💡</div>
          <div className="text-sm text-slate-700">{hint || defaultHint}</div>
        </div>
      )}

      {(question || defaultQuestion) && (
        <div className="mt-3 flex gap-2">
          <div className="text-lg">📞</div>
          <div className="text-sm font-semibold text-slate-800">{question || defaultQuestion}</div>
        </div>
      )}
    </div>
  );
}
