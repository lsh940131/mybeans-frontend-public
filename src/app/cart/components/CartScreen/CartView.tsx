"use client";

import React, { useCallback, useMemo, useState } from "react";
import type { UICartQuote, UISellerSubtotal, UICartItem } from "../../types";
import { formatKRW } from "@/utils/shared";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/utils/client/fetchApi";
import { CreateOrderCheckoutFromCart, OrderCheckoutSourceEnum } from "@/app/order/types";

type Props = {
  data: UICartQuote | null;
  loading: boolean;
  onUpdateQty: (key: string, qty: number) => Promise<boolean> | void;
  onRemoveKeys: (keys: string[]) => Promise<boolean> | void;
};

type ProductGroup = {
  productId: number;
  productNameKr: string;
  productNameEn?: string;
  productThumbnail: string | null;
  variants: UICartItem[];
};

/**
 * 선택된 상품 기준 판매자 합계를 위한 타입
 */
type SellerSelectedSummary = {
  merchandiseSubtotal: number;
  shippingFeeSubtotal: number;
  freeApplied: boolean;
};

/**
 * 동일 상품(productId) 기준으로 장바구니 아이템을 그룹핑
 */
function groupByProduct(seller: UISellerSubtotal): ProductGroup[] {
  const map = new Map<number, ProductGroup>();
  for (const it of seller.items) {
    const g = map.get(it.productId);
    if (!g) {
      map.set(it.productId, {
        productId: it.productId,
        productNameKr: it.productNameKr,
        productNameEn: it.productNameEn,
        productThumbnail: it.productThumbnail ?? null,
        variants: [it],
      });
    } else {
      g.variants.push(it);
    }
  }
  return Array.from(map.values());
}

