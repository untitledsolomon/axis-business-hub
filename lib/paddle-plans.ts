// lib/paddle-plans.ts
//
// Central mapping between Axis subscription tiers and the Paddle price IDs
// that back them. Price IDs come from env so sandbox/production catalogs
// can differ without code changes.

export type BillingInterval = "month" | "year";

export type AxisPlanId = "starter" | "pro" | "advanced";

export interface AxisPlan {
  id: AxisPlanId;
  name: string;
  priceIds: Record<BillingInterval, string>;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    // Don't throw at module scope in the browser bundle for plans that
    // aren't wired up yet in a given environment (e.g. local dev without
    // all price IDs set) — surface a clear runtime error only when the
    // plan is actually used.
    return "";
  }
  return value;
}

export const AXIS_PLANS: AxisPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceIds: {
      month: requireEnv("NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY"),
      year: requireEnv("NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY"),
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceIds: {
      month: requireEnv("NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY"),
      year: requireEnv("NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY"),
    },
  },
  {
    id: "advanced",
    name: "Advanced",
    priceIds: {
      month: requireEnv("NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_MONTHLY"),
      year: requireEnv("NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_YEARLY"),
    },
  },
];

export function getPlan(planId: AxisPlanId): AxisPlan | undefined {
  return AXIS_PLANS.find((plan) => plan.id === planId);
}

export function getPriceId(planId: AxisPlanId, interval: BillingInterval): string {
  const plan = getPlan(planId);
  const priceId = plan?.priceIds[interval];
  if (!priceId) {
    throw new Error(
      `No Paddle price ID configured for plan "${planId}" (${interval}). Check your env vars.`
    );
  }
  return priceId;
}

/** Reverse lookup: given a Paddle price ID, find which Axis plan it belongs to. */
export function getPlanByPriceId(priceId: string): AxisPlan | undefined {
  return AXIS_PLANS.find((plan) =>
    Object.values(plan.priceIds).includes(priceId)
  );
}
