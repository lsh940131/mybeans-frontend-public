import { Suspense } from "react";
import Header from "../components/Header";
import MyPageSidebar from "./components/Sidebar";

export default async function MypageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <div className="min-h-screen bg-neutral-100">
        <main className="mx-auto w-4/5 max-w-5xl py-8">
          <div className="flex gap-6">
            <MyPageSidebar />
            <section className="flex-1">{children}</section>
          </div>
        </main>
      </div>
    </>
  );
}
