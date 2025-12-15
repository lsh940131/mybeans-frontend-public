"use client";

/**
 * SearchBox
 *
 * - URL keyword와 동기화
 * - 상품 검색 실행
 * - 검색 키워드 히스토리 드롭다운 (게스트 / 회원 공통)
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import btnSearch from "./assets/btn_search.png";
import btnSearchHistoryUp from "./assets/btn_search_history_up.png";
import btnSearchHistoryDown from "./assets/btn_search_history_down.png";

import { useProductSearch } from "./hooks/useProductSearch"; // 경로 맞게 조정
import type { ProductSearchHistoryItem } from "@/features/product/types";

export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const searchAdapter = useProductSearch();

  const [keyword, setKeyword] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<ProductSearchHistoryItem[]>([]);

  /**
   * URL keyword → input state 동기화
   */
  useEffect(() => {
    const kw = searchParams.get("keyword") ?? "";
    setKeyword(kw);
  }, [searchParams]);

  /**
   * 드롭다운 열릴 때 검색 기록 로드
   */
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      const list = await searchAdapter.list();
      setHistory(list);
    })();
  }, [isOpen, searchAdapter]);

  const productsHref = (kw: string) => {
    const sp = new URLSearchParams();
    sp.set("keyword", kw);
    return `/products?${sp.toString()}`;
  };

  const onSearch = async () => {
    const kw = keyword.trim();
    if (!kw) return;

    await searchAdapter.create(kw);
    router.push(productsHref(kw));
    setIsOpen(false);
  };

  const onDeleteOne = async (item: ProductSearchHistoryItem) => {
    await searchAdapter.del(item.id ?? item.keyword);
    setHistory(prev => prev.filter(v => (item.id ? v.id !== item.id : v.keyword !== item.keyword)));
  };

  const onClearAll = async () => {
    await searchAdapter.clear();
    setHistory([]);
  };

  return (
    <div className="relative w-[32rem]">
      {/* 검색 입력 */}
      <div className="flex border border-gray-300">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-4 py-3 outline-none"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Enter") onSearch();
          }}
        />

        {/* 히스토리 토글 */}
        <button onClick={() => setIsOpen(prev => !prev)} className="px-3 border-l border-gray-300">
          <Image
            src={isOpen ? btnSearchHistoryUp : btnSearchHistoryDown}
            alt="history"
            width={24}
            height={24}
          />
        </button>

        {/* 검색 */}
        <button onClick={onSearch} className="px-3 border-l border-gray-300">
          <Image src={btnSearch} alt="search" width={24} height={24} />
        </button>
      </div>

      {/* 🔽 검색 기록 드롭다운 */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white border border-gray-300 shadow-md mt-1">
          <div className="flex justify-between items-center px-3 py-2 border-b text-sm">
            <span className="font-semibold">검색 기록</span>
            {history.length > 0 && (
              <button onClick={onClearAll} className="text-red-500 hover:underline">
                전체 삭제
              </button>
            )}
          </div>

          {/* 리스트 */}
          <div className="max-h-[320px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                검색 기록이 없습니다
              </div>
            ) : (
              history.map(item => (
                <div
                  key={item.id ?? item.keyword}
                  className="flex items-center justify-between px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setKeyword(item.keyword);
                    router.push(productsHref(item.keyword));
                    setIsOpen(false);
                  }}
                >
                  <span className="truncate">{item.keyword}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteOne(item);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
