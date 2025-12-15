"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { list as fetchWatchHistory } from "@/features/watchHistory/api";
import { PwhListItemPayload } from "@/features/watchHistory/types";
import { formatDate } from "@/utils/shared";

export default function MypageWatchHistory() {
  const router = useRouter();

  const [latestItem, setLatestItem] = useState<PwhListItemPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await fetchWatchHistory(); // ProductListPayload
        const items = res?.list ?? [];

        if (items.length) {
          // createdAt 기준 내림차순 정렬 → 가장 최근 1개
          const sorted = [...items].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setLatestItem(sorted[0]);
        } else {
          setLatestItem(null);
        }
      } catch (err) {
        console.error("[WatchHistorySummary] 최근 본 상품 조회 실패:", err);
        setErrorMsg("최근 본 상품을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleClickViewAll = () => {
    router.push("/mypage/watch-history");
  };

  const handleClickItem = () => {
    if (!latestItem) return;
    router.push(`/products/${latestItem.product.id}`);
  };

  return (
    <section className="w-full max-w-3xl rounded-lg bg-white px-8 py-5 shadow-sm">
      {/* 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">최근 본 상품</h2>
        <button
          type="button"
          onClick={handleClickViewAll}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          모두 보기 &gt;
        </button>
      </div>

      {/* 구분선 */}
      <div className="mb-4 -mx-8 h-px bg-gray-200" />

      {/* 내용 */}
      <div className="min-h-[80px]">
        {loading && <p className="text-sm text-gray-500">불러오는 중입니다...</p>}

        {!loading && errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

        {!loading && !errorMsg && !latestItem && (
          <p className="text-sm text-gray-500">최근 본 상품이 없습니다.</p>
        )}

        {!loading && !errorMsg && latestItem && (
          <button
            type="button"
            onClick={handleClickItem}
            className="flex w-full items-center gap-4 text-left cursor-pointer transition"
          >
            {/* 썸네일 */}
            <div className="h-20 w-20 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={latestItem.product.thumbnailUrl}
                alt={latestItem.product.nameKr}
                className="h-full w-full object-cover"
              />
            </div>

            {/* 텍스트 블럭 */}
            <div className="flex flex-1 flex-col gap-1">
              <div className="text-xs text-gray-500">
                {formatDate(new Date(latestItem.createdAt))}
              </div>
              <div className="line-clamp-2 text-sm font-medium text-gray-900">
                {latestItem.product.nameKr}
              </div>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