export default function CartView({ data, loading, onUpdateQty, onRemoveKeys }: Props) {
  const { isAuthed } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const router = useRouter();

  const allItemKeys = useMemo(
    () => (data ? data.list.flatMap(s => s.items.map(i => i.key)) : []),
    [data]
  );
  const isAllChecked = !!data && allItemKeys.length > 0 && selected.size === allItemKeys.length;

  /**
   * 장바구니에 실제로 담긴 상품이 있는지 여부
   * - data가 존재하고
   * - seller 중 하나라도 items.length > 0 인 경우를 "상품이 있다"고 판단
   */
  const hasItems = useMemo(() => {
    if (!data) return false;
    return data.list.some(seller => seller.items.length > 0);
  }, [data]);

  /**
   * 선택된 상품 기준 전체/판매자별 합계 계산
   * - 아무것도 선택되지 않은 경우: 합계 0원, 구매버튼 비활성화
   * - 판매자별: 선택된 상품 기준으로 merchandiseSubtotal / shippingFeeSubtotal / freeApplied 계산
   */
  const {
    sellerSummaryMap,
    selectedSubtotalMerchandise,
    selectedSubtotalShippingFee,
    hasSelection,
  } = useMemo(() => {
    const resultMap = new Map<number, SellerSelectedSummary>();
    const result = {
      sellerSummaryMap: resultMap,
      selectedSubtotalMerchandise: 0,
      selectedSubtotalShippingFee: 0,
      hasSelection: false,
    };

    if (!data || selected.size === 0) {
      return result;
    }

    let totalMerch = 0;
    let totalShip = 0;
    for (const seller of data.list) {
      const selectedItems = seller.items.filter(v => selected.has(v.key));
      if (selectedItems.length === 0) continue;

      const merch = selectedItems.reduce((acc, cur) => acc + cur.unitPrice * cur.qty, 0);

      // 무료배송 여부: 선택된 상품 합계 기준으로 다시 판정
      const freeApplied = merch >= seller.freeShippingThreshold;

      // 배송비: 단순 합산 (정책이 더 복잡하면 여기 로직만 교체)
      const ship = freeApplied ? 0 : selectedItems.reduce((sum, it) => sum + it.shippingFee, 0);

      resultMap.set(seller.sellerId, {
        merchandiseSubtotal: merch,
        shippingFeeSubtotal: ship,
        freeApplied,
      });

      totalMerch += merch;
      totalShip += ship;
    }

    result.sellerSummaryMap = resultMap;
    result.selectedSubtotalMerchandise = totalMerch;
    result.selectedSubtotalShippingFee = totalShip;
    result.hasSelection = selected.size > 0 && (totalMerch > 0 || totalShip > 0);

    return result;
  }, [data, selected]);

  /**
   * 키 배열을 기반으로 장바구니 아이템 삭제 + 선택 상태에서도 제거
   */
  const removeKeysAndUnselect = useCallback(
    async (keys: string[]) => {
      if (!keys.length) return;
      await onRemoveKeys(keys);
      setSelected(prev => {
        const next = new Set(prev);
        keys.forEach(k => next.delete(k));
        return next;
      });
    },
    [onRemoveKeys]
  );

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (!data) return;
      setSelected(checked ? new Set(allItemKeys) : new Set());
    },
    [data, allItemKeys]
  );

  const removeSelected = useCallback(async () => {
    if (selected.size === 0) return;
    await removeKeysAndUnselect(Array.from(selected));
  }, [removeKeysAndUnselect, selected]);

  const sellerCheckState = useCallback(
    (seller: UISellerSubtotal) => {
      const keys = seller.items.map(it => it.key);
      const selCount = keys.filter(k => selected.has(k)).length;
      return {
        all: keys.length > 0 && selCount === keys.length,
        some: selCount > 0 && selCount < keys.length,
      };
    },
    [selected]
  );

  // 일괄 토글: 판매자 소속 아이템 키를 전부 add/remove
  const toggleSeller = useCallback((seller: UISellerSubtotal, checked: boolean) => {
    const keys = seller.items.map(it => it.key);
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) keys.forEach(k => next.add(k));
      else keys.forEach(k => next.delete(k));
      return next;
    });
  }, []);

  const incQty = useCallback((it: UICartItem) => onUpdateQty(it.key, it.qty + 1), [onUpdateQty]);
  const decQty = useCallback(
    (it: UICartItem) => onUpdateQty(it.key, Math.max(1, it.qty - 1)),
    [onUpdateQty]
  );
  const inputQty = useCallback(
    (it: UICartItem, value: string) => {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 1) onUpdateQty(it.key, Math.floor(n));
    },
    [onUpdateQty]
  );

  /**
   * 하단 주문/로그인 버튼 클릭 핸들러
   * - 로그인 상태(isAuthed)에 따라 동작을 분기한다.
   *   - 로그인 상태: 선택된 장바구니 아이템들로 /order-checkout 생성 후 /order/[id] 로 이동
   *   - 비로그인 상태: /sign?redirectTo=/order 로 이동하여 로그인 성공 후 주문페이지로 리다이렉트
   */
  const handleOrderButtonClick = useCallback(async () => {
    // 장바구니가 비어있다면 아무 동작도 하지 않도록 가드
    if (!data) return;

    if (!isAuthed) {
      // 게스트: 로그인 페이지로 이동하면서, 로그인 후 돌아올 경로를 쿼리로 전달
      const redirectTo = "/order";
      router.push(`/sign?redirectTo=${encodeURIComponent(redirectTo)}`);
      return;
    }

    // 아무것도 선택 안 했으면 막기
    if (selected.size === 0) {
      alert("주문할 상품을 선택해주세요.");
      return;
    }

    // 선택된 key 기준으로 cartId 목록 만들기
    const selectedCartIds = data.list
      .flatMap(s => s.items)
      .filter(it => selected.has(it.key))
      .map(it => Number(it.cartId));

    if (selectedCartIds.length === 0) {
      alert("선택된 상품의 장바구니 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      const body: CreateOrderCheckoutFromCart = {
        source: OrderCheckoutSourceEnum.CART,
        cartIdList: selectedCartIds,
      };
      const res = await fetchApi<{ id: number; expiredAt: string }>("/be/order/checkout", {
        method: "POST",
        body,
      });
      const { id, expiredAt } = res;

      // 주문페이지로 이동
      router.push(`/order/${id}?expiredAt=${expiredAt}`);
    } catch (e) {
      console.error(e);
      alert("주문 정보를 생성하는 데 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }, [data, isAuthed, selected, router]);

  const orderButtonLabel = isAuthed ? "주문하기" : "로그인하기";

  if (loading) return <main style={{ padding: 24 }}>로딩...</main>;

  // data가 없거나, data는 있는데 담긴 상품이 하나도 없는 경우
  if (!data || !hasItems) {
    return (
      <main
        style={{
          width: "80%",
          margin: "0 auto",
          padding: "80px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>장바구니가 비어 있습니다.</h1>
        <p style={{ fontSize: 14, color: "#64748b" }}>마음에 드는 원두를 장바구니에 담아보세요.</p>
        <button
          type="button"
          onClick={() => router.push("/products?categoryIdList=1")}
          style={{
            marginTop: 12,
            padding: "10px 20px",
            borderRadius: 999,
            border: "none",
            background: "#0ea5e9",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          커피 보러가기
        </button>
      </main>
    );
  }

  return (
    <main style={{ width: "80%", margin: "0 auto", padding: "24px 0 96px" }}>
      <section style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={isAllChecked}
            onChange={e => toggleAll(e.target.checked)}
          />
          전체선택
        </label>
        <button
          onClick={removeSelected}
          disabled={selected.size === 0}
          style={{ marginLeft: "auto", padding: "6px 10px", cursor: "pointer" }}
        >
          선택삭제
        </button>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        {data.list.map(seller => {
          const groups = groupByProduct(seller);

          //  이 판매자(seller) 테이블 내 전체 row 수 (배송비 셀 rowSpan용)
          const sellerRowCount = groups.reduce((acc, g) => acc + g.variants.length, 0);

          // seller 단위에서 현재 몇 번째 row인지 카운트
          let sellerRowIndex = 0;

          // 선택된 상품 기준 판매자 합계
          const sellerSummary = sellerSummaryMap.get(seller.sellerId);
          const sellerMerchandiseSubtotal = sellerSummary?.merchandiseSubtotal ?? 0;
          const sellerShippingSubtotal = sellerSummary?.shippingFeeSubtotal ?? 0;

          return (
            <article
              key={seller.sellerId}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: 12,
                  background: "#f8fafc",
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <input
                  type="checkbox"
                  // 전체/부분 선택 상태 반영
                  checked={sellerCheckState(seller).all}
                  ref={el => {
                    if (el)
                      el.indeterminate =
                        !sellerCheckState(seller).all && sellerCheckState(seller).some;
                  }}
                  onChange={e => toggleSeller(seller, e.target.checked)}
                  aria-label={`${seller.sellerName}의 상품 전체 선택`}
                />
                <strong>{seller.sellerName}</strong>
              </header>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <colgroup>
                    <col style={{ width: 360 }} />
                    <col />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 120 }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      <th style={th}>상품</th>
                      <th style={th}>옵션</th>
                      <th style={thCenter}>수량</th>
                      <th style={thCenter}>상품금액</th>
                      <th style={thCenter}>배송비</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(group => {
                      const rowSpan = group.variants.length;
                      const groupCheckedCount = group.variants.filter(v =>
                        selected.has(v.key)
                      ).length;
                      const groupAll = groupCheckedCount === rowSpan && rowSpan > 0;
                      const groupSome = groupCheckedCount > 0 && groupCheckedCount < rowSpan;

                      return group.variants.map((it, idx) => {
                        const isFirstRowInSeller = sellerRowIndex === 0;
                        sellerRowIndex += 1;
                        const rowKey = `${it.key}-${idx}`;
                        return (
                          <tr key={rowKey} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            {idx === 0 && (
                              <td style={{ ...td, verticalAlign: "middle" }} rowSpan={rowSpan}>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                  <input
                                    type="checkbox"
                                    checked={groupAll}
                                    ref={el => {
                                      if (el) el.indeterminate = groupSome;
                                    }}
                                    onChange={e => {
                                      const keys = group.variants.map(v => v.key);
                                      setSelected(prev => {
                                        const next = new Set(prev);
                                        if (e.target.checked) keys.forEach(k => next.add(k));
                                        else keys.forEach(k => next.delete(k));
                                        return next;
                                      });
                                    }}
                                  />

                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 12,
                                      alignItems: "center",
                                      flex: 1,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => router.push(`/products/${group.productId}`)}
                                  >
                                    <div
                                      style={{
                                        width: 72,
                                        height: 72,
                                        background: "#f8fafc",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 6,
                                        overflow: "hidden",
                                        flex: "0 0 auto",
                                      }}
                                    >
                                      {group.productThumbnail ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={group.productThumbnail}
                                          alt={group.productNameKr}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#94a3b8",
                                            fontSize: 12,
                                          }}
                                        >
                                          no image
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ display: "grid", gap: 4 }}>
                                      <div style={{ fontWeight: 700 }}>{group.productNameKr}</div>
                                      {!!group.productNameEn && (
                                        <div style={{ fontSize: 12, color: "#64748b" }}>
                                          {group.productNameEn}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    aria-label={`${group.productNameKr} 상품 전체 삭제`}
                                    onClick={async e => {
                                      e.stopPropagation(); // 상품 영역 클릭과 분리
                                      const keys = group.variants.map(v => v.key);
                                      await removeKeysAndUnselect(keys);
                                    }}
                                    style={{
                                      marginLeft: 8,
                                      border: "none",
                                      background: "transparent",
                                      cursor: "pointer",
                                      fontSize: 16,
                                      lineHeight: 1,
                                      padding: 4,
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            )}

                            {/* 옵션 + 옵션 삭제(X) */}
                            <td style={td}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    color: it.selectedOptions?.length ? "#334155" : "#94a3b8",
                                    flex: 1,
                                  }}
                                >
                                  {it.selectedOptions?.length
                                    ? it.selectedOptions
                                        .map(o => `${o.optionName}: ${o.valueName}`)
                                        .join(" / ")
                                    : "옵션없음"}
                                </div>
                                <button
                                  type="button"
                                  aria-label="옵션 삭제"
                                  onClick={async () => {
                                    await removeKeysAndUnselect([it.key]);
                                  }}
                                  style={{
                                    marginLeft: 8,
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 16,
                                    lineHeight: 1,
                                    padding: 4,
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            </td>

                            {/* 수량 */}
                            <td style={{ ...td, textAlign: "center" }}>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <button
                                  onClick={() => decQty(it)}
                                  disabled={it.qty <= 1}
                                  title={it.qty <= 1 ? "최소 수량은 1개" : "감소"}
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                >
                                  -
                                </button>
                                <input
                                  className="qtyInput"
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={it.qty}
                                  onChange={e => inputQty(it, e.target.value)}
                                  style={{
                                    width: 56,
                                    textAlign: "center",
                                    padding: "6px 8px",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 6,
                                  }}
                                />
                                <button
                                  onClick={() => incQty(it)}
                                  style={{ width: 28, height: 28, borderRadius: 6 }}
                                >
                                  +
                                </button>
                              </div>
                            </td>

                            {/* 상품금액 */}
                            <td style={{ ...tdRight, fontWeight: 600 }}>
                              {formatKRW(it.unitPrice * it.qty)}
                            </td>

                            {/* 배송비 */}
                            {/* 배송비: 판매자 단위로 한 번만 rowSpan */}
                            {isFirstRowInSeller && (
                              <td
                                style={{
                                  ...tdRight,
                                  textAlign: "center",
                                  verticalAlign: "middle",
                                }}
                                rowSpan={sellerRowCount}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      color: seller.freeApplied ? "#0ea5e9" : "#0f172a",
                                    }}
                                  >
                                    {seller.freeApplied
                                      ? "무료배송"
                                      : formatKRW(seller.shippingFeeSubtotal)}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "#94a3b8",
                                    }}
                                  >
                                    {formatKRW(seller.freeShippingThreshold)} 이상 구매시 배송비
                                    무료
                                  </div>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              <footer
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                  alignItems: "center",
                  padding: 12,
                  background: "#fafafa",
                  borderTop: "1px solid #e5e7eb",
                  fontWeight: 600,
                }}
              >
                <span>주문금액 {formatKRW(sellerMerchandiseSubtotal)}</span>
                <span>+</span>
                <span>배송비 {formatKRW(sellerShippingSubtotal)}</span>
                <span>=</span>
                <span style={{ color: "#0ea5e9" }}>
                  {formatKRW(sellerMerchandiseSubtotal + sellerShippingSubtotal)}
                </span>
              </footer>
            </article>
          );
        })}
      </section>

      <aside
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#111827",
          color: "white",
          padding: "14px 0",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            width: "80%",
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "baseline", marginLeft: "auto" }}>
            <div style={{ fontSize: 14, color: "#93c5fd" }}>
              총 상품금액 {formatKRW(selectedSubtotalMerchandise)}
            </div>
            <div style={{ fontSize: 14, color: "#93c5fd" }}>+</div>
            <div style={{ fontSize: 14, color: "#93c5fd" }}>
              총 배송비 {formatKRW(selectedSubtotalShippingFee)}
            </div>
            <div style={{ fontSize: 14, color: "#93c5fd" }}>=</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginRight: "20px" }}>
              {formatKRW((selectedSubtotalMerchandise ?? 0) + (selectedSubtotalShippingFee ?? 0))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleOrderButtonClick}
              disabled={!hasSelection}
              style={{
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: hasSelection ? "#0ea5e9" : "#64748b",
                color: "white",
                fontWeight: 700,
                minWidth: 140,
                cursor: hasSelection ? "pointer" : "not-allowed",
              }}
            >
              {orderButtonLabel}
            </button>
          </div>
        </div>
      </aside>

      {/* 스피너 제거 스타일 (scoped) */}
      <style jsx>{`
        input.qtyInput {
          -moz-appearance: textfield;
          appearance: textfield;
        }
        input.qtyInput::-webkit-outer-spin-button,
        input.qtyInput::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </main>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 13,
  color: "#334155",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
};
const thCenter: React.CSSProperties = { ...th, textAlign: "center" };

const td: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "middle",
  fontSize: 14,
  color: "#0f172a",
  borderBottom: "1px solid #f1f5f9",
  borderRight: "1px solid #e2e8f0",
};
const tdRight: React.CSSProperties = { ...td, textAlign: "right" };
