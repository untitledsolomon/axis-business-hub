-- Generic organisation integrations foundation
-- Created: 2026-08-29
--
-- Provider-specific values belong in config so Resend and future connections
-- can share this table without another schema migration for every provider.

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'error', 'disabled')),
  verified_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_connections_org_id ON connections(org_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation members can view connections"
  ON connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM organisation_members
      WHERE organisation_members.org_id = connections.org_id
        AND organisation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Organisation admins can manage connections"
  ON connections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM organisation_members
      WHERE organisation_members.org_id = connections.org_id
        AND organisation_members.user_id = auth.uid()
        AND organisation_members.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM organisation_members
      WHERE organisation_members.org_id = connections.org_id
        AND organisation_members.user_id = auth.uid()
        AND organisation_members.role IN ('owner', 'admin')
    )
  );

DROP TRIGGER IF EXISTS trg_connections_updated_at ON connections;
CREATE TRIGGER trg_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- New organisations receive a no-card Starter trial immediately. The
-- synthetic Paddle identifiers are replaced when checkout produces a real
-- subscription webhook.
CREATE OR REPLACE FUNCTION create_new_organisation(org_name TEXT, org_slug TEXT, user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> user_id THEN
    RAISE EXCEPTION 'Not authorized to create an organisation for another user';
  END IF;

  INSERT INTO organisations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Create trial subscription BEFORE adding members so capacity checks pass.
  -- The owner must always be able to join their own org.
  INSERT INTO subscriptions (
    user_id, org_id, paddle_subscription_id, paddle_customer_id,
    paddle_price_id, plan_id, status, trial_ends_at, current_period_end
  ) VALUES (
    user_id, new_org_id, 'trial-' || new_org_id::TEXT,
    'trial-customer-' || new_org_id::TEXT, 'trial_starter', 'starter',
    'trialing', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days'
  );

  -- Now add the user as an owner (capacity check will find the subscription above)
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (new_org_id, user_id, 'owner');

  RETURN new_org_id;
END;
$$;
