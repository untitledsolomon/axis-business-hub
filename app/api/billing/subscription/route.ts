import { NextResponse } from "next/server";
import { Paddle } from "@paddle/paddle-node-sdk";
import { createClient } from "@/lib/supabase/server";
import { getPlanByPriceId } from "@/lib/paddle-plans";
import { getPostHogServer } from "@/lib/posthog-server";

async function getAccess(orgId: string, requireAdmin: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Authentication required", status: 401 } as const;

  const { data: member } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { supabase, error: "Organisation access denied", status: 403 } as const;
  if (requireAdmin && !["owner", "admin"].includes(member.role)) {
    return { supabase, error: "Only organisation owners and admins can manage billing", status: 403 } as const;
  }
  return { supabase, user, member } as const;
}

export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  const access = await getAccess(orgId, false);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await access.supabase
    .from("subscriptions")
    .select("*")
    .eq("org_id", orgId)
    .in("status", ["trialing", "active", "past_due", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { orgId?: string; action?: string; priceId?: string } | null;
  if (!body?.orgId || !body.action) return NextResponse.json({ error: "orgId and action are required" }, { status: 400 });
  const access = await getAccess(body.orgId, true);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: subscription } = await access.supabase
    .from("subscriptions")
    .select("paddle_subscription_id, paddle_price_id")
    .eq("org_id", body.orgId)
    .in("status", ["trialing", "active", "past_due", "paused"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!subscription) return NextResponse.json({ error: "No active subscription found" }, { status: 404 });

  // Trial subscriptions use a synthetic paddle_subscription_id (e.g.
  // "trial-<org_id>") that does not exist in Paddle. Plan changes for a
  // trial must go through checkout to create a real Paddle subscription —
  // calling Paddle's update API with a synthetic ID fails. Signal the
  // client to open checkout instead.
  const isTrial = subscription.paddle_subscription_id.startsWith("trial-");
  if (body.action === "change-plan" && isTrial) {
    return NextResponse.json({ ok: false, requiresCheckout: true, message: "Trial subscriptions must be upgraded via checkout." }, { status: 409 });
  }

  const paddle = new Paddle(process.env.PADDLE_API_KEY!);
  try {
    if (body.action === "cancel") {
      await paddle.subscriptions.cancel(subscription.paddle_subscription_id, { effectiveFrom: "next_billing_period" });
    } else if (body.action === "resume") {
      await paddle.subscriptions.resume(subscription.paddle_subscription_id, { effectiveFrom: "immediately" });
    } else if (body.action === "change-plan") {
      if (!body.priceId || !getPlanByPriceId(body.priceId)) return NextResponse.json({ error: "Invalid Paddle price" }, { status: 400 });
      await paddle.subscriptions.update(subscription.paddle_subscription_id, {
        items: [{ priceId: body.priceId, quantity: 1 }],
        prorationBillingMode: "prorated_next_billing_period",
      });
    } else {
      return NextResponse.json({ error: "Unsupported billing action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Paddle subscription operation failed", error);
    const posthog = getPostHogServer();
    posthog?.capture({
      distinctId: "billing-subscription",
      event: "billing_subscription_error",
      properties: {
        action: body.action,
        paddleSubscriptionId: subscription.paddle_subscription_id,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ error: "Paddle subscription operation failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, message: "Paddle is processing the billing change." });
}