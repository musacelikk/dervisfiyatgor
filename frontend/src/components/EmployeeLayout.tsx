"use client";

import { usePathname } from "next/navigation";
import EmployeeShell from "@/components/EmployeeShell";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/yonetici/login") {
    return <>{children}</>;
  }

  return <EmployeeShell>{children}</EmployeeShell>;
}
