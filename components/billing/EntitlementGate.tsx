"use client";

import { usePathname } from "next/navigation";
import { Paywall } from "@/components/Paywall";
import { useAxisPro } from "@/hooks/useAxisPro";

export function EntitlementGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isProUser, isLoading, error, refresh } = useAxisPro();
  const exempt = pathname === "/onboarding" || pathname?.startsWith("/settings/billing");

  if (exempt || isLoading) return <>{children}</>;
  if (error) return <div className="p-8 text-sm text-destructive">Unable to verify your subscription. Please refresh and try again.</div>;
  if (!isProUser) {
    return <div className="mx-auto max-w-5xl p-6"><h1 className="font-display text-2xl font-semibold">Choose a plan to continue</h1><p className="mt-1 text-sm text-muted-foreground">Your organisation needs an active plan or trial to use Axis.</p><div className="mt-8"><Paywall onSuccess={refresh} /></div></div>;
  }
  return <>{children}</>;
}