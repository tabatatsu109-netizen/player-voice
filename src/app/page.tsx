"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadAuth, saveAuth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Role, Team, User } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  player: "選手",
  coach: "指導者",
  admin: "管理者",
};

export default function LoginPage() {
  const router = useRouter();
  const store = getStore();

  const [step, setStep] = useState<"team" | "role" | "name">("team");
  const [code, setCode] = useState("");
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hintCode, setHintCode] = useState<string | null>(null);

  // 既にログイン済みなら役割に応じた画面へ
  useEffect(() => {
    const a = loadAuth();
    if (a) router.replace(a.role === "player" ? "/player" : "/dashboard");
  }, [router]);

  // デモモードのときだけ、チームコードのヒントを出す
  useEffect(() => {
    if (store.mode !== "demo") return;
    store.listTeams().then((ts) => setHintCode(ts[0]?.join_code ?? null));
  }, [store]);

  async function submitCode(value: string) {
    setError("");
    setBusy(true);
    try {
      const t = await store.getTeamByCode(value);
      if (!t) {
        setError("そのチームコードは見つかりませんでした。先生に聞いてみてください。");
        return;
      }
      setTeam(t);
      setUsers(await store.listUsers(t.id));
      setStep("role");
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続できませんでした");
    } finally {
      setBusy(false);
    }
  }

  function chooseRole(r: Role) {
    setRole(r);
    setStep("name");
  }

  function login(user: User) {
    saveAuth({
      userId: user.id,
      teamId: user.team_id,
      name: user.name,
      role: user.role,
    });
    router.replace(user.role === "player" ? "/player" : "/dashboard");
  }

  async function createAndLogin() {
    if (!team || !role || !newName.trim()) return;
    setBusy(true);
    try {
      const u = await store.createUser({
        teamId: team.id,
        name: newName.trim(),
        role,
      });
      login(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "登録できませんでした");
    } finally {
      setBusy(false);
    }
  }

  const candidates = users.filter((u) => u.role === role);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold tracking-widest text-teal-700">PLAYER VOICE</p>
        <h1 className="mt-1 text-2xl font-black leading-snug text-slate-900">
          選手と指導者の
          <br />
          「見えている景色」をつなぐ
        </h1>
        <p className="mt-3 rounded-xl bg-teal-50 p-3 text-xs leading-relaxed text-teal-900">
          このアプリは、どちらが正しいかを決めるものではありません。
          同じ練習を選手と指導者がそれぞれ評価し、
          <strong>見え方の違いを一緒に確認して話し合う</strong>ための道具です。
        </p>
      </div>

      {/* ステップ1：チームコード */}
      {step === "team" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCode(code);
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-bold text-slate-700">
            チームコード
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            placeholder="例：NIRASAKI"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 tracking-widest"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="w-full rounded-xl bg-teal-700 py-3.5 font-bold text-white disabled:opacity-40"
          >
            次へ
          </button>
          {hintCode && (
            <button
              type="button"
              onClick={() => {
                setCode(hintCode);
                submitCode(hintCode);
              }}
              className="w-full rounded-xl border border-dashed border-teal-400 py-3 text-sm text-teal-700"
            >
              サンプルのデータで試す（コード：{hintCode}）
            </button>
          )}
        </form>
      )}

      {/* ステップ2：役割 */}
      {step === "role" && team && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            <span className="font-bold text-slate-900">{team.name}</span>
            <br />
            あなたの立場を選んでください
          </p>
          {(["player", "coach", "admin"] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => chooseRole(r)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-left font-bold text-slate-800 active:bg-slate-50"
            >
              {ROLE_LABEL[r]}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {r === "player"
                  ? "練習のあとに、自分の状態を入力します"
                  : r === "coach"
                    ? "同じ練習に点をつけて、選手との見え方のちがいを見ます"
                    : "まとめを見て、データを出します"}
              </span>
            </button>
          ))}
          <button
            onClick={() => setStep("team")}
            className="w-full py-2 text-sm text-slate-500"
          >
            ← チームを選び直す
          </button>
        </div>
      )}

      {/* ステップ3：名前 */}
      {step === "name" && role && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">名前を選んでください</p>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {candidates.map((u) => (
              <button
                key={u.id}
                onClick={() => login(u)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-left active:bg-slate-50"
              >
                <span className="font-bold text-slate-800">{u.name}</span>
                {u.position && (
                  <span className="ml-2 text-xs text-slate-500">
                    {u.position}
                    {u.grade ? ` / ${u.grade}年` : ""}
                  </span>
                )}
              </button>
            ))}
            {candidates.length === 0 && (
              <p className="text-xs text-slate-500">
                登録されている{ROLE_LABEL[role]}がいません。下から追加してください。
              </p>
            )}
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 p-3">
            <p className="text-xs font-bold text-slate-600">名簿にない場合は追加</p>
            <div className="mt-2 flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="氏名"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                onClick={createAndLogin}
                disabled={busy || !newName.trim()}
                className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                追加
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep("role")}
            className="w-full py-2 text-sm text-slate-500"
          >
            ← 立場を選び直す
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>
      )}

      <p className="mt-auto pt-8 text-[10px] leading-relaxed text-slate-400">
        入力した内容は、チームの平均としてまとめられ、指導者と管理者だけが見ます。
        チームメイトどうしがお互いの答えを見ることはできません。
      </p>
    </div>
  );
}
