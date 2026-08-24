"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { ProgressCard } from "@/components/ProgressCard";
import ScaleInput from "@/components/ScaleInput";
import { loadAuth } from "@/lib/auth";
import { jpLabel, today } from "@/lib/date";
import { METRICS } from "@/lib/metrics";
import { getStore, type CoachAnswer } from "@/lib/store";
import {
  FORMATIONS,
  SESSION_TYPE_LABEL,
  type AuthState,
  type Session,
  type SessionType,
} from "@/lib/types";

type Values = Record<string, number | null>;

const KEYS = [...METRICS.map((m) => m.coachField as string), "session_rating"];

export default function CoachInputPage() {
  const store = getStore();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [date, setDate] = useState(today());
  const [sessionType, setSessionType] = useState<SessionType>("practice");
  const [formation, setFormation] = useState("4-4-2");
  const [notes, setNotes] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [values, setValues] = useState<Values>({});
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [playerCount, setPlayerCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setAuth(loadAuth()), []);

  const load = useCallback(async () => {
    if (!auth) return;
    setError("");
    try {
      const s = await store.ensureSession({
        teamId: auth.teamId,
        date,
        sessionType,
      });
      setSession(s);
      if (s.formation) setFormation(s.formation);
      setNotes(s.notes ?? "");

      const existing = await store.getCoachResponse(s.id, auth.userId);
      if (existing) {
        const v: Values = {};
        for (const k of KEYS) v[k] = (existing as unknown as Values)[k] ?? null;
        setValues(v);
        setMessage(existing.message ?? "");
        setComment(existing.comment ?? "");
      } else {
        setValues({});
        setMessage("");
        setComment("");
      }

      const range = await store.loadRange(auth.teamId, date, date);
      const ids = new Set(range.sessions.map((x) => x.id));
      setPlayerCount(
        range.playerResponses.filter((r) => ids.has(r.session_id)).length,
      );
      setSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, [auth, date, sessionType, store]);

  useEffect(() => {
    load();
  }, [load]);

  const answered = useMemo(
    () => KEYS.filter((k) => values[k] != null).length,
    [values],
  );
  const complete = answered === KEYS.length;

  const set = (k: string) => (v: number) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  async function submit() {
    if (!auth || !session || !complete) return;
    setBusy(true);
    setError("");
    try {
      const s = await store.ensureSession({
        teamId: auth.teamId,
        date,
        sessionType,
        formation,
        notes,
      });
      const answer = {
        ...(Object.fromEntries(
          KEYS.map((k) => [k, values[k] as number]),
        ) as unknown as CoachAnswer),
        message: message.trim(),
        comment: comment.trim(),
      };
      await store.saveCoachResponse(s.id, auth.userId, answer);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell requireTeamData title="指導者の入力" subtitle={jpLabel(date)}>
      {saved ? (
        <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-2 text-lg font-black text-primary-900">保存しました</p>
          <p className="mt-2 text-xs text-primary-800">
            選手の答えと並べて、この日のちがいを見られます。
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/compare?date=${date}`}
              className="rounded-xl bg-primary-600 py-3 text-sm font-bold text-white hover:bg-primary-700 active:bg-primary-800"
            >
              この日のちがいを見る
            </Link>
            <button
              onClick={() => setSaved(false)}
              className="rounded-xl border border-primary-300 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-50"
            >
              入力し直す
            </button>
          </div>
        </div>
      ) : (
        <>
          <ProgressCard
            questionsCompleted={complete}
            sessionInfoCompleted={complete}
            onViewDashboard={() => window.location.href = "/dashboard"}
          />

          <div className="mb-3 rounded-xl bg-white p-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500">日付</span>
                <input
                  type="date"
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500">種別</span>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value as SessionType)}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                >
                  {(Object.keys(SESSION_TYPE_LABEL) as SessionType[]).map((t) => (
                    <option key={t} value={t}>
                      {SESSION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500">
                  フォーメーション
                </span>
                <select
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-2"
                >
                  {FORMATIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-bold text-slate-500">
                  今日のテーマ
                </span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="例：ビルドアップ"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2"
                />
              </label>
            </div>
            <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
              この日、答えた選手：<strong>{playerCount}人</strong>
            </p>
          </div>

          <p className="mb-2 rounded-xl bg-primary-50 p-3 text-[11px] leading-relaxed text-primary-900">
            大事なのは、正しく点をつけることではありません。
            <strong>選手がどう感じたと思うかを、先に自分の言葉にしておくこと</strong>です。
            選手の答えを見る前に入力してください。
          </p>

          <div className="space-y-2">
            {METRICS.map((m) => (
              <ScaleInput
                key={m.key}
                question={m.coachQuestion}
                low={m.low}
                high={m.high}
                value={values[m.coachField as string] ?? null}
                onChange={set(m.coachField as string)}
              />
            ))}
            <ScaleInput
              question="今日の練習そのものへの評価は？"
              low="狙いを達成できなかった"
              high="狙い通りにできた"
              value={values.session_rating ?? null}
              onChange={set("session_rating")}
              note="指導者だけの項目です（ちがいの計算には使いません）"
            />

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-800">選手に伝えたいこと</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="例：アップの入りは自分たちで判断して動き出してほしい"
                className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-800">
                そのほか、書きたいこと
              </p>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="sticky bottom-16 mt-4 rounded-xl bg-white/95 p-2 shadow-lg backdrop-blur">
            <button
              onClick={submit}
              disabled={!complete || busy}
              className="w-full rounded-xl bg-primary-600 py-3.5 font-bold text-white disabled:bg-slate-300 hover:bg-primary-700 active:bg-primary-800"
            >
              {complete
                ? busy
                  ? "保存中…"
                  : "保存する"
                : `あと ${KEYS.length - answered} 項目`}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
