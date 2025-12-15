import type { ReactNode } from "react";

interface OrderLayoutProps {
  children: ReactNode;
}

export default function OrderLayout({ children }: OrderLayoutProps) {
  return <>{children}</>;
}
