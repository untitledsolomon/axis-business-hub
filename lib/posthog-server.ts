// lib/posthog-server.ts
//
// Server-side PostHog client for API routes. The browser SDK (see
// instrumentation-client.ts) only captures client-side events; API route
// errors — like a rejected Paddle webhook — are invisible to PostHog
// unless captured here. Reuses the same project token/host env vars as the
// client so no extra configuration is needed.

import { PostHog as PostHogNode } from "posthog-node";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "";
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com";

export function getPostHogServer() {
  if (!projectToken) return null;
  return new PostHogNode(projectToken, { host });
}
