import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { fetchApi } from "@/utils/server/fetchApi";
import { ProductDetail } from "../../types";

function parseIdOrThrow(param: string | string[] | undefined) {
  const id = Number(Array.isArray(param) ? param[0] : param);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Invalid id");
  return id;
}

const getProductById = cache(async (id: number): Promise<ProductDetail> => {
  if (!Number.isFinite(id) || id <= 0) notFound();

  const data = await fetchApi<ProductDetail>(`/be/product?id=${id}`, { cache: "no-store" });
  if (!data) notFound();

  return data;
});

export async function getProductOr404(
  idParam: string | string[] | undefined
): Promise<ProductDetail> {
  const id = parseIdOrThrow(idParam);

  return getProductById(id);
}
