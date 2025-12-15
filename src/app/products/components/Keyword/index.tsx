"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import btnSearch from "../../assets/btn_search.png";
import btnSearchHistoryUp from "../../assets/btn_search_history_up.png";
import btnSearchHistoryDown from "../../assets/btn_search_history_down.png";

export default function Keyword({ initialKeyword = "" }: { initialKeyword?: string }) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [isSearchHistoryOpen, setIsHistoryOpen] = useState(false);
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => setKeyword(keyword), [keyword]);

  const search = () => {
    const next = new URLSearchParams(sp.toString());

    if (keyword.trim()) next.set("keyword", keyword.trim());
    else next.delete("keyword");

    router.push(`/products?${next.toString()}`);
  };

  return (
    <div className="relative w-[32rem] flex border border-gray-300">
      <input
        type="text"
        placeholder="Search..."
        className="w-full px-4 py-3 outline-none"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") search();
        }}
      />

      {/* 검색어 히스토리 버튼 */}
      {/* TODO: 히스토리 박스 내려오기 & 히스토리 보여주기 (토큰 있으면 api, 없으면 sessionStorage) */}
      <button
        onClick={() => setIsHistoryOpen(prev => !prev)}
        className="px-3 flex items-center justify-center border-l border-gray-300"
      >
        <Image
          src={isSearchHistoryOpen ? btnSearchHistoryUp : btnSearchHistoryDown}
          alt="search history"
          width={24}
          height={24}
          className="w-6 h-6"
        />
      </button>

      {/* 검색 실행 버튼 */}
      {/* TODO: 엔터 시 검색 & 히스토리 저장(api 토큰 없어도 캐시값orIP로 & sessionStorage) */}
      <button className="px-3 flex items-center justify-center border-l border-gray-300">
        <Image
          src={btnSearch}
          alt="search"
          width={24}
          height={24}
          className="w-6 h-6"
          onClick={search}
        />
      </button>
    </div>
  );
}
