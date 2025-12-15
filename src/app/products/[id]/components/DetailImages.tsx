"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useNaturalImageSize } from "@/hooks/useNaturalImageSize";

type ProductImage = { id: number; url: string };

export default function DetailImages({ images }: { images: ProductImage[] }) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!images?.length) {
    return (
      <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-neutral-500">
        등록된 상세 이미지가 없습니다.
      </div>
    );
  }

  return (
    <>
      {/* 가운데 정렬 컨테이너 + 이미지 가로 100% / 세로 비율 유지 */}
      <div className="mx-auto max-w-3xl space-y-6">
        {images.map(img => (
          <figure key={img.id} className="rounded-xl overflow-hidden bg-white">
            <MeasuredImage url={img.url} />
          </figure>
        ))}
      </div>

      {/* TOP 버튼 */}
      {showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 rounded-full bg-black text-white shadow-lg px-4 py-3
                     hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-black"
          aria-label="맨 위로"
        >
          TOP
        </button>
      )}
    </>
  );
}

/** 이미지 원본 크기를 한 번 측정해서 NextImage로 렌더 */
function MeasuredImage({ url, alt = "" }: { url: string; alt?: string }) {
  const { size } = useNaturalImageSize(url);

  // 사이즈 측정 전: 플레이스홀더
  if (!size) {
    return <div className="w-full aspect-[4/3] bg-gray-100 rounded-xl animate-pulse" />;
  }

  // 사이즈 확보 후: next/image 최적화 렌더
  return (
    <Image
      src={url}
      alt={alt}
      width={size.w}
      height={size.h}
      className="w-full h-auto block mx-auto rounded-xl"
      sizes="(min-width: 768px) 768px, 100vw"
      // 필요 시 placeholder="blur" blurDataURL="..." 추가
    />
  );
}
