"use client";

import { useEffect } from "react";
import { useCart } from "../../hooks/useCart";
import { UICartQuote } from "../../types";
import CartView from "./CartView";

export default function CartScreen({ initialData }: { initialData: UICartQuote | null }) {
  const { data, loading, update, remove, hydrate } = useCart();

  useEffect(() => {
    if (initialData) hydrate(initialData);
  }, [initialData, hydrate]);

  return (
    <CartView
      data={data ?? initialData ?? null}
      loading={loading && !initialData}
      onUpdateQty={(key, qty) => update({ key, qty })}
      onRemoveKeys={keys => remove({ keys })}
    />
  );
}
