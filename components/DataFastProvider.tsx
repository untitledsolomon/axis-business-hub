"use client";

import { ReactNode, useEffect } from "react";
import { getAnalytics } from "@/lib/analytics";

/**
 * Initializes DataFast on the client so its visitor/session cookies are set
 * before Paddle's overlay checkout opens (see lib/paddle.ts openCheckout,
 * which passes them as customData for revenue attribution).
 */
export function DataFastProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    getAnalytics().catch(() => {
      // DataFast initialization failure should not break the page.
    });
  }, []);

  return <>{children}</>;
}
