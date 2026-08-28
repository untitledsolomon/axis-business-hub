-- Organization-owned Paddle billing.
-- Keep user_id during the transition so existing webhook rows remain readable.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS paddle_checkout_sessions (
  token_hash TEXT PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paddle_checkout_sessions_expiry
  ON paddle_checkout_sessions(expires_at);

ALTER TABLE paddle_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_one_current_org
  ON subscriptions(org_id)
  WHERE org_id IS NOT NULL AND status IN ('trialing', 'active', 'past_due', 'paused');

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Organisation members can view subscriptions"
  ON subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM organisation_members
      WHERE organisation_members.org_id = subscriptions.org_id
        AND organisation_members.user_id = auth.uid()
    )
    OR auth.uid() = subscriptions.user_id
  );

CREATE OR REPLACE FUNCTION has_axis_pro_for_org(p_org_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    JOIN organisation_members m ON m.org_id = s.org_id
    WHERE s.org_id = p_org_id
      AND m.user_id = auth.uid()
      AND s.status IN ('trialing', 'active')
      AND s.plan_id IN ('starter', 'pro', 'advanced')
  );
$$;

REVOKE ALL ON FUNCTION has_axis_pro_for_org(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_axis_pro_for_org(UUID) TO authenticated;