"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendSeries {
  dataKey: string;
  name: string;
  color: string;
  dashed?: boolean;
}

interface Props {
  data: Array<Record<string, unknown>>;
  series: TrendSeries[];
  height?: number;
  domain?: [number, number];
}

export default function TrendChart({
  data,
  series,
  height = 220,
  domain = [1, 10],
}: Props) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-slate-400">
        表示できるデータがありません
      </p>
    );
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            domain={domain}
            ticks={[2, 4, 6, 8, 10]}
            tick={{ fontSize: 10, fill: "#64748b" }}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: unknown) =>
              typeof v === "number" ? v.toFixed(1) : String(v ?? "")
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
