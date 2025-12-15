import { fetchApi } from "@/utils/server/fetchApi";
import Category from "./components/Selector/Category";
import Seller from "./components/Selector/Seller";
import CoffeeFilters from "./components/Selector/SubSelector/CoffeeFilters";
import Header from "../components/Header";
import { Suspense } from "react";

type CategoryNode = {
  id: number;
  nameKr: string;
  nameEn: string;
  children: CategoryNode[];
};

type Seller = {
  id: number;
  name: string;
};

export default async function ProductsLayout({ children }: { children: React.ReactNode }) {
  const [categoryTree, sellers] = await Promise.all([loadCategoryTree(), loadSellers()]);

  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="mx-auto max-w-7xl p-6">
        {/* 필터 */}
        <section className="">
          {/* 상위 필터 */}
          <div className="flex flex-wrap items-center gap-2">
            <Category tree={categoryTree} />
            <Seller sellers={sellers} />
          </div>

          {/* 하위 필터 */}
          <div className="mt-2 space-y-2">
            <div>
              <CoffeeFilters categoryTree={categoryTree} coffeeRootId={1} />
            </div>
          </div>
        </section>

        <div>{children}</div>
      </main>
    </>
  );
}

async function loadCategoryTree(): Promise<CategoryNode[]> {
  return fetchApi<CategoryNode[]>("/be/category/tree");
}

async function loadSellers(): Promise<Seller[]> {
  const { list } = await fetchApi<{ list: Seller[]; count: number }>(
    "/be/seller/list?offset=0&length=50"
  );
  return list;
}
