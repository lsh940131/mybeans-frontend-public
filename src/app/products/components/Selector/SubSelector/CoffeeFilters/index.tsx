"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** 서버에서 내려주는 카테고리 트리 타입 */
export type CategoryNode = {
  id: number;
  nameKr: string;
  nameEn: string;
  children: CategoryNode[];
};

const KEYS = ["isSingle", "isBlend", "isSpecialty", "isDecaf"] as const;

export default function CoffeeFilters({
  categoryTree,
  coffeeRootId = 1,
}: {
  categoryTree: CategoryNode[];
  coffeeRootId?: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  // ----- URL → 로컬 상태 동기화 (표시용) -----
  const [state, setState] = useState({
    origin: "any" as "any" | "single" | "blend",
    isSpecialty: false,
    isDecaf: false,
  });

  useEffect(() => {
    const origin = sp.has("isSingle") ? "single" : sp.has("isBlend") ? "blend" : "any";
    setState({
      origin,
      isSpecialty: sp.has("isSpecialty"),
      isDecaf: sp.has("isDecaf"),
    });
  }, [sp]);

  const activeCount = useMemo(
    () => (state.origin !== "any" ? 1 : 0) + (state.isSpecialty ? 1 : 0) + (state.isDecaf ? 1 : 0),
    [state]
  );

  // ----- 커피 컨텍스트 판정 -----
  const selectedCategoryIds = useMemo(() => parseCategoryIdList(sp), [sp]);
  const coffeeDescendants = useMemo(
    () => buildDescendantSet(categoryTree, coffeeRootId),
    [categoryTree, coffeeRootId]
  );

  // 요구사항: "카테고리 미선택이면 노출 = true"
  // 카테고리가 선택되어 있다면 "모든 선택이 커피 트리 하위"일 때만 노출
  const enabled =
    selectedCategoryIds.length === 0
      ? true
      : selectedCategoryIds.every(id => coffeeDescendants.has(id));

  // ----- 액션 -----
  const toggleExclusive = (key: "isSingle" | "isBlend") => {
    if (!enabled) return; // 커피 외 컨텍스트에선 토글 막기
    const other = key === "isSingle" ? "isBlend" : "isSingle";
    const qs = new URLSearchParams(sp.toString());

    if (qs.has(key)) {
      qs.delete(key); // 자기 자신 끄기
    } else {
      qs.set(key, "1"); // 자신 켜기
      qs.delete(other); // 상대 끄기(상호배타)
    }
    qs.set("page", "1");
    router.push(`/products?${qs.toString()}`);
  };

  const toggleFlag = (k: "isSpecialty" | "isDecaf") => {
    if (!enabled) return;
    const qs = new URLSearchParams(sp.toString());
    if (qs.has(k)) qs.delete(k);
    else qs.set(k, "1");
    qs.set("page", "1");
    router.push(`/products?${qs.toString()}`);
  };

  const clearAll = () => {
    const nextQS = new URLSearchParams(sp.toString());
    KEYS.forEach(v => nextQS.delete(v));
    nextQS.set("page", "1");
    router.push(`/products?${nextQS.toString()}`);
  };

  // ----- UI -----
  return (
    <div
      className={[
        "mt-2 overflow-hidden transition-all duration-300",
        enabled ? "max-h-24 opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-1",
      ].join(" ")}
      aria-hidden={!enabled}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* 상호배타: 싱글/블렌드 */}
        <Badge
          label="싱글 오리진"
          active={state.origin === "single"}
          onClick={() => toggleExclusive("isSingle")}
        />
        <Badge
          label="블렌드"
          active={state.origin === "blend"}
          onClick={() => toggleExclusive("isBlend")}
        />

        {/* 독립: 스페셜티/디카페인 */}
        <Badge
          label="스페셜티"
          active={state.isSpecialty}
          onClick={() => toggleFlag("isSpecialty")}
        />
        <Badge label="디카페인" active={state.isDecaf} onClick={() => toggleFlag("isDecaf")} />

        {activeCount > 0 && (
          <button
            className="ml-1 text-sm text-neutral-600 underline underline-offset-4 hover:text-black"
            onClick={clearAll}
          >
            초기화
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- 작은 컴포넌트 ---------- */
function Badge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "px-3 py-1 rounded-full text-sm transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-black",
        active
          ? "bg-black text-white ring-2 ring-black"
          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
      ].join(" ")}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

/* ---------- 유틸 ---------- */

/** URLSearchParams에서 categoryIdList를 robust하게 파싱(콤마/다중키 모두 지원) */
function parseCategoryIdList(sp: ReturnType<typeof useSearchParams>) {
  // next/navigation의 ReadonlyURLSearchParams는 getAll 지원 X → 값 형태를 고려해 직접 파싱
  const raw = sp.get("categoryIdList");
  if (!raw) return [] as number[];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map(s => Number(s.trim()))
        .filter(Number.isFinite)
    )
  );
}

/** 특정 루트(coffeeRootId) 포함 모든 자손 id 집합 만들기 */
function buildDescendantSet(roots: CategoryNode[], rootId: number): Set<number> {
  const childMap = new Map<number, number[]>();
  const stack: CategoryNode[] = [...roots];
  while (stack.length) {
    const n = stack.pop()!;
    if (!childMap.has(n.id)) childMap.set(n.id, []);
    for (const c of n.children) {
      childMap.get(n.id)!.push(c.id);
      stack.push(c);
    }
  }
  const out = new Set<number>();
  const s = [rootId];
  while (s.length) {
    const cur = s.pop()!;
    out.add(cur);
    for (const v of childMap.get(cur) ?? []) if (!out.has(v)) s.push(v);
  }
  return out;
}
