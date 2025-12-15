import WatchHistoryPageClient from "./components/WatchHistoryPageClient";

export const dynamic = "force-dynamic";

export default function WatchHistoryPage() {
  // 데이터 페칭/상태 관리는 전부 클라이언트 쪽에서
  return (
    <main className="mx-auto max-w-5xl px-4 pb-6">
      <WatchHistoryPageClient />
    </main>
  );
}
