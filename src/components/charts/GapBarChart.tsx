"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MetricGap } from "@/lib/analysis";
import { round1 } from "@/lib/analysis";
import { gapLevel } from "@/lib/metrics";

const COLOR: Record<string, string> = {
  aligned: "#10b981", /* --color-good */
  slight: "#f59e0b", /* --color-warn */
  wide: "#ff8c42", /* --color-accent-500 */
  critical: "#dc2626", /* --color-danger */
};

interface Props {
  gaps: MetricGap[];
  height?: number;
}

/** 認識差（選手平均 − 指導者評価）を中央0の横棒で並べる */
export default function GapBarChart({ gaps, height = 260 }: Props) {
  const data = gaps
    .filter((g) => g.gap !== null)
    .map((g) => ({
      name: g.def.label,
      gap: round1(g.gap) as number,
      level: gapLevel(Math.abs(g.gap as number)),
    }));

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-400">
        指導者の入力がないため、まだ比較できません
      </p>
    );
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
        >
          <XAxis
            type="number"
            domain={[-5, 5]}
            ticks={[-4, -2, 0, 2, 4]}
            tick={{ fontSize: 10, fill: "#64748b" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 10, fill: "#334155" }}
          />
          <ReferenceLine x={0} stroke="#94a3b8" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: unknown) =>
              [
                `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(1)}`,
                "見え方のちがい",
              ] as [string, string]
            }
          />
          <Bar dataKey="gap" radius={4} barSize={16} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.name} fill={COLOR[d.level]} />
            ))}
            <LabelList
              dataKey="gap"
              position="right"
              style={{ fontSize: 10, fill: "#334155", fontWeight: 700 }}
              formatter={(v: unknown) =>
                typeof v === "number"
                  ? `${v > 0 ? "+" : ""}${v.toFixed(1)}`
                  : String(v)
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-[10px] text-slate-400">
        左＝指導者の方が高い ／ 右＝選手の方が高い
      </p>
    </div>
  );
}
