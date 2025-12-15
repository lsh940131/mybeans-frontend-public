import OrderFailClient from "./components/OrderFailClient";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    message?: string;
  }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  // 규칙상 한 번은 await 해줘야 함 (id는 안 써도 괜찮)
  await params;
  const sp = await searchParams;

  const message = sp.message ?? "결제가 취소되었거나 실패했습니다.\n이전 페이지로 이동합니다.";

  return <OrderFailClient message={message} />;
}
