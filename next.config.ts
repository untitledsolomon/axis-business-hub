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

// CSP directives take space-separated origins (no path component), so the
// connect-src entry is just the api.revenuecat.com origin, not a path. The
// paywall widget also loads its own script bundle and injects <style> tags
// from RevenueCat's asset CDN, so those need script-src/style-src entries
// too, or the widget renders blank (assets blocked, no visible error beyond
// the console).
const revenueCatApiOrigin = 'https://api.revenuecat.com';
const revenueCatAssetsOrigin = 'https://assets.revenuecat.com';

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
                    connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin} ${posthogOrigin} ${posthogAssetsOrigin} ${revenueCatApiOrigin};
                    script-src 'self' 'unsafe-eval' 'unsafe-inline' ${posthogAssetsOrigin} ${revenueCatAssetsOrigin};
                    script-src-elem 'self' 'unsafe-inline' ${posthogAssetsOrigin} ${revenueCatAssetsOrigin};
                    worker-src 'self' blob:;
                    style-src 'self' 'unsafe-inline' ${revenueCatAssetsOrigin};
                    style-src-elem 'self' 'unsafe-inline' ${revenueCatAssetsOrigin};
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
