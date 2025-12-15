"use client";

type JsonPrimitive = string | number | boolean | null;
export type Json = JsonPrimitive | Json[] | { [k: string]: Json };

export function getSessionItem<T = unknown>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setSessionItem<T extends Json>(key: string, value: T) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // do nothing
  }
}

export function removeSessionItem(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // do nothing
  }
}

/**
 * 세션에 저장된 모든 정보 삭제
 */
export function clearSession() {
  try {
    sessionStorage.clear();
  } catch {
    // do nothing
  }
}
