"use client";

import { parseIdList } from "@/utils/shared/url";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type CategoryNode = { id: number; nameKr: string; nameEn: string; children: CategoryNode[] };

export default function Category({
  tree,
  initialSelectedIds = [],
}: {
  tree: CategoryNode[];
  initialSelectedIds?: number[];
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(initialSelectedIds));
  const baselineRef = useRef<Set<number>>(new Set(selected));

  // 트리 인덱싱
  const { childrenMap, parentMap, rootIds } = useMemo(() => {
    const childrenMap = new Map<number | null, CategoryNode[]>();
    const parentMap = new Map<number, number | null>();
    const visit = (node: CategoryNode, parentId: number | null) => {
      parentMap.set(node.id, parentId);
      if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
      childrenMap.get(parentId)!.push(node);
      node.children.forEach(c => visit(c, node.id));
    };
    tree.forEach(n => visit(n, null));
    const rootIds = (childrenMap.get(null) ?? []).map(n => n.id);
    return { childrenMap, parentMap, rootIds };
  }, [tree]);

  const rootNodes = childrenMap.get(null) ?? [];

  // 자식 캐시
  const childrenCache = useRef(new Map<number, number[]>());
  const getCategoryChildren = useCallback(
    (id: number) => {
      const hit = childrenCache.current.get(id);
      if (hit) return hit;
      const out: number[] = [];
      const stack = [id];
      while (stack.length) {
        const cur = stack.pop()!;
        const children = (childrenMap.get(cur) ?? []) as CategoryNode[];
        for (const child of children) {
          out.push(child.id);
          stack.push(child.id);
        }
      }
      childrenCache.current.set(id, out);
      return out;
    },
    [childrenMap]
  );

  const spSelected = useMemo(() => parseIdList(sp.get("categoryIdList")), [sp]);

  // 모달이 닫혀있을 때만 동기화
  useEffect(() => {
    if (open) return;
    // 불필요한 setState 방지(동일 Set이면 skip)
    const isSame =
      spSelected.size === selected.size && [...spSelected].every(id => selected.has(id));
    if (!isSame) setSelected(spSelected);
  }, [open, spSelected, selected]);

  // 카테고리 선택 개수 계산
  const computeBadgeCount = useCallback(
    (sel: Set<number>) => {
      const roots: number[] = [];

      // 1. sel에서 조상도 선택된 항목은 제거 → 효과적 루트 선택 집합
      for (const id of sel) {
        let cur = parentMap.get(id) ?? null;
        let hasAncestor = false;
        while (cur !== null) {
          if (sel.has(cur)) {
            hasAncestor = true;
            break;
          }
          cur = parentMap.get(cur) ?? null;
        }
        if (!hasAncestor) roots.push(id);
      }

      // 2. 각 루트에 대해 (자기 자신 1 + 모든 후손 수) 합산
      let total = 0;
      for (const id of roots) {
        total += 1 + getCategoryChildren(id).length;
      }
      return total;
    },
    [parentMap, getCategoryChildren]
  );
  const badgeCount = useMemo(() => computeBadgeCount(selected), [selected, computeBadgeCount]);

  /**
   * 부모 확장
   * 부모가 선택된 상태에서 자식을 토글하면,
   * 부모 선택을 하위 전체로 펼친 뒤(=부모 삭제 + 후손 전부 추가) 토글을 적용한다.
   */
  const expandParent = (selected: Set<number>, id: number) => {
    let cur: number | null | undefined = id;
    while ((cur = parentMap.get(cur!) ?? null) !== null) {
      if (selected.has(cur!)) {
        selected.delete(cur!);
        const allChildren = getCategoryChildren(cur!);
        for (const child of allChildren) selected.add(child);
      }
    }
  };
  /**
   * 선택 압축
   * 모든 자식(하위 전체)이 선택된 노드는 부모로 승격하고(부모 선택),
   * 그 하위 선택은 제거한다.
   */
  const compressSelection = (select: Set<number>): Set<number> => {
    const nextSelected = new Set(select);

    const visit = (id: number): boolean => {
      // 1) 이 노드가 선택되어 있으면 ↓
      if (nextSelected.has(id)) {
        // 하위 전체는 개별로 들고 있지 않도록 정리
        const children = getCategoryChildren(id);
        for (const child of children) nextSelected.delete(child);
        return true; // 이 서브트리는 완전 선택으로 간주
      }

      const children = (childrenMap.get(id) ?? []) as CategoryNode[];
      if (children.length === 0) {
        // 리프이고 자기 자신이 선택도 안 됐으면 fully-selected 아님
        return false;
      }

      // 2) 하위 방문 결과로 판정
      let allChildrenFull = true;
      for (const child of children) {
        if (!visit(child.id)) allChildrenFull = false;
      }

      if (allChildrenFull) {
        // 자식 전부가 fully-selected → 부모로 승격, 하위 정리
        const children = getCategoryChildren(id);
        for (const child of children) nextSelected.delete(child);
        nextSelected.add(id);
        return true;
      } else {
        // 일부만 선택 → 부모는 부분선택 표현(자식들로만 유지)
        // (부모가 혹시 남아 있으면 정리)
        if (nextSelected.has(id)) nextSelected.delete(id);
        return false;
      }
    };

    // 루트부터 후위 순회
    for (const rootId of rootIds) visit(rootId);

    return nextSelected;
  };

  /**
   * 팝업 오픈
   */
  const openPopup = () => {
    const now = parseIdList(sp.get("categoryIdList"));
    baselineRef.current = new Set(now);
    setSelected(compressSelection(new Set(now)));
    setOpen(true);
  };

  /**
   * 카테고리 선택 적용
   */
  const apply = () => {
    const nextQS = new URLSearchParams(sp.toString());
    if (selected.size) nextQS.set("categoryIdList", [...selected].join(","));
    else nextQS.delete("categoryIdList");
    nextQS.set("page", "1"); // 필터 변경시 1페이지로
    router.push(`/products?${nextQS.toString()}`);
    setOpen(false);
  };

  /**
   * 카테고리 적용 취소
   */
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

  /**
   * 선택된 카테고리 전부 해제
   */
  const clearAll = () => setSelected(new Set());

  /**
   * 특정 노드를 클릭했을 때 새로운 selected를 만들어 반영
   */
  const toggleNode = (id: number) => {
    const next = new Set(selected);

    // 조상 확장
    expandParent(next, id);
    // 자신+자식 그룹 토글
    const group = [id, ...getCategoryChildren(id)];
    const anySelected = group.some(v => next.has(v));
    if (anySelected) group.forEach(v => next.delete(v));
    else group.forEach(v => next.add(v));

    // 압축
    setSelected(compressSelection(next));
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
          카테고리
        </button>
        {badgeCount > 0 && (
          <span className="text-xs rounded-full bg-black text-white px-2 py-0.5">{badgeCount}</span>
        )}
      </div>

      {/* 모달 */}
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" onClick={cancel}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute left-1/2 top-24 w-[720px] max-w-[96vw] -translate-x-1/2 rounded-xl bg-white shadow-xl p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">카테고리 선택</h3>
              <button className="text-sm text-neutral-500 hover:text-black" onClick={cancel}>
                닫기
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto pr-1">
              <Tree
                nodes={rootNodes}
                parentMap={parentMap}
                childrenMap={childrenMap}
                selected={selected}
                getCategoryChildren={getCategoryChildren}
                onToggle={toggleNode}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button className="text-sm text-neutral-600 hover:text-black" onClick={clearAll}>
                전체 해제
              </button>
              <div className="flex gap-2">
                <button className="border px-4 py-2 rounded" onClick={cancel}>
                  취소
                </button>
                <button className="border px-4 py-2 rounded bg-black text-white" onClick={apply}>
                  적용 ({badgeCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* --- 재귀 트리 + tri-state 체크박스 --- */
function Tree({
  nodes,
  parentMap,
  childrenMap,
  selected,
  getCategoryChildren,
  onToggle,
  depth = 0,
}: {
  nodes: CategoryNode[];
  parentMap: Map<number, number | null>;
  childrenMap: Map<number | null, CategoryNode[]>;
  selected: Set<number>;
  getCategoryChildren: (id: number) => number[];
  onToggle: (id: number) => void;
  depth?: number;
}) {
  // Tree 컴포넌트 안쪽 (추가)
  const hasAncestorSelected = (id: number) => {
    let cur = parentMap.get(id) ?? null;
    while (cur !== null) {
      if (selected.has(cur)) return true; // 부모가 선택되면 자식은 "상속 체크"로 본다
      cur = parentMap.get(cur) ?? null;
    }
    return false;
  };

  const isEffectivelySelected = (id: number) => selected.has(id) || hasAncestorSelected(id); // 실제 선택 or 조상 선택에 의해 체크된 상태

  return (
    <ul className={depth === 0 ? "space-y-1" : "ml-4 space-y-1"}>
      {nodes.map(n => {
        const children = (childrenMap.get(n.id) ?? []) as CategoryNode[];
        const desc = getCategoryChildren(n.id);
        const checked = isEffectivelySelected(n.id);
        const someDescSelected = desc.some(id => isEffectivelySelected(id));
        const indeterminate = !checked && someDescSelected;

        return (
          <li key={n.id}>
            <CheckboxRow
              label={n.nameKr}
              depth={depth}
              checked={checked}
              indeterminate={indeterminate}
              onChange={() => onToggle(n.id)}
            />
            {children.length > 0 && (
              <Tree
                nodes={children}
                parentMap={parentMap}
                childrenMap={childrenMap}
                selected={selected}
                getCategoryChildren={getCategoryChildren}
                onToggle={onToggle}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CheckboxRow({
  label,
  checked,
  indeterminate,
  onChange,
  depth,
}: {
  label: string;
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  depth: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input ref={ref} type="checkbox" className="h-4 w-4" checked={checked} onChange={onChange} />
      <span className={depth === 0 ? "font-medium" : ""}>{label}</span>
    </label>
  );
}
