import Link from "next/link";
import Image from "next/image";
import { spToQS, type RawSP } from "@/utils/shared/url";
import { formatKRW } from "@/utils/shared";

type ProductItem = {
  id: number;
  nameKr: string;
  nameEn: string;
  thumbnailUrl: string;
  price: number;
  seller: { id: number; name: string };
};

export default function Grid({
  products,
  searchParams,
}: {
  products: ProductItem[];
  searchParams: RawSP;
}) {
  if (!products?.length) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-10 text-center text-neutral-500">
        조건에 맞는 상품이 없습니다.
      </div>
    );
  }

  // 현재 필터 쿼리 → 문자열로 캐싱
  const forwardQs = spToQS(searchParams).toString();
  const toHref = (id: number) => (forwardQs ? `/products/${id}?${forwardQs}` : `/products/${id}`);

  return (
    <section className="mt-6">
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {products.map(v => (
          <li key={v.id}>
            <Link
              href={toHref(v.id)}
              className="group block rounded-xl border overflow-hidden hover:shadow-md transition-shadow bg-white"
            >
              {/* 썸네일 1:1 비율 */}
              <div className="relative aspect-square bg-neutral-50">
                <Image
                  src={v.thumbnailUrl}
                  alt={v.nameKr || v.nameEn || "상품 이미지"}
                  fill
                  sizes="(max-width: 640px) 50vw,
                         (max-width: 1024px) 33vw,
                         (max-width: 1280px) 25vw,
                         20vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  priority={false}
                />
              </div>
              <div className="p-3">
                <h3 className="text-sm font-medium line-clamp-1">
                  {v.nameKr}
                  {v.nameEn ? (
                    <span className="ml-1 text-neutral-400 font-normal">({v.nameEn})</span>
                  ) : null}
                </h3>
                <p className="mt-1 text-xs text-neutral-500 line-clamp-1">{v.seller?.name}</p>
                <p className="mt-2 text-base font-semibold">{formatKRW(v.price)}</p>
              </div>
              {/* 정보 */}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
