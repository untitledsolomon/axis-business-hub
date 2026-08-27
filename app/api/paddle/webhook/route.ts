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

      const userId = sub.customData?.axis_user_id as string | undefined;
      if (!userId) {
        console.error(
          `Paddle subscription ${sub.id} has no axis_user_id in custom_data; skipping`
        );
        break;
      }

      const priceId = sub.items?.[0]?.price?.id;
      const plan = priceId ? getPlanByPriceId(priceId) : undefined;

      const { error } = await supabase.from("subscriptions").upsert(
        {
          user_id: userId,
          paddle_subscription_id: sub.id,
          paddle_customer_id: sub.customerId,
          paddle_price_id: priceId ?? "",
          plan_id: plan?.id ?? "unknown",
          status: sub.status,
          current_period_start: sub.currentBillingPeriod?.startsAt ?? null,
          current_period_end: sub.currentBillingPeriod?.endsAt ?? null,
          trial_ends_at:
            sub.status === "trialing" ? sub.currentBillingPeriod?.endsAt ?? null : null,
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
