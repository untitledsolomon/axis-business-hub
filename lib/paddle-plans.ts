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

// Keep each public variable reference static so Next.js can inline it into
// the browser bundle during the production build.
const starterMonthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY ?? "";
const starterYearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER_YEARLY ?? "";
const proMonthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY ?? "";
const proYearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_YEARLY ?? "";
const advancedMonthlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_MONTHLY ?? "";
const advancedYearlyPriceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ADVANCED_YEARLY ?? "";

export const AXIS_PLANS: AxisPlan[] = [
  {
    id: "starter",
    name: "Starter",
    priceIds: {
      month: starterMonthlyPriceId,
      year: starterYearlyPriceId,
    },
  },
  {
    id: "pro",
    name: "Pro",
    priceIds: {
      month: proMonthlyPriceId,
      year: proYearlyPriceId,
    },
  },
  {
    id: "advanced",
    name: "Advanced",
    priceIds: {
      month: advancedMonthlyPriceId,
      year: advancedYearlyPriceId,
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
