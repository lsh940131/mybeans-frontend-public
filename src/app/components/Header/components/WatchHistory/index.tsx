/**
 * 헤더 컴포넌트의 구경상품기록 버튼
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWatchHistory } from "./hooks/useWatchHistory";
import btnWatchHistory from "./assets/btn_watch_history.png";
import { formatDate } from "@/utils/shared/index";

export default function WatchHistory() {
  const { items, loading, reload, remove, clear } = useWatchHistory();
  const [open, setOpen] = useState(false);

  // 패널이 열릴 때 최신화
  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // body 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 날짜 그룹핑(최신일자 먼저)
  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const key = formatDate(it.viewedAt);
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a < b ? 1 : -1));
  }, [items]);

  return (
    <>
      {/* 트리거 버튼: 헤더 아이콘 영역에 끼워넣기 */}
      <button
        aria-label="구경한 상품 보기"
        onClick={() => setOpen(true)}
        className="mr-4 inline-flex items-center justify-center cursor-pointer"
      >
        <Image
          src={btnWatchHistory}
          alt="watch history"
          width={48}
          height={48}
          className="w-12 h-12"
        />
      </button>

      {/* 백드롭 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* 오른쪽 드로어 */}
      <aside
        className={[
          "fixed top-0 right-0 z-50 h-full w-[22rem] max-w-[95vw] bg-white shadow-2xl",
          "transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
          "flex flex-col",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="watch-history-title"
      >
        {" "}
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h2 id="watch-history-title" className="text-base font-semibold">
            최근 본 상품
          </h2>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                className="text-sm text-neutral-500 hover:text-black"
                onClick={() => void clear()}
              >
                전체삭제
              </button>
            )}
            <button className="text-sm" onClick={() => setOpen(false)}>
              닫기
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-sm text-neutral-500">불러오는 중…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-neutral-500">구경한 상품이 없어요.</div>
          ) : (
            <div className="space-y-6">
              {groups.map(([date, list]) => (
                <section key={date}>
                  <div className="mb-2 text-xs text-neutral-500">{date}</div>
                  <ul className="space-y-3">
                    {list.map(it => (
                      <li
                        key={`${it.productId}-${it.viewedAt}`}
                        className="flex items-center gap-3"
                      >
                        <Link
                          href={`/products/${it.productId}`}
                          className="relative block w-16 h-16 shrink-0 rounded overflow-hidden border bg-neutral-50"
                          onClick={() => setOpen(false)}
                        >
                          <Image
                            src={it.thumbnailUrl}
                            alt={it.nameKr || it.nameEn || "상품"}
                            fill
                            className="object-cover"
                            sizes="64px"
                            loading="lazy"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/products/${it.productId}`}
                            className="block text-sm truncate hover:underline"
                            onClick={() => setOpen(false)}
                            title={it.nameKr || it.nameEn}
                          >
                            {it.nameKr || it.nameEn}
                          </Link>
                          <div className="text-xs text-neutral-400">{formatDate(it.viewedAt)}</div>
                        </div>
                        <button
                          className="text-xs text-neutral-500 hover:text-black"
                          onClick={() => void remove(it.productId)}
                          aria-label="삭제"
                          title="삭제"
                        >
                          삭제
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
