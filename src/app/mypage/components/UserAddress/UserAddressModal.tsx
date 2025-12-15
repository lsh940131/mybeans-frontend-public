"use client";

/**
 * 사용자 배송지 관리 모달
 */
import { useEffect, useState } from "react";
import { IUserAddress } from "../../types";
import { fetchApi } from "@/utils/client/fetchApi";

// 카카오 주소 검색 위젯 응답 타입
interface DaumPostcodeData {
  zonecode: string;
  address: string;
  addressType: "R" | "J";
  roadAddress: string;
  jibunAddress: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: { oncomplete: (data: DaumPostcodeData) => void }) => {
        embed: (element: HTMLElement) => void;
      };
    };
  }
}

type ModalStep = "list" | "search" | "create";

// 신규/수정 폼용 타입
type NewAddressForm = {
  name: string;
  receiverName: string;
  phone: string;
  address: string;
  addressDetail: string;
  postcode: string;
  isDefault: boolean;
};

const EMPTY_NEW_ADDRESS: NewAddressForm = {
  name: "",
  receiverName: "",
  phone: "",
  address: "",
  addressDetail: "",
  postcode: "",
  isDefault: false,
};

interface UserAddressModalProps {
  addresses: IUserAddress[];
  onClose: () => void;
  fetchAddresses: () => Promise<void> | void;
}

