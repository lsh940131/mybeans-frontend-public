"use client";

import Link from "next/link";

const CATEGORY = {
  COFFEE: [1, 2, 3, 4, 5, 6, 7],
  GOODS: [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  SYRUP_SAUCE: [12, 13],
  DESSERT: [8, 9, 10, 11],
};

function productsHref(params: { categoryIdList?: number[] }) {
  const sp = new URLSearchParams();
  if (params.categoryIdList?.length) sp.set("categoryIdList", params.categoryIdList.join(","));
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}

export default function SubHeader() {
  return (
    <nav className="w-full mt-3 flex justify-center">
      <ul className="w-1/2 flex justify-between">
        <li>
          <Link
            href={productsHref({ categoryIdList: CATEGORY.COFFEE })}
            className="no-underline hover:underline underline-offset-4"
          >
            커피
          </Link>
        </li>
        <li>
          <Link
            href={productsHref({ categoryIdList: CATEGORY.GOODS })}
            className="no-underline hover:underline underline-offset-4"
          >
            커피용품
          </Link>
        </li>
        <li>
          <Link
            href={productsHref({ categoryIdList: CATEGORY.SYRUP_SAUCE })}
            className="no-underline hover:underline underline-offset-4"
          >
            시럽/소스
          </Link>
        </li>
        <li>
          <Link
            href={productsHref({ categoryIdList: CATEGORY.DESSERT })}
            className="no-underline hover:underline underline-offset-4"
          >
            디저트
          </Link>
        </li>
      </ul>
    </nav>
  );
}
