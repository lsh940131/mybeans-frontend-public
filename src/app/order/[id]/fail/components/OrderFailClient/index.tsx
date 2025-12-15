"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface OrderFailClientProps {
  message: string;
}

export default function OrderFailClient({ message }: OrderFailClientProps) {
  const router = useRouter();

  useEffect(() => {
    alert(message);
    router.back();
  }, [message, router]);

  return null;
}
