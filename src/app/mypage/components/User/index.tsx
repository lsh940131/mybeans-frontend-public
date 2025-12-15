"use client";

import { runSignoutScenario } from "@/app/sign/components/SignoutScenario";
import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/utils/client/fetchApi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IUser } from "../../types";
import { UserUpdateModal } from "./UpdateModal";

export default function MypageUser() {
  const { loading, isAuthed } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<IUser>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthed) {
      const redirectTo = "/mypage";
      router.push(`/sign?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    const fetchUser = async () => {
      const res = await fetchApi<IUser>("/be/user", { method: "GET" });
      setUser(res);
    };

    void fetchUser();
  }, [isAuthed, loading, router]);

  if (!user) {
    return <div>사용자 정보를 불러오지 못했습니다.</div>;
  }

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleSignout = async () => {
    const ok = await runSignoutScenario();
    if (ok) router.push("/");
  };

  const displayName = user?.name ? `${user.name}님` : "로그인한 사용자";

  return (
    <>
      <div className="flex items-center justify-between w-full max-w-3xl bg-white rounded-lg px-7 py-4 shadow-sm">
        {/* 왼쪽: 프로필 이미지 + 이름 */}
        <div className="flex items-center gap-4">
          {/* 프로필 이미지 (없으면 기본 원형 아이콘) */}
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt="사용자 프로필 이미지"
              className="w-11 h-11 rounded-full object-cover bg-gray-100"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
              {/* simple placeholder 아이콘 */}
              <span>👤</span>
            </div>
          )}

          <div className="text-lg font-medium text-gray-900">{displayName}</div>
        </div>

        {/* 오른쪽: 설정 / 로그아웃 버튼 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSettings}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full bg-white text-gray-700 hover:bg-gray-50"
          >
            설정
          </button>
          <button
            type="button"
            onClick={handleSignout}
            className="px-3 py-1 text-sm border border-gray-300 rounded-full bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            로그아웃
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <UserUpdateModal
          user={user}
          onClose={() => setIsSettingsOpen(false)}
          onUpdated={nextUser => setUser(nextUser)}
        />
      )}
    </>
  );
}
