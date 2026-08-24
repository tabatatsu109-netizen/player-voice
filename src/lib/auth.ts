"use client";

import type { AuthState } from "./types";

const KEY = "player-voice-auth-v2";

export function saveAuth(a: AuthState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(a));
}

export function loadAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** 指導者・管理者だけが見られる画面か */
export function canSeeTeamData(a: AuthState | null): boolean {
  return a?.role === "coach" || a?.role === "admin";
}
