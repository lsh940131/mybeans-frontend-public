"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/utils/client/fetchApi";
import { IUserAddress } from "../../types";
import { UserAddressModal } from "./UserAddressModal";

export default function UserAddress() {
  const [addresses, setAddresses] = useState<IUserAddress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetchApi<IUserAddress[]>("/be/user/address/list", {
        method: "GET",
      });

      setAddresses(res ?? []);
    } catch (err) {
      console.error(err);
      setErrorMsg("배송지 정보를 불러오는 중 오류가 발생했습니다.");
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAddresses();
  }, []);

  const handleManageClick = () => {
    setIsModalOpen(true);
  };

  const primary = addresses[0];

  return (
    <>
      <div className="flex w-full max-w-3xl items-center justify-between rounded-lg bg-white px-8 py-5 shadow-sm">
        {/* 왼쪽 영역 */}
        <div className="flex flex-col gap-1">
          {/* =================== 1) 로딩 상태 =================== */}
          {loading && (
            <div className="text-sm text-gray-500">배송지 정보를 불러오는 중입니다...</div>
          )}

          {/* =================== 2) 에러 =================== */}
          {!loading && errorMsg && <div className="text-sm text-red-500">{errorMsg}</div>}

          {/* =================== 3) 배송지 없음 =================== */}
          {!loading && !errorMsg && addresses.length === 0 && (
            <div className="text-sm text-gray-500">등록된 배송지가 없습니다.</div>
          )}

          {/* =================== 4) 배송지 있음 =================== */}
          {!loading && !errorMsg && addresses.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <div className="text-lg font-semibold text-gray-900">{primary.name}</div>
                {primary.isDefault && (
                  <span className="rounded-full bg-gray-900 px-2 py-0.5 text-xs font-medium text-white">
                    기본배송지
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-800">
                {primary.receiverName} · {primary.phone}
              </div>

              <div className="text-sm text-gray-600">
                {primary.address} {primary.addressDetail ?? ""}{" "}
                {primary.postcode ? `(${primary.postcode})` : ""}
              </div>
            </>
          )}
        </div>

        {/* 오른쪽: 관리 버튼 */}
        <div>
          <button
            type="button"
            onClick={handleManageClick}
            className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            관리
          </button>
        </div>
      </div>

      {isModalOpen && (
        <UserAddressModal
          addresses={addresses}
          onClose={() => setIsModalOpen(false)}
          fetchAddresses={fetchAddresses}
        />
      )}
    </>
  );
}
