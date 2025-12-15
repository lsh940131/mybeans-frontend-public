import { fetchApi } from "@/utils/server/fetchApi";
import { OrderCheckoutData, IQuoteResponse } from "../types";
import OrderPageClient from "./components/OrderPageClient";

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    expiredAt?: string;
    redirectTo?: string;
  }>;
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { id } = await params;
  const checkoutId = Number(id);

  const sp = searchParams ? await searchParams : {};
  const expiredAt = sp.expiredAt ?? null;

  let quote: IQuoteResponse = {
    subtotalMerchandise: 0,
    subtotalShippingFee: 0,
    list: [],
  };

  try {
    quote = await fetchApi<IQuoteResponse>(`/be/order/checkout?id=${checkoutId}`, {
      method: "GET",
    });
  } catch {}

  const data: OrderCheckoutData = {
    checkoutId,
    expiredAt,
    quote,
  };

  return <OrderPageClient data={data} />;
}
