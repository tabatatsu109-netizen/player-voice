"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import WeeklyPlanForm from "@/components/WeeklyPlanForm";
import { addDays, today } from "@/lib/date";
import { loadAuth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { AuthState, WeeklyPlan, WeeklySessionPlan } from "@/lib/types";

export default function CoachSchedulePage() {
  const store = getStore();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [weekIndex, setWeekIndex] = useState(0); // 0=this week, 1=next week, etc.
  const [currentPlan, setCurrentPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setAuth(loadAuth()), []);

  // Calculate week start date (Monday)
  const weekStartDate = useMemo(() => {
    const t = new Date(today());
    const day = t.getDay() || 7; // 0=Sunday, 1=Monday, ..., 6=Saturday
    const diff = 1 - day; // Monday offset
    t.setDate(t.getDate() + diff + weekIndex * 7);
    const year = t.getFullYear();
    const month = String(t.getMonth() + 1).padStart(2, "0");
    const date = String(t.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }, [weekIndex]);

  // Load the weekly plan for this week
  const loadPlan = useCallback(async () => {
    if (!auth) return;
    setLoading(true);
    setError("");
    try {
      const plan = await store.getWeeklyPlan(auth.teamId, weekStartDate);
      setCurrentPlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [auth, store, weekStartDate]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  async function handleSave(sessions: WeeklySessionPlan[]) {
    if (!auth) return;
    setSaving(true);
    setError("");
    try {
      const plan: WeeklyPlan = {
        id: currentPlan?.id || `wp_${Date.now()}`,
        team_id: auth.teamId,
        week_start: weekStartDate,
        created_by: auth.userId,
        sessions,
        created_at: currentPlan?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await store.saveWeeklyPlan(auth.teamId, plan);
      setCurrentPlan(plan);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const formatWeekDate = (date: string) => {
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  };

  const weekLabels = [
    "今週",
    "来週",
    "再来週",
    "4週間後",
  ];

  return (
    <AppShell requireTeamData title="週間計画を立てる" subtitle="月間計画を週ごとに入力">
      {loading && (
        <div className="py-10 text-center">
          <p className="text-sm text-slate-400">読み込み中…</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {weekLabels.map((label, idx) => (
              <button
                key={idx}
                onClick={() => setWeekIndex(idx)}
                className={`rounded-lg py-2 text-xs font-bold transition ${
                  weekIndex === idx
                    ? "bg-primary-600 text-white"
                    : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
                <br />
                <span className="text-[10px]">
                  {formatWeekDate(weekStartDate)}〜
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-xl bg-white p-4">
            {currentPlan ? (
              <WeeklyPlanForm
                weekStart={weekStartDate}
                initialSessions={currentPlan.sessions}
                onSave={handleSave}
                onCancel={() => {}}
              />
            ) : (
              <WeeklyPlanForm
                weekStart={weekStartDate}
                onSave={handleSave}
                onCancel={() => {}}
              />
            )}
          </div>

          {saving && (
            <div className="mt-3 text-center text-sm text-slate-500">
              保存中…
            </div>
          )}

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
            <p className="font-bold text-slate-700">使い方</p>
            <p className="mt-1">
              各曜日の「計画の焦点」を入力すると、選手たちのダッシュボードに来週の計画が表示されます。これによって、選手は日々の練習の目的を理解しやすくなります。
            </p>
          </div>
        </>
      )}
    </AppShell>
  );
}
