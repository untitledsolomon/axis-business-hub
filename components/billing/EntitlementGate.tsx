"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAxisPro } from "@/hooks/useAxisPro";
import { useOrg } from "@/hooks/use-org";

export function EntitlementGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, error } = useAxisPro();
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
  return <>{children}</>;
}