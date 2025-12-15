import { getCookie } from "@/utils/server/cookie";
import { COOKIE_AT_KEY } from "@/utils/shared/constants";
import { redirect } from "next/navigation";
import MypageUser from "./components/User";
import UserAddress from "./components/UserAddress";
import MypageOrder from "./components/Order";
import MypageWatchHistory from "./components/WatchHistory";

export default async function MyPage() {
  const accessToken = await getCookie(COOKIE_AT_KEY);
  if (!accessToken) {
    redirect("/sign?redirectTo=/mypage");
  }

  return (
    <div>
      <MypageUser />
      <div className="mt-4">
        <UserAddress />
      </div>
      <div className="mt-4">
        <MypageOrder />
      </div>

      <div className="mt-4">
        <MypageWatchHistory />
      </div>
    </div>
  );
}
