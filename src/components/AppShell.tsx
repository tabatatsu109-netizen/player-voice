"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canSeeTeamData, clearAuth, loadAuth } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { AuthState } from "@/lib/types";

const COACH_TABS = [
  { href: "/dashboard", label: "チーム", icon: "📊" },
  { href: "/compare", label: "日ごと", icon: "⚖️" },
  { href: "/players", label: "選手", icon: "👤" },
  { href: "/coach", label: "入力", icon: "✏️" },
  { href: "/coach/schedule", label: "計画", icon: "📅" },
  { href: "/export", label: "データ", icon: "⬇️" },
];

const PLAYER_TABS = [{ href: "/player", label: "今日の入力", icon: "✏️" }];

interface Props {
  children: React.ReactNode;
  /** 指導者・管理者のみ閲覧可の画面 */
  requireTeamData?: boolean;
  title?: string;
  subtitle?: string;
}

export default function AppShell({
  children,
  requireTeamData = false,
  title,
  subtitle,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const a = loadAuth();
    if (!a) {
      router.replace("/");
      return;
    }
    if (requireTeamData && !canSeeTeamData(a)) {
      router.replace("/player");
      return;
    }
    setAuth(a);
    setReady(true);
  }, [requireTeamData, router]);

  if (!ready || !auth) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        読み込み中…
      </div>
    );
  }

  const tabs = canSeeTeamData(auth) ? COACH_TABS : PLAYER_TABS;
  const isDemo = getStore().mode === "demo";

  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-20 bg-primary-600 text-white shadow">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] leading-tight text-primary-100">Player Voice</p>
            <h1 className="truncate text-base font-bold leading-tight">
              {title ?? "選手と指導者の見えている景色"}
            </h1>
            {subtitle && (
              <p className="truncate text-[11px] text-primary-100">{subtitle}</p>
            )}
          </div>
          <button
            onClick={() => {
              clearAuth();
              router.replace("/");
            }}
            className="shrink-0 rounded-full border border-primary-400/60 px-3 py-1.5 text-xs hover:bg-primary-700"
          >
            {auth.name}
            <span className="ml-1 opacity-70">切替</span>
          </button>
        </div>
        {isDemo && (
          <p className="bg-amber-400 px-4 py-1 text-center text-[11px] font-medium text-amber-950">
おためしモード（データはこの端末の中だけに保存されます）
          </p>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div
          className="mx-auto grid max-w-3xl"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((t) => {
            const active = pathname?.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-primary-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className={`text-lg leading-none transition-transform ${
                  active ? "scale-110" : ""
                }`}>
                  {t.icon}
                </span>
                {t.label}
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
