"use client";

import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { fetchApi } from "@/utils/client/fetchApi";
import type {
  ISellerSubtotalWithReqMsg,
  IShippingForm,
  IUserAddress,
  NewAddressForm,
  ISellerItemWithReqMsg,
} from "@/app/order/types";

interface ShippingSectionProps {
  onChangeShippingField: (field: keyof IShippingForm, value: string) => void;
  sellerSubtotalList: ISellerSubtotalWithReqMsg[];
  setSellerSubtotalList: Dispatch<SetStateAction<ISellerSubtotalWithReqMsg[]>>;
}

type ModalStep = "list" | "search" | "create";

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

const EMPTY_NEW_ADDRESS: NewAddressForm = {
  name: "",
  receiverName: "",
  phone: "",
  address: "",
  addressDetail: "",
  postcode: "",
  isDefault: false,
};

const isSameItem = (a: ISellerItemWithReqMsg, b: ISellerItemWithReqMsg) => {
  if (a.productId !== b.productId) return false;
  if (a.optionValueIdList.length !== b.optionValueIdList.length) return false;
  return a.optionValueIdList.every((id, idx) => id === b.optionValueIdList[idx]);
};

const buildItemOptionLabel = (item: ISellerItemWithReqMsg): string => {
  const { product, optionValueIdList } = item;
  if (!product.optionList || !optionValueIdList?.length) return "";

  const labels: string[] = [];
  for (const opt of product.optionList) {
    const matched = opt.valueList.filter(v => optionValueIdList.includes(v.id));
    if (!matched.length) continue;
    matched.forEach(v => labels.push(v.valueKr));
  }
  return labels.join(", ");
};

