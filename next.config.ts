import type { NextConfig } from "next";

// Derived from env so the CSP always matches whichever Supabase project is
// actually configured, instead of a hardcoded project URL going stale every
// time the project changes (e.g. dev vs. prod, or migrating projects).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
// Supabase realtime (websocket) subscriptions connect over wss:// on the
// same project ref, so it's included alongside the https origin.
const supabaseRealtimeOrigin = supabaseOrigin
  ? supabaseOrigin.replace(/^https:\/\//, "wss://")
  : "";
const posthogOrigin = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogAssetsOrigin = posthogOrigin
  ? posthogOrigin
      .replace("://us.i.", "://us-assets.i.")
      .replace("://eu.i.", "://eu-assets.i.")
      .replace("://us.posthog.com", "://us-assets.i.posthog.com")
      .replace("://eu.posthog.com", "://eu-assets.i.posthog.com")
  : "";

// CSP directives take space-separated origins (no path component). Paddle's
// overlay checkout (Paddle.js) loads its iframe/script bundle from
// buy.paddle.com and posts events back to checkout-service.paddle.com;
// without both, Checkout.open() renders blank (assets blocked, no visible
// error beyond the console) -- the same failure mode the old RevenueCat
// paywall had before its CSP entries were added.
const paddleCheckoutOrigin = 'https://buy.paddle.com';
const paddleCheckoutServiceOrigin = 'https://checkout-service.paddle.com';
const paddleCdnOrigin = 'https://cdn.paddle.com';
// Paddle's retention analytics companion script is served by ProfitWell.
const profitWellOrigin = 'https://public.profitwell.com';
const posthogToolbarOrigin = 'https://internal-j.posthog.com';
// The toolbar's login/auth flow (triggered when a user authenticates the
// PostHog toolbar in-app) exchanges an OAuth token against posthog.com's
// main app host -- distinct from both the ingest host (i.posthog.com,
// posthogOrigin above) and the toolbar-internal host (internal-j.posthog.com,
// posthogToolbarOrigin above). Without it, toolbar auth completes client-side
// then fails silently when the token exchange itself is blocked by CSP.
const posthogAppOrigin = 'https://us.posthog.com';
// DataFast sends analytics events to its API endpoint; without it in
// connect-src the SDK's fetch calls are blocked by CSP and events never
// reach DataFast.
const datafastOrigin = 'https://datafa.st';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
                    default-src 'self';
                    connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin} ${posthogOrigin} ${posthogAssetsOrigin} ${posthogToolbarOrigin} ${posthogAppOrigin} ${paddleCheckoutOrigin} ${paddleCheckoutServiceOrigin} ${paddleCdnOrigin} ${profitWellOrigin} ${datafastOrigin};
                    script-src 'self' 'unsafe-eval' 'unsafe-inline' ${posthogAssetsOrigin} ${posthogToolbarOrigin} ${paddleCdnOrigin} ${paddleCheckoutOrigin};
                    script-src-elem 'self' 'unsafe-inline' ${posthogAssetsOrigin} ${posthogToolbarOrigin} ${paddleCdnOrigin} ${paddleCheckoutOrigin} ${profitWellOrigin};
                    worker-src 'self' blob:;
                    style-src 'self' 'unsafe-inline' ${paddleCdnOrigin} ${posthogAssetsOrigin};
                    style-src-elem 'self' 'unsafe-inline' ${paddleCdnOrigin} ${posthogAssetsOrigin};
                    frame-src 'self' ${paddleCheckoutOrigin};
                    img-src 'self' data: ${supabaseOrigin};
                    font-src 'self';
                    object-src 'none';
                    base-uri 'self';
                    form-action 'self';
                    frame-ancestors 'none';
                    upgrade-insecure-requests;
                  `.replace(/\n/g, "")
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
