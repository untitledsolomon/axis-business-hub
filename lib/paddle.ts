// lib/paddle.ts
//
// Thin wrapper around Paddle.js (the browser checkout SDK). This is the
// direct replacement for the old lib/revenuecat.ts: it owns initialization
// and exposes a helper to open the Paddle overlay checkout for a given
// price. Entitlement state itself ("is this user Pro?") is NOT derived from
// the client SDK — Paddle.js only handles checkout UI, not customer state —
// it's read from Supabase, kept up to date by the /api/paddle/webhook route.
// See hooks/useAxisPro.ts.

import { initializePaddle, type Paddle, type PaddleEventData } from "@paddle/paddle-js";

const CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!;
const ENVIRONMENT =
  (process.env.NEXT_PUBLIC_PADDLE_ENV as "sandbox" | "production" | undefined) ??
  "production";

let paddleInstance: Paddle | null = null;
let initPromise: Promise<Paddle | undefined> | null = null;

/**
 * Lazily initialize Paddle.js. Safe to call multiple times — subsequent
 * calls return the same in-flight/resolved instance.
 */
export function initPaddle(): Promise<Paddle | undefined> {
  if (paddleInstance) {
    return Promise.resolve(paddleInstance);
  }
  if (!initPromise) {
    initPromise = initializePaddle({
      token: CLIENT_TOKEN,
      environment: ENVIRONMENT,
    }).then((paddle) => {
      paddleInstance = paddle ?? null;
      return paddle;
    });
  }
  return initPromise;
}

export interface OpenCheckoutOptions {
  priceId: string;
  /** Supabase user ID — passed through as custom_data so the webhook can
   * link the Paddle subscription back to the correct Axis account. */
  userId: string;
  email?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Opens the Paddle overlay checkout for a given price. Direct analog of
 * RevenueCat's `presentPaywall` in the old Paywall.tsx, except Paddle
 * renders its own overlay rather than mounting into a container element.
 */
export async function openCheckout({
  priceId,
  userId,
  email,
  onSuccess,
  onClose,
}: OpenCheckoutOptions): Promise<void> {
  const paddle = await initPaddle();
  if (!paddle) {
    throw new Error("Paddle failed to initialize");
  }

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: email ? { email } : undefined,
    customData: { axis_user_id: userId },
    settings: {
      successUrl: undefined, // keep as inline overlay; success handled via eventCallback below
    },
  });

  // Paddle.js reports checkout lifecycle events globally via the
  // `eventCallback` passed at initialization time (see initPaddle callers),
  // not per-open() call. Components that need onSuccess/onClose should
  // instead listen via `subscribeToCheckoutEvents` below.
  void onSuccess;
  void onClose;
}

type CheckoutEventHandler = (event: PaddleEventData) => void;

/**
 * Registers a callback for Paddle checkout lifecycle events
 * (checkout.completed, checkout.closed, etc). Call once, e.g. from the
 * Paywall component on mount, before calling openCheckout.
 */
export async function subscribeToCheckoutEvents(
  handler: CheckoutEventHandler
): Promise<void> {
  await initializePaddle({
    token: CLIENT_TOKEN,
    environment: ENVIRONMENT,
    eventCallback: handler,
  }).then((paddle) => {
    paddleInstance = paddle ?? paddleInstance;
  });
}
