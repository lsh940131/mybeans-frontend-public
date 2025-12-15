import { fetchApi } from "@/utils/server/fetchApi";
import { UICartQuote } from "./types";
import CartScreen from "./components/CartScreen";

export default async function CartPage() {
  let initialData: UICartQuote | null = null;

  try {
    initialData = await fetchApi<UICartQuote>("/be/cart", { method: "GET" });
  } catch {
    initialData = null;
  }

  return <CartScreen initialData={initialData} />;
}
