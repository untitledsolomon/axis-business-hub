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
  ? posthogOrigin.replace("://us.i.", "://us-assets.i.")
  : "";

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
                    connect-src 'self' ${supabaseOrigin} ${supabaseRealtimeOrigin} ${posthogOrigin};
                    script-src 'self' 'unsafe-eval' 'unsafe-inline' ${posthogAssetsOrigin};
                    worker-src 'self' blob:;
                    style-src 'self' 'unsafe-inline';
                    img-src 'self' data:;
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
