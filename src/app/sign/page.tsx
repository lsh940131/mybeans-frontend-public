import { Suspense } from "react";

import Sign from "./components/Sign";

export default function SignPage() {
  return (
    <div className="w-full flex flex-col items-center">
      <Suspense fallback={<div>로딩 중...</div>}>
        <Sign />
      </Suspense>
    </div>
  );
}
