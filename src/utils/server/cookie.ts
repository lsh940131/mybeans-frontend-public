import { cookies } from "next/headers";

export async function getCookie(key: string): Promise<string | undefined> {
  return (await cookies()).get(key)?.value;
}
