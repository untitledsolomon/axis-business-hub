"use client";

import { AppShell } from "@/components/app/app-shell";
import { EntitlementGate } from "@/components/billing/EntitlementGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell><EntitlementGate>{children}</EntitlementGate></AppShell>;
}
