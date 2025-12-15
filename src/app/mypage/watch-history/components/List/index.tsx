"use client";

import { useRouter } from "next/navigation";
import type { PwhListItemPayload } from "@/features/watchHistory/types";

interface WatchHistoryListProps {
  items: PwhListItemPayload[];
  loading: boolean;
  errorMsg: string | null;
  onDeleteItem: (productId: number) => void;
}

function formatViewedAt(createdAt: Date | string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WatchHistoryList({
  items,
  loading,
  errorMsg,
  onDeleteItem,
}: WatchHistoryListProps) {
  const router = useRouter();

  if (loading) {
    return <div className="py-6 text-sm text-gray-500">최근 본 상품을 불러오는 중입니다...</div>;
  }

  if (errorMsg) {
    return <div className="py-6 text-sm text-red-500">{errorMsg}</div>;
  }

  if (!items.length) {
    return <div className="py-6 text-sm text-gray-500">최근 본 상품이 없습니다.</div>;
  }

  return (
    <ul className="space-y-3">
      {items.map(item => {
        const { product } = item;
        const viewedAtLabel = formatViewedAt(item.createdAt);

        const handleClickItem = () => {
          router.push(`/products/${product.id}`);
        };

        const handleDelete = (e: React.MouseEvent) => {
          e.stopPropagation();
          onDeleteItem(product.id);
        };

        return (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
          >
            {/* 왼쪽: 썸네일 + 텍스트 (클릭 시 상품 상세로 이동) */}
            <button
              type="button"
              onClick={handleClickItem}
              className="flex flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/60"
            >
              <div className="h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center">
                {product.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.thumbnailUrl}
                    alt={product.nameKr || product.nameEn || "상품 이미지"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-gray-400">이미지 없음</span>
                )}
              </div>

              <div className="flex flex-col">
                <span className="line-clamp-2 text-sm font-medium text-gray-900">
                  {product.nameKr}
                </span>
                {product.nameEn && <span className="text-xs text-gray-500">{product.nameEn}</span>}
                {viewedAtLabel && (
                  <span className="mt-0.5 text-[11px] text-gray-400">{viewedAtLabel}에 구경함</span>
                )}
              </div>
            </button>

            {/* 오른쪽: 삭제 버튼 */}
            <button
              type="button"
              onClick={handleDelete}
              className="ml-3 rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
            >
              삭제
            </button>
          </li>
        );
      })}
    </ul>
  );
}