export default function ShippingSection({
  onChangeShippingField,
  sellerSubtotalList,
  setSellerSubtotalList,
}: ShippingSectionProps) {
  const [addressList, setAddressList] = useState<IUserAddress[]>([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState<boolean>(true);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<ModalStep>("list");

  const [createForm, setCreateForm] = useState<NewAddressForm>(EMPTY_NEW_ADDRESS);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);

  const [memoMode, setMemoMode] = useState<"global" | "perItem">("global");
  const [globalMemo, setGlobalMemo] = useState<string>("");

  const selectedAddress = useMemo(
    () => addressList.find(a => a.id === selectedAddressId) ?? null,
    [addressList, selectedAddressId]
  );

  useEffect(() => {
    if (!selectedAddress) return;

    onChangeShippingField("receiverName", selectedAddress.receiverName);
    onChangeShippingField("phone", selectedAddress.phone);
    onChangeShippingField("postcode", selectedAddress.postcode ?? "");
    onChangeShippingField("address", selectedAddress.address);
    onChangeShippingField("addressDetail", selectedAddress.addressDetail ?? "");
  }, [selectedAddress, onChangeShippingField]);

  const reloadAddressList = async () => {
    setIsLoadingAddress(true);
    setAddressError(null);
    try {
      const res = await fetchApi<IUserAddress[]>("/be/user/address/list", {
        method: "GET",
      });
      const list = Array.isArray(res) ? res : [];
      setAddressList(list);

      if (list.length === 0) {
        setSelectedAddressId(null);
      } else {
        setSelectedAddressId(list[0].id);
      }
    } catch (e) {
      console.error("[ShippingSection] 주소 재조회 실패:", e);
      setAddressError("배송지 정보를 불러오지 못했습니다.");
      setAddressList([]);
      setSelectedAddressId(null);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadInitialAddresses = async () => {
      setIsLoadingAddress(true);
      setAddressError(null);

      try {
        const res = await fetchApi<IUserAddress[]>("/be/user/address/list", {
          method: "GET",
        });

        if (cancelled) return;

        const list = Array.isArray(res) ? res : [];
        setAddressList(list);

        if (list.length === 0) {
          setSelectedAddressId(null);
          return;
        }

        setSelectedAddressId(list[0].id);
      } catch (e) {
        if (cancelled) return;
        console.error("[ShippingSection] 주소 조회 실패:", e);
        setAddressError("배송지 정보를 불러오지 못했습니다.");
        setAddressList([]);
        setSelectedAddressId(null);
      } finally {
        if (!cancelled) setIsLoadingAddress(false);
      }
    };

    void loadInitialAddresses();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChangeCreateField = <K extends keyof NewAddressForm>(
    field: K,
    value: NewAddressForm[K]
  ) => {
    setCreateForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectAddress = (addr: IUserAddress) => {
    setSelectedAddressId(addr.id);
    setIsModalOpen(false);
    setModalStep("list");
  };

  const handleSaveAddress = async () => {
    setCreateError(null);

    if (!createForm.receiverName.trim() || !createForm.phone.trim() || !createForm.address.trim()) {
      setCreateError("받는이, 연락처, 주소는 필수입니다.");
      return;
    }

    const base = {
      name: createForm.name.trim() || createForm.receiverName.trim(),
      receiverName: createForm.receiverName.trim(),
      phone: createForm.phone.trim(),
      address: createForm.address.trim(),
      addressDetail: createForm.addressDetail.trim() || undefined,
      postcode: createForm.postcode.trim() || undefined,
      isDefault: createForm.isDefault,
    };

    try {
      setIsSaving(true);

      if (editingAddressId === null) {
        await fetchApi("/be/user/address", {
          method: "POST",
          body: base,
        });
      } else {
        await fetchApi("/be/user/address", {
          method: "PUT",
          body: {
            id: editingAddressId,
            ...base,
          },
        });
      }

      setCreateForm(EMPTY_NEW_ADDRESS);
      setEditingAddressId(null);
      setModalStep("list");
      await reloadAddressList();
    } catch (e) {
      console.error("[ShippingSection] 배송지 저장 실패:", e);
      setCreateError(
        editingAddressId === null
          ? "배송지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "배송지를 수정하지 못했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen || modalStep !== "search") return;
    if (!window.daum?.Postcode) {
      console.error("[ShippingSection] Kakao Postcode script not loaded");
      return;
    }

    const container = document.getElementById("postcode-container");
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
  }, [isModalOpen, modalStep]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setModalStep("list");
    setCreateError(null);
    setEditingAddressId(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalStep("list");
    setCreateError(null);
    setEditingAddressId(null);
  };

  const handleOpenCreateFlow = () => {
    setCreateError(null);
    setCreateForm(EMPTY_NEW_ADDRESS);
    setEditingAddressId(null);
    setModalStep("search");
  };

  const handleEditAddress = (addr: IUserAddress) => {
    setCreateError(null);
    setEditingAddressId(addr.id);
    setCreateForm({
      name: addr.name,
      receiverName: addr.receiverName,
      phone: addr.phone,
      address: addr.address,
      addressDetail: addr.addressDetail ?? "",
      postcode: addr.postcode ?? "",
      isDefault: addr.isDefault,
    });
    setModalStep("create");
  };

  const handleDeleteAddress = async (addr: IUserAddress) => {
    const ok = window.confirm(`'${addr.name}' 배송지를 삭제하시겠습니까?`);
    if (!ok) return;

    try {
      setIsLoadingAddress(true);
      await fetchApi(`/be/user/address?id=${addr.id}`, {
        method: "DELETE",
      });

      await reloadAddressList();
    } catch (e) {
      console.error("[ShippingSection] 배송지 삭제 실패:", e);
      alert("배송지를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  const createFormAddressDisplay =
    createForm.address && createForm.postcode
      ? `${createForm.address} (${createForm.postcode})`
      : createForm.address;

  const createTitle = editingAddressId === null ? "배송지 신규입력" : "배송지 수정";
  const saveButtonLabel = editingAddressId === null ? "저장하기" : "수정하기";

  const handleChangeGlobalMemo = (value: string) => {
    setGlobalMemo(value);
    const trimmed = value.trim();

    setSellerSubtotalList(prev =>
      prev.map(seller => ({
        ...seller,
        items: seller.items.map(item => ({
          ...item,
          shipmentReqMsg: trimmed ? trimmed : "",
        })),
      }))
    );
  };

  const handleChangeItemMemo = (
    sellerId: number,
    targetItem: ISellerItemWithReqMsg,
    value: string
  ) => {
    const trimmed = value.trim();

    setSellerSubtotalList(prev =>
      prev.map(seller => {
        if (seller.sellerId !== sellerId) return seller;
        return {
          ...seller,
          items: seller.items.map(item =>
            isSameItem(item, targetItem)
              ? {
                  ...item,
                  shipmentReqMsg: trimmed ? trimmed : "",
                }
              : item
          ),
        };
      })
    );
  };

  const handleToggleMemoMode = () => {
    setMemoMode(prev => {
      const next = prev === "global" ? "perItem" : "global";

      if (next === "global") {
        const first = sellerSubtotalList
          .flatMap(s => s.items)
          .find(it => it.shipmentReqMsg && it.shipmentReqMsg.trim());
        setGlobalMemo(first?.shipmentReqMsg ?? "");
      }

      return next;
    });
  };

  return (
    <section aria-label="배송지" className="space-y-3">
      {/* 섹션 타이틀 */}
      <h2 className="text-xl font-semibold">배송지</h2>

      {/* 메인 배송지 카드 */}
      <div className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 shadow-sm">
        {/* 상단: 선택된 배송지 정보 */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">
                {selectedAddress ? selectedAddress.name : "배송지를 선택해 주세요"}
              </span>
              {selectedAddress && selectedAddress.isDefault && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-700">
                  기본배송지
                </span>
              )}
            </div>

            <div className="text-sm text-neutral-600">
              {isLoadingAddress
                ? "배송지 정보를 불러오는 중입니다..."
                : selectedAddress
                ? selectedAddress.receiverName + " · " + selectedAddress.phone
                : "받는이 · 연락처"}
            </div>

            <div className="text-sm text-neutral-700">
              {selectedAddress
                ? `${selectedAddress.address} ${selectedAddress.addressDetail ?? ""} ${
                    selectedAddress.postcode ? `(${selectedAddress.postcode})` : ""
                  }`
                : "주소"}
            </div>

            {addressError && <p className="mt-1 text-sm text-red-500">{addressError}</p>}
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="h-9 rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
          >
            변경
          </button>
        </div>

        {/* --- 배송 메모 영역 --------------------------------------------------- */}
        <div className="mt-4 border-t border-neutral-200 pt-3.5">
          {/* 토글: [ ] 배송메모 개별 입력 */}
          <button
            type="button"
            onClick={handleToggleMemoMode}
            className="flex items-center gap-2 text-sm text-neutral-800"
          >
            <span
              className={[
                "inline-flex h-5 w-5 items-center justify-center rounded border text-xs",
                memoMode === "perItem"
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-neutral-300 bg-white text-transparent",
              ].join(" ")}
            >
              ✓
            </span>
            <span>배송메모 개별 입력</span>
          </button>

          {/* global 모드 */}
          {memoMode === "global" && (
            <div className="mt-2.5">
              <input
                type="text"
                className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm outline-none focus:border-black"
                placeholder="예: 문 앞에 놓아주세요."
                value={globalMemo}
                onChange={e => handleChangeGlobalMemo(e.target.value)}
              />
              <p className="mt-1 text-xs text-neutral-500">
                입력한 내용이 모든 상품에 동일하게 적용됩니다.
              </p>
            </div>
          )}

          {/* per-item 모드 */}
          {memoMode === "perItem" && (
            <div className="mt-3 space-y-3">
              {sellerSubtotalList.map(seller => (
                <div key={seller.sellerId} className="rounded-xl bg-neutral-50 px-3.5 py-2.5">
                  <p className="text-sm font-medium text-neutral-800">{seller.sellerName}</p>
                  <div className="mt-1.5 space-y-2.5">
                    {seller.items.map(item => {
                      const key = `${seller.sellerId}-${
                        item.productId
                      }-${item.optionValueIdList.join("_")}`;
                      const optionText = buildItemOptionLabel(item);
                      return (
                        <div key={key} className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-neutral-900">
                                {item.product.nameKr}
                              </p>
                              <p className="truncate text-xs text-neutral-500">
                                {optionText ? `${optionText} · ` : ""}
                                수량 {item.qty}개
                              </p>
                            </div>
                          </div>
                          <input
                            type="text"
                            className="h-9 w-full rounded-md border border-neutral-300 px-2.5 text-sm outline-none focus:border-black"
                            placeholder="예: 관리실에 맡겨 주세요."
                            value={item.shipmentReqMsg ?? ""}
                            onChange={e =>
                              handleChangeItemMemo(seller.sellerId, item, e.target.value)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================== 모달 ================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          onClick={handleCloseModal}
        >
          <div className="absolute inset-0 bg-black/30" />

          <div
            className="relative z-10 flex max-h-[90vh] w-[540px] max-w-[95vw] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-xl font-semibold">
                {modalStep === "list"
                  ? "배송지 목록"
                  : modalStep === "search"
                  ? "주소 검색"
                  : createTitle}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-sm text-neutral-500 hover:text-neutral-700"
              >
                닫기
              </button>
            </div>

            {/* list 단계 */}
            {modalStep === "list" && (
              <>
                <div className="border-b px-4 py-2.5">
                  <button
                    type="button"
                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    onClick={handleOpenCreateFlow}
                  >
                    + 배송지 신규입력
                  </button>
                </div>

                <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-3 text-sm">
                  {isLoadingAddress && (
                    <p className="py-4 text-center text-sm text-neutral-500">
                      배송지 정보를 불러오는 중입니다...
                    </p>
                  )}

                  {!isLoadingAddress && addressList.length === 0 && (
                    <p className="py-4 text-center text-sm text-neutral-500">
                      등록된 배송지가 없습니다. 배송지를 추가해 주세요.
                    </p>
                  )}

                  {addressList.map(addr => {
                    const isSelected = addr.id === selectedAddressId;
                    return (
                      <div
                        key={addr.id}
                        className="rounded-xl border border-neutral-200 px-3 py-2.5 text-neutral-800"
                      >
                        <div className="mb-1 flex items-start gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="font-semibold">{addr.name}</span>
                              {addr.isDefault && (
                                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
                                  기본배송지
                                </span>
                              )}
                            </div>
                            <div className="text-[13px] text-neutral-600 mt-2">{`${addr.receiverName} · ${addr.phone}`}</div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectAddress(addr)}
                            className={[
                              "ml-auto shrink-0 h-7 rounded-md px-2 text-[12px] font-medium",
                              isSelected
                                ? "border border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
                            ].join(" ")}
                          >
                            {isSelected ? "선택됨" : "선택"}
                          </button>
                        </div>

                        <div className="mb-2 text-sm text-neutral-700">
                          {addr.address} {addr.addressDetail ?? ""}{" "}
                          {addr.postcode ? `(${addr.postcode})` : ""}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="h-8 rounded-md border border-neutral-300 px-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
                            onClick={() => handleEditAddress(addr)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="h-8 rounded-md border border-neutral-300 px-2.5 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteAddress(addr)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* search 단계 */}
            {modalStep === "search" && (
              <div className="flex flex-1 flex-col items-center px-4 py-4">
                <div
                  id="postcode-container"
                  className="h-[444px] w-[500px] overflow-hidden rounded-md border border-neutral-200"
                />
                <div className="mt-3 flex w-full max-w-[500px] justify-end">
                  <button
                    type="button"
                    className="h-9 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
                    onClick={() => {
                      setModalStep("list");
                      setCreateError(null);
                      setEditingAddressId(null);
                    }}
                  >
                    목록으로
                  </button>
                </div>
              </div>
            )}

            {/* create 단계 */}
            {modalStep === "create" && (
              <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm">
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
                        setModalStep("search");
                        setCreateError(null);
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
                      setEditingAddressId(null);
                      setCreateForm(EMPTY_NEW_ADDRESS);
                    }}
                    disabled={isSaving}
                  >
                    목록으로
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded-md bg-black px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    onClick={handleSaveAddress}
                    disabled={isSaving}
                  >
                    {isSaving ? "저장 중..." : saveButtonLabel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
