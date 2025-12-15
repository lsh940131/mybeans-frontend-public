import Header from "@/app/components/Header";
import { Suspense } from "react";

export default async function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <div>{children}</div>
    </>
  );
}
