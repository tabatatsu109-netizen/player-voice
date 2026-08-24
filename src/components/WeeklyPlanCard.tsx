"use client";

import type { WeeklyPlan } from "@/lib/types";
import { SESSION_TYPE_LABEL } from "@/lib/types";

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

const FOCUS_COLORS: Record<string, { bg: string; text: string }> = {
  "フィジカル強化": { bg: "bg-orange-50", text: "text-orange-700" },
  "戦術理解": { bg: "bg-blue-50", text: "text-blue-700" },
  "調整": { bg: "bg-green-50", text: "text-green-700" },
  "セットプレー": { bg: "bg-purple-50", text: "text-purple-700" },
  "オフ": { bg: "bg-slate-50", text: "text-slate-500" },
};

function getColorForFocus(focus: string) {
  return FOCUS_COLORS[focus] || { bg: "bg-slate-50", text: "text-slate-600" };
}

interface Props {
  plan: WeeklyPlan;
}

export default function WeeklyPlanCard({ plan }: Props) {
  // Create a map of day -> session for this week
  const sessionByDay = new Map(plan.sessions.map((s) => [s.day, s]));

  // Generate all 7 days (Mon-Sun)
  const allDays = Array.from({ length: 7 }, (_, i) => {
    const session = sessionByDay.get(i);
    return { day: i, label: WEEKDAY_LABELS[i], session };
  });

  const weekStartDate = new Date(plan.week_start);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const formatDateRange = (start: Date, end: Date) => {
    const startMonth = start.getMonth() + 1;
    const startDay = start.getDate();
    const endMonth = end.getMonth() + 1;
    const endDay = end.getDate();
    return `${startMonth}/${startDay}〜${endMonth}/${endDay}`;
  };

  return (
    <div className="rounded-xl bg-white p-4 border border-slate-200">
      <h2 className="text-sm font-bold text-slate-800 mb-3">
        📅 来週の計画（{formatDateRange(weekStartDate, weekEndDate)}）
      </h2>
      <div className="space-y-2">
        {allDays.map(({ day, label, session }) => {
          if (!session) {
            return (
              <div key={day} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <span className="font-bold text-slate-400 w-6">{label}</span>
                <span className="text-xs text-slate-400">オフ</span>
              </div>
            );
          }

          const colors = getColorForFocus(session.planned_focus);
          return (
            <div
              key={day}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg ${colors.bg}`}
            >
              <span className={`font-bold w-6 ${colors.text}`}>{label}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold ${colors.text}`}>
                  {SESSION_TYPE_LABEL[session.session_type]}
                </p>
                <p className={`text-xs ${colors.text} leading-snug`}>
                  {session.planned_focus}
                </p>
                {session.notes && (
                  <p className="text-[10px] text-slate-600 mt-0.5">{session.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
