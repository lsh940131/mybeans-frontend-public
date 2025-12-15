import { redirect } from "next/navigation";
import { fetchApi } from "@/utils/server/fetchApi";
import { toBool, toNumArray } from "@/utils/shared";
import { type RawSP } from "@/utils/shared/url";
import { spToQS } from "@/utils/shared/url";
import Grid from "./components/Grid";
import Pagination from "./components/Pagination";

export const dynamic = "force-dynamic";
const LENGTH = 25;

type CategoryNode = {
  id: number;
  nameKr: string;
  nameEn: string;
  children: CategoryNode[];
};

type ProductItem = {
  id: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  price: number;
  seller: { id: number; name: string };
};

// 물품 목록 페이지
export default async function ProductsPage({ searchParams }: { searchParams: Promise<RawSP> }) {
  const sp = await searchParams;

  const page = parsePage(sp.page);
  const keyword = (sp.keyword as string | undefined)?.trim();
  const selectedCategoryIdList = toNumArray(sp.categoryIdList);
  const sellerIdList = toNumArray(sp.sellerIdList);
  const isSingle = toBool(sp.isSingle);
  const isBlend = toBool(sp.isBlend);
  const isSpecialty = toBool(sp.isSpecialty);
  const isDecaf = toBool(sp.isDecaf);

  const categoryTree = await fetchApi<CategoryNode[]>(`/be/category/tree`);
  const expandedSelectedCategoryIdList = getCategoryChildren(selectedCategoryIdList, categoryTree);

  const qs = new URLSearchParams({
    offset: String(pageToOffset(Number(sp.page), LENGTH)),
    length: String(LENGTH),
  });
  if (keyword) qs.set("keyword", keyword.trim());
  if (expandedSelectedCategoryIdList?.length)
    qs.set("categoryIdList", expandedSelectedCategoryIdList.join(","));
  if (sellerIdList?.length) qs.set("sellerIdList", sellerIdList.join(","));
  if (isSingle) qs.set("isSingle", "true");
  if (isBlend) qs.set("isBlend", "true");
  if (isSpecialty) qs.set("isSpecialty", "true");
  if (isDecaf) qs.set("isDecaf", "true");

  // 커피 컨텍스트일 때만 불린 포함(짧게 1로 전송; 백엔드 TransformToBoolean이 1/true 모두 OK)
  // 커피 컨텍스트 판정
  const coffeeIdSet = buildDescendantSet(categoryTree, /* coffee root id */ 1);
  const isCoffeeContext =
    selectedCategoryIdList.length > 0 && selectedCategoryIdList.every(id => coffeeIdSet.has(id));

  // 컨텍스트 깨졌는데 커피 불린이 있으면 정규화
  const coffeeKeys = ["isSingle", "isBlend", "isSpecialty", "isDecaf"] as const;
  const hasCoffeeFlags = coffeeKeys.some(k => sp[k] !== undefined);
  if (!isCoffeeContext && hasCoffeeFlags) {
    const qs = spToQS(sp);
    coffeeKeys.forEach(k => qs.delete(k));
    redirect(`/products?${qs.toString()}`);
  }

  // 배타성 정규화: 둘 다 있으면 any로(둘 다 제거)
  if (isCoffeeContext && isSingle && isBlend) {
    const qs = spToQS(sp);
    qs.delete("isSingle");
    qs.delete("isBlend");
    redirect(`/products?${qs.toString()}`);
  }

  // 커피 컨텍스트일 때만 적용
  if (isCoffeeContext) {
    if (isSingle) qs.set("isSingle", "1");
    if (isBlend) qs.set("isBlend", "1");
    if (isSpecialty) qs.set("isSpecialty", "1");
    if (isDecaf) qs.set("isDecaf", "1");
  }

  const { list, count } = await fetchApi<{ list: ProductItem[]; count: number }>(
    `/be/product/list?${qs.toString()}`,
    { cache: "no-store" }
  );

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / LENGTH));
  if (page > pageCount) {
    const qs = new URLSearchParams();
    Object.entries(sp).forEach(([k, v]) => {
      if (k === "page" || v === undefined) return;
      if (Array.isArray(v)) v.forEach(x => qs.append(k, String(x)));
      else qs.set(k, String(v));
    });
    qs.set("page", String(pageCount)); // 마지막 페이지로(직접 접근/뒤로가기 케이스)
    redirect(`/products?${qs.toString()}`);
  }

  return (
    <main className="mx-auto max-w-7xl p-6">
      <Grid products={list} searchParams={sp} />

      <Pagination
        page={page}
        pageSize={LENGTH}
        total={count ?? 0}
        searchParams={sp}
        basePath="/products"
      />
    </main>
  );
}

function parsePage(v: string | string[] | undefined): number {
  const s = Array.isArray(v) ? v[0] : v;
  const n = parseInt(String(s ?? ""), 10);

  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * page와 pageSize로 offset 계산
 * @param page 현재 페이지
 * @param pageSize LENGTH
 */
function pageToOffset(page: number, pageSize: number): number {
  const p = Number(page || 1);

  if (p < 2) return 0;
  else return (p - 1) * pageSize;
}

/**
 * 선택한 카테고리와 그에 속한 카테고리들의 id 리스트 반환
 */
function getCategoryChildren(selected: number[], roots: CategoryNode[]): number[] {
  const childrenMap = new Map<number, number[]>();
  const stack: CategoryNode[] = [...roots];
  while (stack.length) {
    const n = stack.pop()!;
    if (!childrenMap.has(n.id)) childrenMap.set(n.id, []);
    for (const c of n.children) {
      childrenMap.get(n.id)!.push(c.id);
      stack.push(c);
    }
  }

  const out = new Set<number>();
  for (const id of selected) {
    out.add(id);
    const s = [id];
    while (s.length) {
      const cur = s.pop()!;
      for (const k of childrenMap.get(cur) ?? []) {
        if (!out.has(k)) {
          out.add(k);
          s.push(k);
        }
      }
    }
  }

  return Array.from(out);
}

/** 커피 루트(id) 포함 모든 자손 id 집합 */
function buildDescendantSet(roots: CategoryNode[], coffeeRootId: number): Set<number> {
  // id → children ids 맵
  const childrenMap = new Map<number, number[]>();
  const stack: CategoryNode[] = [...roots];
  while (stack.length) {
    const n = stack.pop()!;
    if (!childrenMap.has(n.id)) childrenMap.set(n.id, []);
    for (const c of n.children) {
      childrenMap.get(n.id)!.push(c.id);
      stack.push(c);
    }
  }
  // coffeeRootId부터 DFS
  const out = new Set<number>();
  const s = [coffeeRootId];
  while (s.length) {
    const cur = s.pop()!;
    out.add(cur);
    for (const v of childrenMap.get(cur) ?? []) {
      if (!out.has(v)) s.push(v);
    }
  }
  return out;
}
