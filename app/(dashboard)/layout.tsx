"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { EntitlementGate } from "@/components/billing/EntitlementGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/onboarding") return <EntitlementGate>{children}</EntitlementGate>;
  return <AppShell><EntitlementGate>{children}</EntitlementGate></AppShell>;
}
