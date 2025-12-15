"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseIdList } from "@/utils/shared/url";

type Seller = { id: number; name: string };

export default function Seller({
  sellers,
  initialSelectedIds = [],
}: {
  sellers: Seller[];
  initialSelectedIds?: number[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialSelectedIds));
  const baselineRef = useRef<Set<number>>(new Set(selected));

  // 모달이 닫혀 있을 때만 선택된 판매자 동기화
  const spSelected = useMemo(() => parseIdList(sp.get("sellerIdList")), [sp]);
  useEffect(() => {
    if (!open) setSelected(spSelected);
  }, [spSelected, open]);

  const selectedCount = selected.size;

  // 판매자 이름 필터
  const [keyword, setKeyword] = useState("");
  const normalize = (s: string) => s.toLowerCase().trim();
  const filtered = useMemo(() => {
    const k = normalize(keyword);
    if (!k) return sellers;
    return sellers.filter(v => normalize(v.name).includes(k));
  }, [sellers, keyword]);

  // 토글 하나
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  // 토글 전체
  const toggleAll = () => {
    const ids = filtered.map(v => v.id);
    const allSelected = ids.every(id => selected.has(id));
    const next = new Set(selected);
    if (allSelected) ids.forEach(v => next.delete(v));
    else ids.forEach(v => next.add(v));
    setSelected(next);
  };

  // 토글 전체 해제
  const clearAll = () => setSelected(new Set());

  // 팝업 오픈
  const openPopup = () => {
    const curFromUrl = parseIdList(sp.get("sellerIdList"));
    baselineRef.current = new Set(curFromUrl);
    setSelected(new Set(curFromUrl));
    setOpen(true);
  };

  const cancel = () => {
    setSelected(new Set(baselineRef.current));
    setOpen(false);
  };

  // ESC로 모달 닫기
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancel(); // 기존 취소 로직 재사용
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const apply = () => {
    const nextQS = new URLSearchParams(sp.toString());
    if (selected.size) nextQS.set("sellerIdList", [...selected].join(","));
    else nextQS.delete("sellerIdList");
    nextQS.set("page", "1");
    router.push(`/products?${nextQS.toString()}`);
    setOpen(false);
  };

  return (
    <>
      {/* 트리거 + 뱃지 */}
      <div className="relative inline-flex items-center gap-2">
        <button
          className="border px-3 py-2 rounded hover:bg-neutral-50"
          onClick={openPopup}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          판매자
        </button>
        {selectedCount > 0 && (
          <span className="text-xs rounded-full bg-black text-white px-2 py-0.5">
            {selectedCount}
          </span>
        )}
      </div>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" onClick={cancel}>
          {/* overlay */}
          <div className="absolute inset-0 bg-black/30" />
          {/* panel */}
          <div
            className="absolute left-1/2 top-24 w-[720px] max-w-[96vw] -translate-x-1/2 rounded-xl bg-white shadow-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">선택</h3>
              <button className="text-sm text-neutral-500 hover:text-black" onClick={cancel}>
                닫기
              </button>
            </div>

            {/* 검색 입력 */}
            <div className="mb-3 flex gap-2">
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") setKeyword("");
                }}
                placeholder="판매자 이름 검색"
                className="w-full border rounded px-3 py-2"
              />
              <button
                className="border rounded px-3 py-2 whitespace-nowrap"
                onClick={toggleAll}
                title="현재 필터 결과 전체 선택/해제"
              >
                전체 토글
              </button>
            </div>

            {/* 리스트 */}
            <div className="max-h-[60vh] overflow-auto pr-1">
              {filtered.length === 0 ? (
                <div className="text-sm text-neutral-500 py-6 text-center">결과가 없습니다.</div>
              ) : (
                <ul className="divide-y">
                  {filtered.map(v => {
                    const checked = selected.has(v.id);
                    return (
                      <li key={v.id} className="py-2">
                        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => toggleOne(v.id)}
                          />
                          <span className="text-sm">{v.name}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* 액션 */}
            <div className="mt-4 flex items-center justify-between">
              <button className="text-sm text-neutral-600 hover:text-black" onClick={clearAll}>
                전체 해제
              </button>
              <div className="flex gap-2">
                <button className="border px-4 py-2 rounded" onClick={cancel}>
                  취소
                </button>
                <button className="border px-4 py-2 rounded bg-black text-white" onClick={apply}>
                  적용 ({selectedCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
