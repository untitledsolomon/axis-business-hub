"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Paywall } from "@/components/Paywall";
import { useAxisPro } from "@/hooks/useAxisPro";
import { useOrg } from "@/hooks/use-org";

export function EntitlementGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isProUser, isLoading, error, refresh } = useAxisPro();
  const { currentOrg, isLoading: isOrgLoading } = useOrg();
  const exempt = pathname === "/onboarding" || pathname?.startsWith("/settings");

  useEffect(() => {
    if (!exempt && !isLoading && !isOrgLoading && !currentOrg) {
      router.replace("/onboarding");
    }
  }, [currentOrg, exempt, isLoading, isOrgLoading, router]);

  if (exempt || isLoading || isOrgLoading) return <>{children}</>;
  if (!currentOrg) {
    return null;
  }
  if (error) return <div className="p-8 text-sm text-destructive">Unable to verify your subscription. Please refresh and try again.</div>;
  if (!isProUser) {
    return <div className="mx-auto max-w-5xl p-6"><h1 className="font-display text-2xl font-semibold">Choose a plan to continue</h1><p className="mt-1 text-sm text-muted-foreground">Your organisation needs an active plan or trial to use Axis.</p><div className="mt-8"><Paywall onSuccess={refresh} /></div></div>;
  }
  return <>{children}</>;
}