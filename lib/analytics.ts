import { initDataFast } from "datafast";

let datafast: Awaited<ReturnType<typeof initDataFast>> | null = null;

/**
 * Get the singleton DataFast client, initializing it on first use.
 * Safe to call from any client component; auto-captures pageviews on
 * initial load and SPA route changes. Initialized on the axis app so the
 * DataFast visitor/session cookies are present when Paddle's overlay
 * checkout opens (see lib/paddle.ts openCheckout).
 */
export async function getAnalytics() {
  if (!datafast) {
    datafast = await initDataFast({
      websiteId:
        process.env.NEXT_PUBLIC_DATAFAST_WEBSITE_ID ||
        "dfid_Lym9BMuVNUZ0SQVuGjQun",
      domain: process.env.NEXT_PUBLIC_DATAFAST_DOMAIN,
      autoCapturePageviews: true,
    });
  }
  return datafast;
}
