"use client";

interface SearchBoxProps {
  keyword: string;
  onChangeKeyword: (value: string) => void;
  totalCount: number;
  onClearAll?: () => void;
}

export default function SearchBox({
  keyword,
  onChangeKeyword,
  totalCount,
  onClearAll,
}: SearchBoxProps) {
  return (
    <div className="mb-4">
      {/* 상단 헤더 */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">최근 본 상품</h1>
          <p className="mt-0.5 text-xs text-gray-500">최대 50개의 상품이 저장됩니다.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-900">{totalCount.toLocaleString()}</span> 개
          </span>
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {/* 검색 인풋 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={keyword}
          onChange={e => onChangeKeyword(e.target.value)}
          placeholder="상품명으로 검색"
          className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:outline-none"
        />
      </div>
    </div>
  );
}
