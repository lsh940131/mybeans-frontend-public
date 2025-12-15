import Image from "next/image";
import BuyBox from "./components/BuyBox";
import { ProductDetail } from "../types";
import { getProductOr404 } from "./lib/getProduct";

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductOr404(id);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <Hero product={product} />

      {/* 탭 네비게이션은 children 쪽에서 active 키를 주입하도록 slot 구성 */}
      {/* 기본 탭 바는 항상 표시 */}
      <div className="mt-2">
        {/* children 내 각 탭 page에서 <TabNav ... active="detail"/> 같은 형태로 렌더하도록 인터페이스 통일 */}
      </div>

      {/* 하단 탭 컨텐츠 */}
      <div className="mt-4">{children}</div>
    </main>
  );
}

function Hero({ product }: { product: ProductDetail }) {
  return (
    <section>
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-0">
          {/* 왼쪽: 썸네일 (카드 내부, 패딩만) */}
          <div className="p-4 md:p-6">
            <div className="relative h-full min-h-[360px]">
              <Image
                src={product.thumbnailUrl}
                alt={product.nameKr || product.nameEn || "상품 이미지"}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </div>

          {/* 오른쪽: 정보 + BuyBox (카드 내부, 패딩만) */}
          <div className="p-4 md:p-6 flex flex-col">
            <h1 className="text-2xl font-semibold">
              {product.nameKr}
              {product.nameEn ? (
                <span className="ml-2 text-base font-normal text-neutral-400">
                  ({product.nameEn})
                </span>
              ) : null}
            </h1>

            <div className="mt-2 text-sm text-neutral-500">
              <span>{product.seller?.name}</span>
              <span className="mx-2">·</span>
              <span>{product.category?.nameKr}</span>
            </div>

            {/* BuyBox는 외부 카드가 있으므로 asCard=false, 높이 자연스레 채우도록 */}
            <div className="mt-6">
              <BuyBox
                asCard={false}
                className="h-full"
                productId={product.id}
                options={product.optionList}
                basePrice={product.price}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
