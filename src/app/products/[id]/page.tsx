import { use } from "react";
import TabNav from "./components/TabNav";
import type { RawSP } from "@/utils/shared/url";
import { getProductOr404 } from "./lib/getProduct";
import DetailImages from "./components/DetailImages";
import WatchHistoryRecorder from "@/app/components/Header/components/WatchHistory/components/WatchHistoryRecorder";

export const dynamic = "force-dynamic";

export default function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawSP>;
}) {
  const [{ id }, sp] = use(Promise.all([params, searchParams]));

  const product = use(getProductOr404(id));

  return (
    <>
      <WatchHistoryRecorder
        product={{
          productId: product.id,
          nameKr: product.nameKr,
          nameEn: product.nameEn,
          thumbnailUrl: product.thumbnailUrl,
          viewedAt: Date.now(),
        }}
      />

      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <TabNav productId={Number(id)} active="detail" searchParams={sp} />
      </div>

      <div id="tab" className="h-0 scroll-mt-14" />

      <section className="mt-4">
        <DetailImages images={product.imageList ?? []} />
      </section>
    </>
  );
}