export function UserAddressModal({ addresses, onClose, fetchAddresses }: UserAddressModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>("list");

  const [createForm, setCreateForm] = useState<NewAddressForm>(EMPTY_NEW_ADDRESS);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 수정 모드 여부 (null 이면 신규, 숫자면 해당 id 수정)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const isEditMode = editingAddressId !== null;
  const createTitle = isEditMode ? "배송지 수정" : "배송지 신규입력";
  const saveButtonLabel = isEditMode ? "수정하기" : "저장하기";

  /**
   * ESC 키 입력 시 모달 닫기
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  /**
   * 오버레이 클릭 시 모달 닫기
   */
  const handleOverlayClick = () => {
    onClose();
  };

  /**
   * 신규 입력 시작
   * - 폼 초기화 후 주소 검색 단계 진입
   */
  const handleNewAddressClick = () => {
    setCreateError(null);
    setCreateForm(EMPTY_NEW_ADDRESS);
    setEditingAddressId(null);
    setModalStep("search");
  };

  /**
   * createForm 개별 필드 변경
   */
  const handleChangeCreateField = <K extends keyof NewAddressForm>(
    field: K,
    value: NewAddressForm[K]
  ) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * 신규/수정 배송지 저장
   * - 신규: POST /be/user/address
   * - 수정: PUT /be/user/address
   * - 성공 시 부모에 리스트 재조회 요청, list 단계로 복귀
   */
  const handleSaveAddress = async () => {
    setCreateError(null);

    // 간단한 필수값 검증
    if (!createForm.receiverName.trim() || !createForm.phone.trim() || !createForm.address.trim()) {
      setCreateError("받는이, 연락처, 주소는 필수입니다.");
      return;
    }

    const basePayload = {
      // 이름은 입력이 없으면 받는이 이름으로 대체
      name: createForm.name.trim() || createForm.receiverName.trim(),
      receiverName: createForm.receiverName.trim(),
      phone: createForm.phone.trim(),
      address: createForm.address.trim(),
      addressDetail: createForm.addressDetail.trim() || undefined,
      postcode: createForm.postcode.trim() || undefined,
      isDefault: createForm.isDefault,
    };

    try {
      setIsLoading(true);

      if (isEditMode) {
        // 수정
        await fetchApi("/be/user/address", {
          method: "PUT",
          body: {
            id: editingAddressId,
            ...basePayload,
          },
        });
      } else {
        // 신규
        await fetchApi("/be/user/address", {
          method: "POST",
          body: basePayload,
        });
      }

      // 저장 성공 후: 부모 주소 리스트 재조회
      await fetchAddresses();

      // 폼 초기화 및 단계 리셋
      setCreateForm(EMPTY_NEW_ADDRESS);
      setCreateError(null);
      setEditingAddressId(null);
      setModalStep("list");
    } catch (e) {
      console.error("[UserAddressModal] 배송지 저장 실패:", e);
      setCreateError(
        isEditMode
          ? "배송지를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "배송지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 카카오(다음) 주소 검색 위젯 embed
   * - modalStep === "search" 일 때만 실행
   */
  useEffect(() => {
    if (modalStep !== "search") return;
    if (!window.daum?.Postcode) {
      console.error("[UserAddressModal] Kakao Postcode script is not loaded.");
      return;
    }

    const container = document.getElementById("mypage-postcode-container");
    if (!container) return;

    const postcode = new window.daum.Postcode({
      oncomplete: (data: DaumPostcodeData) => {
        const baseAddress =
          data.addressType === "R"
            ? data.roadAddress || data.address
            : data.jibunAddress || data.address;

        setCreateForm(prev => ({
          ...prev,
          address: baseAddress,
          postcode: data.zonecode,
        }));

        setModalStep("create");
      },
    });

    postcode.embed(container);
  }, [modalStep]);

  const handleEditClick = (addr: IUserAddress) => {
    setCreateError(null);
    setEditingAddressId(addr.id);
    setCreateForm({
      name: addr.name ?? "",
      receiverName: addr.receiverName ?? "",
      phone: addr.phone ?? "",
      address: addr.address ?? "",
      addressDetail: addr.addressDetail ?? "",
      postcode: addr.postcode ?? "",
      isDefault: addr.isDefault ?? false,
    });
    setModalStep("create");
  };

  const handleDeleteClick = async (addr: IUserAddress) => {
    const ok = window.confirm(`'${addr.name}' 배송지를 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      setIsLoading(true);
      await fetchApi(`/be/user/address?id=${addr.id}`, {
        method: "DELETE",
      });

      await fetchAddresses();
    } catch (e) {
      console.error("[ShippingSection] 배송지 삭제 실패:", e);
      alert("배송지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  /**
   * 기본 배송지로 설정
   * - PUT /be/user/address { id, isDefault: true }
   */
  const handleSetDefaultClick = async (addr: IUserAddress) => {
    try {
      setIsLoading(true);
      await fetchApi("/be/user/address", {
        method: "PUT",
        body: {
          id: addr.id,
          isDefault: true,
        },
      });

      await fetchAddresses();
    } catch (e) {
      console.error("[UserAddressModal] 기본 배송지 설정 실패:", e);
      alert("기본 배송지로 설정하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const createFormAddressDisplay =
    createForm.address && createForm.postcode
      ? `${createForm.address} (${createForm.postcode})`
      : createForm.address;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleOverlayClick}
    >
      <div
        className="relative z-10 flex max-h-[90vh] w-[540px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-xl font-semibold text-gray-900">
            {modalStep === "list"
              ? "배송지 목록"
              : modalStep === "search"
              ? "주소 검색"
              : createTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
        </div>

        {/* ================= 리스트 단계 ================= */}
        {modalStep === "list" && (
          <>
            {/* 신규 입력 버튼 */}
            <div className="border-b px-4 py-2.5">
              <button
                type="button"
                onClick={handleNewAddressClick}
                className="flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                + 배송지 신규입력
              </button>
            </div>

            {/* 주소 리스트 */}
            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-3">
              {addresses.map(addr => {
                const fullAddress = `${addr.address} ${addr.addressDetail || ""}`.trim();
                const addressLine = fullAddress
                  ? `${fullAddress} (${addr.postcode})`
                  : `(${addr.postcode})`;

                return (
                  <div
                    key={addr.id}
                    className="flex items-start justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3"
                  >
                    {/* 왼쪽: 배송지 정보 */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold text-gray-900">{addr.name}</span>
                        {addr.isDefault && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                            기본배송지
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-medium text-gray-800">{`${addr.receiverName} · ${addr.phone}`}</div>
                      <div className="text-sm font-medium text-gray-600">{addressLine}</div>

                      <div className="mt-2 flex gap-3 text-sm">
                        <button
                          type="button"
                          onClick={() => handleEditClick(addr)}
                          className="text-gray-700 hover:underline"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(addr)}
                          className="text-red-500 hover:underline"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {/* 오른쪽: 기본 배송지 상태/설정 버튼 */}
                    <div className="ml-3 mt-1">
                      {addr.isDefault ? (
                        <></>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultClick(addr)}
                          className="rounded-md border border-gray-300 px-3 py-1 text-[11px] text-gray-700 hover:bg-gray-100"
                          disabled={isLoading}
                        >
                          기본 배송지로 설정
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ================= 주소 검색 단계 ================= */}
        {modalStep === "search" && (
          <div className="flex flex-1 flex-col items-center px-4 py-4">
            <div
              id="mypage-postcode-container"
              className="h-[444px] w-[500px] overflow-hidden rounded-md border border-neutral-200"
            />
            <div className="mt-3 flex w-full max-w-[500px] justify-end">
              <button
                type="button"
                className="h-9 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
                onClick={() => {
                  setModalStep("list");
                  setCreateError(null);
                  setCreateForm(EMPTY_NEW_ADDRESS);
                  setEditingAddressId(null);
                }}
              >
                목록으로
              </button>
            </div>
          </div>
        )}

        {/* ================= 신규/수정 입력 단계 ================= */}
        {modalStep === "create" && (
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4 text-sm">
            <div className="space-y-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-neutral-700">
                  배송지 이름 <span className="text-xs text-neutral-400">(선택)</span>
                </label>
                <input
                  type="text"
                  className="h-9 rounded-md border px-2.5 text-sm outline-none focus:border-black"
                  value={createForm.name}
                  onChange={e => handleChangeCreateField("name", e.target.value)}
                  placeholder="예: 우리집, 회사, 부모님댁"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-700">받는 이 *</label>
                <input
                  type="text"
                  className="h-9 rounded-md border px-2.5 text-sm outline-none focus:border-black"
                  value={createForm.receiverName}
                  onChange={e => handleChangeCreateField("receiverName", e.target.value)}
                  placeholder="수령인 이름"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-700">연락처 *</label>
                <input
                  type="tel"
                  className="h-9 rounded-md border px-2.5 text-sm outline-none focus:border-black"
                  value={createForm.phone}
                  onChange={e => handleChangeCreateField("phone", e.target.value)}
                  placeholder="'-' 없이 숫자만 입력"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-700">주소 *</label>
                <input
                  type="text"
                  className="h-9 cursor-pointer rounded-md border bg-neutral-50 px-2.5 text-sm outline-none"
                  value={createFormAddressDisplay}
                  readOnly
                  onClick={() => {
                    setCreateError(null);
                    setModalStep("search");
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-neutral-700">
                  상세주소 <span className="text-xs text-neutral-400">(선택)</span>
                </label>
                <input
                  type="text"
                  className="h-9 rounded-md border px-2.5 text-sm outline-none focus:border-black"
                  value={createForm.addressDetail}
                  onChange={e => handleChangeCreateField("addressDetail", e.target.value)}
                  placeholder="동/호수 등 상세 정보"
                />
              </div>

              <label className="mt-1 inline-flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={createForm.isDefault}
                  onChange={e => handleChangeCreateField("isDefault", e.target.checked)}
                />
                기본 배송지로 설정
              </label>

              {createError && <p className="mt-1 text-sm text-red-500">{createError}</p>}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
                onClick={() => {
                  setModalStep("list");
                  setCreateError(null);
                  setCreateForm(EMPTY_NEW_ADDRESS);
                  setEditingAddressId(null);
                }}
                disabled={isLoading}
              >
                목록으로
              </button>
              <button
                type="button"
                className="h-9 rounded-md bg-black px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                onClick={handleSaveAddress}
                disabled={isLoading}
              >
                {isLoading ? "저장 중..." : saveButtonLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
