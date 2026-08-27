-- Paddle Subscriptions
-- Created: 2026-08-27
--
-- Replaces RevenueCat as the source of truth for Axis Pro entitlement.
-- RevenueCat's JS SDK exposed CustomerInfo.entitlements client-side; Paddle
-- has no equivalent client SDK concept, so subscription state is persisted
-- here, written exclusively by the /api/paddle/webhook route (via the
-- service role key) whenever Paddle sends a subscription.* notification.
--
-- One row per Paddle subscription. A user/org can only have one active
-- subscription at a time in the current pricing model (single-seat plans),
-- but the table allows history (cancelled/past_due rows) to remain for
-- audit purposes rather than being overwritten.

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    paddle_subscription_id TEXT NOT NULL UNIQUE,
    paddle_customer_id TEXT NOT NULL,
    paddle_price_id TEXT NOT NULL,

    plan_id TEXT NOT NULL, -- 'starter' | 'pro' | 'advanced'

    -- Mirrors Paddle's subscription.status values directly:
    -- trialing | active | past_due | paused | canceled
    status TEXT NOT NULL,

    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer_id ON subscriptions(paddle_customer_id);

-- Only one row per user is considered "current" for entitlement checks:
-- the most recently updated one. We don't enforce single-row-per-user at
-- the DB level so that historical rows (e.g. after a plan change creates
-- a new Paddle subscription ID) are preserved.

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription rows. All writes happen via the
-- webhook route using the service role key, which bypasses RLS, so there
-- are intentionally no INSERT/UPDATE policies for the anon/authenticated
-- roles here.
CREATE POLICY "Users can view their own subscriptions"
    ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- has_axis_pro_v1
-- Returns true if the given user currently has any subscription in an
-- entitled state (trialing or active). Mirrors the old
-- hasAxisPro(customerInfo) check from lib/revenuecat.ts, but computed
-- from Paddle-sourced data instead of the RevenueCat CustomerInfo object.
-- ============================================================

CREATE OR REPLACE FUNCTION has_axis_pro_v1(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM subscriptions
        WHERE user_id = p_user_id
          AND status IN ('trialing', 'active')
    );
$$;
