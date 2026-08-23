"use client";

import { useEffect, useState } from "react";
import { aggregateByDate, type DayAggregate } from "./analysis";
import { loadAuth } from "./auth";
import { addDays, today } from "./date";
import { getStore } from "./store";
import type { AuthState, User } from "./types";

export interface TeamData {
  auth: AuthState | null;
  users: User[];
  days: DayAggregate[];
  loading: boolean;
  error: string;
  reload: () => void;
}

/** 直近 rangeDays 日分のチームデータを読み込む（指導者・管理者向け画面で共用） */
export function useTeamData(rangeDays: number): TeamData {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [days, setDays] = useState<DayAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const a = loadAuth();
    setAuth(a);
    if (!a) {
      setLoading(false);
      return;
    }
    const store = getStore();
    const to = today();
    const from = addDays(to, -(rangeDays - 1));
    let cancelled = false;

    setLoading(true);
    Promise.all([store.listUsers(a.teamId), store.loadRange(a.teamId, from, to)])
      .then(([us, range]) => {
        if (cancelled) return;
        setUsers(us);
        setDays(aggregateByDate(range));
        setError("");
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "読み込みに失敗しました"),
      )
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [rangeDays, tick]);

  return { auth, users, days, loading, error, reload: () => setTick((t) => t + 1) };
}
