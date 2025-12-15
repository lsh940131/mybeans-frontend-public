"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { fetchApi } from "@/utils/client/fetchApi";
import Link from "next/link";

type ProductItem = {
  id: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  price: number;
  seller: { id: number; name: string };
};

const CARD_W = 300; // 썸네일 기준 폭
const GAP = 24; // 그리드 gap (tailwind gap-6 ≈ 24px)
const LENGTH = 30; // 물품 목록 api 페이지네이션 파라미터

export default function Product() {
  const apiOffsetRef = useRef(0); // 물품 목록 api 페이지네이션 파라미터
  const [products, setProducts] = useState<ProductItem[]>([]); // 물품 목록
  const [maxCount, setMaxCount] = useState(0); // 물품 목록 최대 개수

  const [visible, setVisible] = useState(3); // 한 화면에 노출할 카드 수(3~5)
  const [visibleOffset, setVisibleOffset] = useState(0); //

  const [loading, setLoading] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  // 파생 연산 변수
  const hasMore = maxCount === 0 || apiOffsetRef.current < maxCount; // 물품 목록을 더 불러올 수 있는지
  const lastStart = Math.max(0, maxCount - visible); // 마지막 시작 위치(정상 화면 기준)
  const canPrev = visibleOffset > 0;
  const canNext = visibleOffset < lastStart || hasMore;

  // 컨테이너 폭에 따라 3~5개 컬럼 노출
  useEffect(() => {
    if (!wrapRef.current) return;

    const calcCols = (width: number) => {
      const possible = Math.floor((width + GAP) / (CARD_W + GAP));
      return Math.min(5, Math.max(3, possible));
    };

    const ro = new ResizeObserver(entries => {
      setVisible(calcCols(entries[0].contentRect.width));
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 물품 리스트 조회
  const loadMoreProductList = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);

    try {
      const { list, count } = await fetchApi<{ list: ProductItem[]; count: number }>(
        `/be/product/list?offset=${apiOffsetRef.current}&length=${LENGTH}&sellerIdList=6`
      );

      // count는 최초 1회 세팅
      setMaxCount(prev => (prev === 0 ? count : prev));

      const newItems = list ?? [];
      if (newItems.length > 0) {
        setProducts(prev => [...prev, ...newItems]);
        apiOffsetRef.current += LENGTH;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // 첫 페이지 로드
  useEffect(() => {
    void loadMoreProductList();
  }, []);

  // 오른쪽 버튼: 한 화면(visible)씩 이동
  const goNext = () => {
    if (products.length > 0) {
      const needMore = visibleOffset + 2 * visible >= products.length - 1 && hasMore;
      if (needMore) void loadMoreProductList();
    }
    setVisibleOffset(s => Math.min(s + visible, lastStart));
  };

  // 왼쪽 버튼: 한 화면(visible)씩 이동
  const goPrev = () => {
    setVisibleOffset(s => Math.max(0, s - visible));
  };

  // 뷰포트 아이템: 데이터 끝에 도달하여 빈 칸이 생길 경우 products에 저장된 앞쪽 데이터를 재사용(순환 아님)
  const windowItems = useMemo(() => {
    if (products.length === 0) return [] as ProductItem[];

    const end = visibleOffset + visible;

    if (end <= products.length) {
      return products.slice(visibleOffset, end);
    }

    if (hasMore && products.length > 0) {
      const items: ProductItem[] = [];
      for (let i = visibleOffset; i < end; i++) {
        items.push(products[i % products.length]);
      }
      return items;
    }

    const start = Math.max(0, products.length - visible);
    return products.slice(start, start + visible);
  }, [products, visibleOffset, visible, hasMore]);

  // 상품상세 URL 생성기
  const toDetailHref = (id: number) => `/products/${id}`;

  return (
    <section className="w-full mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">추천 상품</h3>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded-lg border disabled:opacity-40"
            onClick={goPrev}
            disabled={!canPrev}
            aria-label="이전 보기"
          >
            ◀
          </button>
          <button
            className="px-3 py-1 rounded-lg border disabled:opacity-40"
            onClick={goNext}
            disabled={!canNext && !loading}
            aria-label="다음 보기"
          >
            ▶
          </button>
        </div>
      </div>

      {/* 뷰포트 */}
      <div ref={wrapRef} className="w-full overflow-hidden">
        <div
          className="grid gap-6 justify-center"
          style={{ gridTemplateColumns: `repeat(${visible}, ${CARD_W}px)` }}
        >
          {windowItems.map((p, i) => (
            // 카드 전체를 링크로 감싸서 클릭/새탭/접근성 모두 해결
            <Link
              key={`${p.id}-${visibleOffset + i}`}
              href={toDetailHref(p.id)}
              className="rounded-2xl shadow hover:shadow-lg transition-shadow p-4 flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              aria-label={`${p.nameKr} 상세보기`}
            >
              <div className="relative w-[300px] h-[300px]">
                <Image
                  src={p.thumbnailUrl}
                  alt={p.nameKr}
                  fill
                  className="object-cover rounded-xl"
                  sizes="300px"
                />
              </div>
              <div className="mt-3 w-full">
                <div className="text-base font-medium truncate">{p.nameKr}</div>
                <div className="text-sm text-gray-500 truncate">{p.nameEn}</div>
                <div className="mt-1 text-lg font-semibold">{p.price.toLocaleString()}원</div>
                <div className="text-xs text-gray-500 mt-1">by {p.seller?.name}</div>
              </div>
            </Link>
          ))}

          {/* 로딩/빈 상태 플레이스홀더 */}
          {products.length === 0 &&
            Array.from({ length: visible }).map((_, i) => (
              <div key={`skeleton-${i}`} className="rounded-2xl border p-4 animate-pulse">
                <div className="w-[300px] h-[300px] bg-gray-200 rounded-xl" />
                <div className="mt-3 h-4 bg-gray-200 rounded" />
                <div className="mt-2 h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
