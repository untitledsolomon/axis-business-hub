// app/api/paddle/webhook/route.ts
//
// Receives Paddle subscription notifications and mirrors them into the
// `subscriptions` table. This is the server-side counterpart that the old
// RevenueCat integration didn't need — RevenueCat's client SDK exposed
// CustomerInfo directly, but Paddle.js only drives checkout UI, so
// entitlement state has to be derived here from webhook events instead.
//
// Register this endpoint in Paddle Dashboard > Developer Tools >
// Notifications, subscribed to:
//   subscription.created, subscription.updated, subscription.canceled,
//   subscription.trialing (covered by created/updated with status field)

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Paddle, EventName } from "@paddle/paddle-node-sdk";
import { getPlanByPriceId } from "@/lib/paddle-plans";

function serviceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const paddle = new Paddle(process.env.PADDLE_API_KEY!);
const WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const signature = request.headers.get("paddle-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(rawBody, WEBHOOK_SECRET, signature);
  } catch (err) {
    console.error("Paddle webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!event) {
    return NextResponse.json({ error: "Unrecognized event" }, { status: 400 });
  }

  const supabase = serviceClient();

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionTrialing: {
      const sub = event.data;

      const priceId = sub.items?.[0]?.price?.id;
      const plan = priceId ? getPlanByPriceId(priceId) : undefined;

      // Resolve which org/user this subscription belongs to. New
      // subscriptions (including trials) arrive with an axis_checkout_token
      // in custom_data that correlates to a checkout session. Plan changes
      // and other updates to an existing subscription carry no token, so
      // fall back to the row we already track by paddle_subscription_id.
      let orgId: string | null = null;
      let userId: string | null = null;

      const checkoutToken = sub.customData?.axis_checkout_token as string | undefined;
      if (checkoutToken) {
        const tokenHash = createHash("sha256").update(checkoutToken).digest("hex");
        const { data: checkoutSession } = await supabase
          .from("paddle_checkout_sessions")
          .select("org_id, user_id, expires_at")
          .eq("token_hash", tokenHash)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        if (!checkoutSession) {
          console.error(`Paddle subscription ${sub.id} has an invalid checkout token`);
          return NextResponse.json({ error: "Invalid checkout correlation" }, { status: 400 });
        }
        orgId = checkoutSession.org_id;
        userId = checkoutSession.user_id;
      } else {
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("org_id, user_id")
          .eq("paddle_subscription_id", sub.id)
          .maybeSingle();
        if (!existing?.org_id || !existing.user_id) {
          console.error(
            `Paddle subscription ${sub.id} has no checkout token and no tracked row to update; skipping`
          );
          return NextResponse.json({ error: "Missing checkout correlation" }, { status: 400 });
        }
        orgId = existing.org_id;
        userId = existing.user_id;
      }

      await supabase
        .from("subscriptions")
        .delete()
        .eq("org_id", orgId)
        .like("paddle_subscription_id", "trial-%");

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          org_id: orgId,
          paddle_subscription_id: sub.id,
          paddle_customer_id: sub.customerId,
          paddle_price_id: priceId ?? "",
          plan_id: plan?.id ?? "unknown",
          status: sub.status,
          current_period_start: sub.currentBillingPeriod?.startsAt ?? null,
          current_period_end: sub.currentBillingPeriod?.endsAt ?? null,
          trial_ends_at:
            sub.status === "trialing" ? sub.currentBillingPeriod?.endsAt ?? null : null,
          cancel_at_period_end: sub.scheduledChange?.action === "cancel",
          cancel_at: sub.scheduledChange?.action === "cancel" ? sub.scheduledChange.effectiveAt : null,
        },
        { onConflict: "paddle_subscription_id" }
      );

      if (error) {
        console.error("Failed to upsert subscription", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      break;
    }

    case EventName.SubscriptionCanceled: {
      const sub = event.data;
      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          cancel_at_period_end: false,
          canceled_at: new Date().toISOString(),
        })
        .eq("paddle_subscription_id", sub.id);

      if (error) {
        console.error("Failed to mark subscription canceled", error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      break;
    }

    default:
      // Ignore event types we don't act on (transaction.*, customer.*, etc).
      break;
  }

  return NextResponse.json({ received: true });
}
