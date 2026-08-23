"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import ScaleInput from "@/components/ScaleInput";
import { loadAuth } from "@/lib/auth";
import { jpLabel, today } from "@/lib/date";
import { FORMATION_COMFORT, METRICS } from "@/lib/metrics";
import { getStore, type PlayerAnswer } from "@/lib/store";
import {
  SESSION_TYPE_LABEL,
  type AuthState,
  type Session,
  type SessionType,
} from "@/lib/types";

type Values = Record<string, number | null>;

const KEYS = [...METRICS.map((m) => m.playerField as string), "formation_comfort"];

export default function PlayerPage() {
  const store = getStore();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [date, setDate] = useState(today());
  const [sessionType, setSessionType] = useState<SessionType>("practice");
  const [session, setSession] = useState<Session | null>(null);
  const [values, setValues] = useState<Values>({});
  const [message, setMessage] = useState("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);

  useEffect(() => setAuth(loadAuth()), []);

  const loadExisting = useCallback(async () => {
    if (!auth) return;
    setError("");
    try {
      const s = await store.ensureSession({
        teamId: auth.teamId,
        date,
        sessionType,
      });
      setSession(s);
      const existing = await store.getPlayerResponse(s.id, auth.userId);
      if (existing) {
        const v: Values = {};
        for (const k of KEYS) v[k] = (existing as unknown as Values)[k] ?? null;
        setValues(v);
        setMessage(existing.message ?? "");
        setComment(existing.comment ?? "");
        setAlreadyAnswered(true);
      } else {
        setValues({});
        setMessage("");
        setComment("");
        setAlreadyAnswered(false);
      }
      setSaved(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, [auth, date, sessionType, store]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

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
      const answer = {
        ...(Object.fromEntries(
          KEYS.map((k) => [k, values[k] as number]),
        ) as unknown as PlayerAnswer),
        message: message.trim(),
        comment: comment.trim(),
      };
      await store.savePlayerResponse(session.id, auth.userId, answer);
      setSaved(true);
      setAlreadyAnswered(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="今日のふりかえり" subtitle={jpLabel(date)}>
      {saved ? (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-center">
          <p className="text-3xl">✅</p>
          <p className="mt-2 text-lg font-black text-teal-900">送信しました</p>
          <p className="mt-2 text-xs leading-relaxed text-teal-800">
            あなたの答えは、チームの平均としてまとめられます。
            <br />
            指導者の見え方とどうちがったかは、次のミーティングで一緒に見ます。
          </p>
          <button
            onClick={() => setSaved(false)}
            className="mt-4 rounded-xl border border-teal-400 px-4 py-2 text-sm font-bold text-teal-800"
          >
            入力し直す
          </button>
        </div>
      ) : (
        <>
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
                  {(
                    Object.keys(SESSION_TYPE_LABEL) as SessionType[]
                  ).map((t) => (
                    <option key={t} value={t}>
                      {SESSION_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {session?.notes && (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                今日のテーマ：{session.notes}
                {session.formation ? `／${session.formation}` : ""}
              </p>
            )}
            {alreadyAnswered && (
              <p className="mt-2 text-[11px] text-amber-700">
                この日はもう答えています。もう一度送ると、前の答えは上書きされます。
              </p>
            )}
          </div>

          <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
            正解はありません。今の自分の感覚をそのまま選んでください。
            10段階を1タップずつ、1分ほどで終わります。
          </p>

          <div className="space-y-2">
            {METRICS.map((m) => (
              <ScaleInput
                key={m.key}
                question={m.playerQuestion}
                low={m.low}
                high={m.high}
                value={values[m.playerField as string] ?? null}
                onChange={set(m.playerField as string)}
              />
            ))}
            <ScaleInput
              question={FORMATION_COMFORT.playerQuestion}
              low={FORMATION_COMFORT.low}
              high={FORMATION_COMFORT.high}
              value={values.formation_comfort ?? null}
              onChange={set("formation_comfort")}
              note={
                session?.formation
                  ? `今日のフォーメーション：${session.formation}`
                  : "指導者がフォーメーションを登録すると、ここに出ます"
              }
            />

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-800">
                コーチに伝えたいこと
              </p>
              <p className="text-[11px] text-slate-500">
                言いにくいことでも大丈夫です（書かなくてもOK）
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="例：他のチームがグラウンドを使っていたので、アップを始めていいか分かりませんでした"
                className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-800">
                そのほか、書きたいこと
              </p>
              <p className="text-[11px] text-slate-500">
                気づいたこと・良かったこと（書かなくてもOK）
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
              className="w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white disabled:bg-slate-300"
            >
              {complete
                ? busy
                  ? "送信中…"
                  : "送信する"
                : `あと ${KEYS.length - answered} 項目`}
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
