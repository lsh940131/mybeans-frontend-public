/**
 * 디버그용 클라이언트 컴포넌트
 * 원하는 페이지(예: 로그인 페이지)에 <DebugOverlay />만 추가하면 즉시 사용 가능.
 */
"use client";

import { useEffect, useState } from "react";
// 영속 디버그 로거 (localStorage에 보관)
type Entry = {
  ts: number; // timestamp (ms)
  tag: string; // 구분자 (e.g. 'message', 'popup')
  payload: unknown; // 자유형 데이터
};

const KEY = "__oauth_debug_log__";
const MAX = 500; // 최대 로그 라인 수

function load(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function save(entries: Entry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {}
}

export function dbg(tag: string, payload?: unknown) {
  const list = load();
  list.push({ ts: Date.now(), tag, payload });
  if (list.length > MAX) list.splice(0, list.length - MAX);
  save(list);

  // 콘솔에도 동시에 출력 (원본 보존)
  try {
    console.log(`[DBG:${tag}]`, payload);
  } catch {}
}

export function dbgGet(): Entry[] {
  return load();
}

export function dbgClear() {
  save([]);
}

export default function DebugOverlay() {
  const [open, setOpen] = useState(true);
  const [logs, setLogs] = useState(dbgGet());

  useEffect(() => {
    const t = setInterval(() => setLogs(dbgGet()), 500);
    return () => clearInterval(t);
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 10,
          right: 10,
          zIndex: 999999,
          padding: "8px 10px",
          borderRadius: 8,
          background: "#222",
          color: "#fff",
          opacity: 0.7,
        }}
      >
        LOG
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 10,
        right: 10,
        width: 380,
        maxHeight: 320,
        overflow: "auto",
        background: "rgba(0,0,0,0.85)",
        color: "#0f0",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        fontSize: 12,
        padding: 10,
        borderRadius: 10,
        zIndex: 999999,
      }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <strong style={{ color: "#fff" }}>OAuth Debug</strong>
        <button onClick={() => setOpen(false)}>hide</button>
        <button onClick={() => (dbgClear(), setLogs([]))}>clear</button>
      </div>
      {logs.length === 0 && <div style={{ color: "#999" }}>no logs</div>}
      {logs.map((l, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <span style={{ color: "#8cf" }}>{new Date(l.ts).toLocaleTimeString()}</span>{" "}
          <span style={{ color: "#ff9" }}>[{l.tag}]</span>{" "}
          <code style={{ color: "#0f0", whiteSpace: "pre-wrap" }}>{safeStringify(l.payload)}</code>
        </div>
      ))}
    </div>
  );
}

function safeStringify(v: unknown) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v, replacer, 2);
  } catch {
    return String(v);
  }
}
function replacer(_k: string, val: unknown) {
  if (val === window) return "[window]";
  if (val === document) return "[document]";
  return val;
}
