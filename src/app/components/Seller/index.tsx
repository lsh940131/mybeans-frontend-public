"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchApi } from "@/utils/client/fetchApi";

type Seller = {
  id: number;
  name: string;
  image: string;
};

const productsHrefBySeller = (id: number) => {
  const sp = new URLSearchParams();
  sp.set("sellerIdList", String(id));
  sp.set("page", "1");
  return `/products?${sp.toString()}`;
};

export default function Seller() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { list = [] } = await fetchApi<{ list: Seller[]; count: number }>(
          "/be/seller/list?offset=0&length=6"
        );
        setSellers(list);
      } catch (e) {
        console.error("fetch seller error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="w-full py-10">
      <h3 className="sr-only">파트너 브랜드</h3>

      <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 place-items-center gap-y-8 md:gap-y-10 md:gap-x-16">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="w-[140px] h-[48px] sm:w-[160px] sm:h-[56px] md:w-[180px] md:h-[64px] lg:w-[220px] lg:h-[80px] bg-gray-200 rounded animate-pulse"
            />
          ))}

        {!loading && sellers.length === 0 && (
          <p className="text-sm text-neutral-500">등록된 브랜드가 없습니다.</p>
        )}

        {!loading &&
          sellers.map(v => (
            <Link
              key={v.id}
              href={productsHrefBySeller(v.id)}
              className="relative w-[140px] h-[48px] sm:w-[160px] sm:h-[56px] md:w-[180px] md:h-[64px] lg:w-[220px] lg:h-[80px] group"
              aria-label={`${v.name} 상품 보러가기`}
              title={v.name}
            >
              <Image
                src={v.image}
                alt={v.name}
                fill
                className="object-contain transition-opacity group-hover:opacity-90"
                sizes="(min-width:1024px) 220px, (min-width:768px) 180px, (min-width:640px) 160px, 140px"
                loading="lazy"
              />
            </Link>
          ))}
      </div>
    </section>
  );
}
