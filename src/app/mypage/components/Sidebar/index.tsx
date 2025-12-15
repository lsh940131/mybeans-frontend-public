"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MyPageSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="w-56 flex-shrink-0 bg-white rounded-lg pb-1">
      <nav className="space-y-1 text-base">
        {/* 📌 마이페이지 홈 */}
        <Link
          href="/mypage"
          className={`block rounded-lg px-3 py-2 font-semibold ${
            isActive("/mypage") ? "bg-black text-white" : "text-neutral-800 hover:bg-neutral-100"
          }`}
        >
          마이페이지 홈
        </Link>

        {/* 📌 주문/배송 내역 */}
        <Link
          href="/mypage/orders"
          className={`block rounded-lg px-3 py-2 ${
            isActive("/mypage/orders")
              ? "bg-black text-white"
              : "text-neutral-800 hover:bg-neutral-100"
          }`}
        >
          주문/배송내역
        </Link>

        {/* 📌 최근 본 상품 */}
        <Link
          href="/mypage/watch-history"
          className={`block rounded-lg px-3 py-2 ${
            isActive("/mypage/watch-history")
              ? "bg-black text-white"
              : "text-neutral-800 hover:bg-neutral-100"
          }`}
        >
          최근 본 상품
        </Link>

        {/* 📌 리뷰 작성 섹션 */}
        <div className="rounded-lg px-3 py-3 text-neutral-800">
          리뷰 작성
          <div className="mt-2 space-y-2 text-base font-normal">
            <Link
              href="/mypage/reviews/writable"
              className={`block rounded-md px-2 py-2 ${
                isActive("/mypage/reviews/writable")
                  ? "bg-black text-white"
                  : "text-neutral-800 hover:bg-neutral-200/70"
              }`}
            >
              작성 가능한 리뷰
            </Link>
            <Link
              href="/mypage/reviews/mine"
              className={`block rounded-md px-2 py-2 ${
                isActive("/mypage/reviews/mine")
                  ? "bg-black text-white"
                  : "text-neutral-800 hover:bg-neutral-200/70"
              }`}
            >
              내가 작성한 리뷰
            </Link>
          </div>
        </div>

        {/* 📌 상품 Q&A */}
        <Link
          href="/mypage/qna"
          className={`block rounded-lg px-3 py-2 ${
            isActive("/mypage/qna")
              ? "bg-black text-white"
              : "text-neutral-800 hover:bg-neutral-100"
          }`}
        >
          상품 Q&A
        </Link>
      </nav>
    </aside>
  );
}
