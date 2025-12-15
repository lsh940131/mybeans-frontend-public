import OrderSuccessClient from "./components/OrderSuccessClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    paymentType?: string;
  }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const checkoutId = Number(id);
  const paymentKey = sp.paymentKey ?? "";
  const tossOrderId = sp.orderId ?? "";
  const amount = Number(sp.amount ?? 0);

  return (
    <OrderSuccessClient
      checkoutId={checkoutId}
      paymentKey={paymentKey}
      tossOrderId={tossOrderId}
      amount={amount}
    />
  );
}
