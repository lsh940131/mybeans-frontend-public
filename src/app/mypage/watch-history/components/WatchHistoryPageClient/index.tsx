"use client";

import { useEffect, useMemo, useState } from "react";
import * as watchHistoryApi from "@/features/watchHistory/api";
import type { PwhListItemPayload } from "@/features/watchHistory/types";
import SearchBox from "../SearchBox";
import WatchHistoryList from "../List";

export default function WatchHistoryPageClient() {
  const [items, setItems] = useState<PwhListItemPayload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [keyword, setKeyword] = useState<string>("");

  // 최초 1회 전체 리스트 조회
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const res = await watchHistoryApi.list();
        setItems(res?.list ?? []);
      } catch (e) {
        console.error("[WatchHistoryPageClient] 최근 본 상품 조회 실패:", e);
        setErrorMsg("최근 본 상품을 불러오지 못했습니다.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchHistory();
  }, []);

  // 프론트 단에서만 필터링 (최대 50개이므로 메모리 필터로 충분)
  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;

    return items.filter(item => {
      const nameKr = item.product.nameKr?.toLowerCase() ?? "";
      const nameEn = item.product.nameEn?.toLowerCase() ?? "";
      return nameKr.includes(q) || nameEn.includes(q);
    });
  }, [items, keyword]);

  const handleChangeKeyword = (value: string) => {
    setKeyword(value);
  };

  const handleClearAll = async () => {
    if (!items.length) return;
    const ok = window.confirm("최근 본 상품 기록을 모두 삭제하시겠습니까?");
    if (!ok) return;

    try {
      // 낙관적 업데이트
      setItems([]);
      await watchHistoryApi.clear();
    } catch (e) {
      console.error("[WatchHistoryPageClient] 전체 삭제 실패:", e);
      alert("최근 본 상품 기록을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const handleDeleteOne = async (productId: number) => {
    try {
      // 먼저 클라이언트 상태에서 제거
      setItems(prev => prev.filter(item => item.product.id !== productId));
      await watchHistoryApi.del(productId);
    } catch (e) {
      console.error("[WatchHistoryPageClient] 단일 삭제 실패:", e);
      alert("상품을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <section className="w-full max-w-3xl rounded-lg bg-white px-8 py-6 shadow-sm mx-auto">
      {/* 헤더 + 검색 박스 */}
      <SearchBox
        keyword={keyword}
        onChangeKeyword={handleChangeKeyword}
        totalCount={items.length}
        onClearAll={items.length > 0 ? handleClearAll : undefined}
      />

      {/* 구분선 */}
      <div className="mb-4 -mx-8 h-px bg-gray-200" />

      {/* 리스트 */}
      <WatchHistoryList
        items={filteredItems}
        loading={loading}
        errorMsg={errorMsg}
        onDeleteItem={handleDeleteOne}
      />
    </section>
  );
}
