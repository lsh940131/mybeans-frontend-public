import Link from "next/link";
import { type RawSP, pickParams } from "@/utils/shared/url";
import { PRODUCT_RETAIN_KEYS } from "@/utils/shared/constants";

export default async function TabNav({
  productId,
  active,
  searchParams,
}: {
  productId: number;
  active: "detail" | "recipe" | "review";
  searchParams: RawSP | Promise<RawSP>;
}) {
  const sp = await searchParams;
  const qs = pickParams(sp, PRODUCT_RETAIN_KEYS).toString();
  const suffix = qs ? `?${qs}` : "";

  const withPage1 = (base: string) => (suffix ? `${base}${suffix}&page=1` : `${base}?page=1`);

  const hash = "#tab";

  const tabs = [
    { key: "detail", label: "상세", href: `/products/${productId}${suffix}${hash}` },
    { key: "recipe", label: "레시피", href: `/products/${productId}/recipe${suffix}${hash}` },
    { key: "review", label: "리뷰", href: `${withPage1(`/products/${productId}/review`)}${hash}` },
  ] as const;

  return (
    <nav className="mt-10" aria-label="상품 상세 탭" role="tablist">
      <div className="grid grid-cols-3 border-b border-neutral-200">
        {tabs.map(t => {
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              role="tab"
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              className={[
                "relative flex items-center justify-center",
                "h-10 sm:h-11 px-3",
                "text-sm sm:text-base",
                "transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300",
                isActive
                  ? "text-black font-medium"
                  : "text-neutral-500 hover:text-black hover:bg-neutral-50",
              ].join(" ")}
            >
              {t.label}
              {/* 하단 인디케이터 (활성일 때만) */}
              {isActive && (
                <span className="pointer-events-none absolute inset-x-3 -bottom-[1px] h-[2px] bg-black rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
