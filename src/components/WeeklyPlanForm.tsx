"use client";

import { useState } from "react";
import type { SessionType, WeeklyPlan, WeeklySessionPlan } from "@/lib/types";
import { SESSION_TYPE_LABEL } from "@/lib/types";

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

const FOCUS_OPTIONS = [
  "フィジカル強化",
  "戦術理解",
  "調整",
  "セットプレー",
  "試合準備",
  "リカバリー",
];

interface Props {
  weekStart: string;
  initialSessions?: WeeklySessionPlan[];
  onSave: (sessions: WeeklySessionPlan[]) => void;
  onCancel: () => void;
}

export default function WeeklyPlanForm({
  weekStart,
  initialSessions = [],
  onSave,
  onCancel,
}: Props) {
  const [sessions, setSessions] = useState<WeeklySessionPlan[]>(
    initialSessions.length > 0
      ? initialSessions
      : Array.from({ length: 7 }, (_, i) => ({
          day: i,
          session_type: i === 6 ? ("match" as SessionType) : ("practice" as SessionType),
          planned_focus: "",
          notes: null,
        }))
  );

  const handleSessionTypeChange = (day: number, type: SessionType) => {
    setSessions((prev) =>
      prev.map((s) => (s.day === day ? { ...s, session_type: type } : s))
    );
  };

  const handleFocusChange = (day: number, focus: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.day === day ? { ...s, planned_focus: focus } : s))
    );
  };

  const handleNotesChange = (day: number, notes: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.day === day ? { ...s, notes: notes || null } : s))
    );
  };

  const weekStartDate = new Date(weekStart);
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
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800">
        来週の計画（{formatDateRange(weekStartDate, weekEndDate)}）
      </h2>

      <div className="space-y-3">
        {sessions.map((session) => (
          <div key={session.day} className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-bold text-slate-600 mb-2">
              {WEEKDAY_LABELS[session.day]}曜日
            </p>

            <div className="space-y-2">
              <label className="block">
                <span className="text-[10px] font-bold text-slate-500">セッション種別</span>
                <select
                  value={session.session_type}
                  onChange={(e) =>
                    handleSessionTypeChange(session.day, e.target.value as SessionType)
                  }
                  className="mt-0.5 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                >
                  {(Object.keys(SESSION_TYPE_LABEL) as SessionType[]).map((t) => (
                    <option key={t} value={t}>
                      {SESSION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-slate-500">計画の焦点</span>
                <div className="mt-0.5 grid grid-cols-2 gap-1">
                  <input
                    type="text"
                    placeholder="フリー入力"
                    value={session.planned_focus}
                    onChange={(e) => handleFocusChange(session.day, e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                    list={`focus-options-${session.day}`}
                  />
                  <datalist id={`focus-options-${session.day}`}>
                    {FOCUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value)
                        handleFocusChange(session.day, e.target.value);
                    }}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">選ぶ</option>
                    {FOCUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-slate-500">補足（オプション）</span>
                <textarea
                  value={session.notes ?? ""}
                  onChange={(e) => handleNotesChange(session.day, e.target.value)}
                  placeholder="詳細説明や重要事項など"
                  rows={2}
                  className="mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onSave(sessions)}
          className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 active:bg-primary-800"
        >
          保存する
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
