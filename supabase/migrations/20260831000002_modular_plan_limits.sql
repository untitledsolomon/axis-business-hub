-- Modular plan limits system.
--
-- Two limit shapes are supported:
--   1. COUNTED  - a live row count against a cap (users, chart-of-accounts,
--                 bank accounts). Checked via a live COUNT(*) against the
--                 backing table, so it's always accurate and self-heals if
--                 rows are deleted.
--   2. METERED  - a usage counter that accrues over a billing period and
--                 resets each cycle (e.g. "100 AI audits/month"). Tracked
--                 in plan_usage_counters and incremented explicitly by
--                 whatever feature consumes it.
--
-- Adding a new limit later (counted or metered) means one row in
-- plan_limits plus, for counted limits, one line in the resource-to-table
-- map below and one trigger attachment. No new PL/pgSQL function needed.

-- ---------------------------------------------------------------------
-- 1. Limit definitions per plan
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_limits (
  plan_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  limit_type TEXT NOT NULL CHECK (limit_type IN ('counted', 'metered')),
  max_value INTEGER, -- NULL = unlimited
  period TEXT CHECK (period IN ('billing_cycle', NULL)), -- only meaningful for metered
  PRIMARY KEY (plan_id, resource)
);

INSERT INTO plan_limits (plan_id, resource, limit_type, max_value, period) VALUES
  ('starter',  'users',         'counted', 1,    NULL),
  ('pro',      'users',         'counted', 5,    NULL),
  ('advanced', 'users',         'counted', 20,   NULL),

  ('starter',  'chart_accounts','counted', 100,  NULL),
  ('pro',      'chart_accounts','counted', 250,  NULL),
  ('advanced', 'chart_accounts','counted', 1000, NULL),

  ('starter',  'bank_accounts', 'counted', 1,    NULL),
  ('pro',      'bank_accounts', 'counted', 5,    NULL),
  ('advanced', 'bank_accounts', 'counted', 20,   NULL)
ON CONFLICT (plan_id, resource) DO UPDATE
  SET limit_type = EXCLUDED.limit_type,
      max_value = EXCLUDED.max_value,
      period = EXCLUDED.period;

-- Trial orgs (plan_id = 'starter' via trial_starter) inherit Starter limits
-- automatically since subscriptions.plan_id is already 'starter' during trial.

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan limits are readable by any authenticated user"
  ON plan_limits FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------
-- 2. Metered usage counters (for future limits like "100 AI audits/mo")
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_usage_counters (
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  used_value INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, resource, period_start)
);

ALTER TABLE plan_usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation members can view their usage counters"
  ON plan_usage_counters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organisation_members
      WHERE organisation_members.org_id = plan_usage_counters.org_id
        AND organisation_members.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 3. Resource -> backing table map, for counted resources.
--    New counted resources: add a row here, no function changes needed.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plan_counted_resources (
  resource TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  org_column TEXT NOT NULL DEFAULT 'org_id'
);

INSERT INTO plan_counted_resources (resource, table_name, org_column) VALUES
  ('users',          'organisation_members', 'org_id'),
  ('chart_accounts', 'accounts',             'org_id'),
  ('bank_accounts',  'bank_accounts',        'org_id')
ON CONFLICT (resource) DO UPDATE
  SET table_name = EXCLUDED.table_name,
      org_column = EXCLUDED.org_column;

-- ---------------------------------------------------------------------
-- 4. Current live usage for a counted resource.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_counted_resource_usage(p_org_id UUID, p_resource TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_table TEXT;
  v_org_col TEXT;
  v_count INTEGER;
BEGIN
  SELECT table_name, org_column INTO v_table, v_org_col
  FROM plan_counted_resources WHERE resource = p_resource;

  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Unknown counted resource: %', p_resource;
  END IF;

  EXECUTE format('SELECT COUNT(*) FROM %I WHERE %I = $1', v_table, v_org_col)
    INTO v_count
    USING p_org_id;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION get_counted_resource_usage(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_counted_resource_usage(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. Generic "is there room for one more" check. Works for both
--    counted and metered resources; a NULL max_value always passes
--    (unlimited), and an org with no plan_limits row for a resource
--    always passes (limit not defined = not restricted).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION has_capacity_for(p_org_id UUID, p_resource TEXT, p_increment INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_plan_id TEXT;
  v_limit_type TEXT;
  v_max INTEGER;
  v_current INTEGER;
BEGIN
  SELECT s.plan_id INTO v_plan_id
  FROM subscriptions s
  WHERE s.org_id = p_org_id
    AND s.status IN ('trialing', 'active')
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_plan_id IS NULL THEN
    RETURN false; -- no active/trialing subscription at all
  END IF;

  SELECT limit_type, max_value INTO v_limit_type, v_max
  FROM plan_limits
  WHERE plan_id = v_plan_id AND resource = p_resource;

  IF v_limit_type IS NULL THEN
    RETURN true; -- resource has no configured limit for this plan
  END IF;

  IF v_max IS NULL THEN
    RETURN true; -- explicitly unlimited
  END IF;

  IF v_limit_type = 'counted' THEN
    v_current := get_counted_resource_usage(p_org_id, p_resource);
  ELSE -- metered
    SELECT COALESCE(used_value, 0) INTO v_current
    FROM plan_usage_counters
    WHERE org_id = p_org_id
      AND resource = p_resource
      AND period_start = date_trunc('month', now());
    v_current := COALESCE(v_current, 0);
  END IF;

  RETURN (v_current + p_increment) <= v_max;
END;
$$;

REVOKE ALL ON FUNCTION has_capacity_for(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_capacity_for(UUID, TEXT, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Consume metered usage (for future features like AI audits).
--    Call this at the point of use, after checking has_capacity_for.
--    Not wired to anything yet since no metered feature exists today.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION consume_metered_usage(p_org_id UUID, p_resource TEXT, p_amount INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
  INSERT INTO plan_usage_counters (org_id, resource, period_start, used_value)
  VALUES (p_org_id, p_resource, date_trunc('month', now()), p_amount)
  ON CONFLICT (org_id, resource, period_start)
  DO UPDATE SET used_value = plan_usage_counters.used_value + p_amount
  RETURNING used_value INTO v_new_value;

  RETURN v_new_value;
END;
$$;

REVOKE ALL ON FUNCTION consume_metered_usage(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_metered_usage(UUID, TEXT, INTEGER) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Wire the three counted limits into inserts on their backing tables.
--    Reuses the plan_counted_resources map so this trigger function
--    never needs editing when a new counted resource is added — only
--    the table needs a trigger attached (step 8).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_counted_resource_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource TEXT;
  v_org_id UUID;
BEGIN
  SELECT resource INTO v_resource
  FROM plan_counted_resources
  WHERE table_name = TG_TABLE_NAME;

  IF v_resource IS NULL THEN
    RAISE EXCEPTION 'enforce_counted_resource_limit attached to unmapped table %', TG_TABLE_NAME;
  END IF;

  v_org_id := (to_jsonb(NEW)->>'org_id')::UUID;

  IF NOT has_capacity_for(v_org_id, v_resource, 1) THEN
    RAISE EXCEPTION 'Plan limit reached for %', v_resource;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organisation_members_limit ON organisation_members;
CREATE TRIGGER trg_organisation_members_limit
  BEFORE INSERT ON organisation_members
  FOR EACH ROW EXECUTE FUNCTION enforce_counted_resource_limit();

DROP TRIGGER IF EXISTS trg_accounts_limit ON accounts;
CREATE TRIGGER trg_accounts_limit
  BEFORE INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION enforce_counted_resource_limit();

DROP TRIGGER IF EXISTS trg_bank_accounts_limit ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_limit
  BEFORE INSERT ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION enforce_counted_resource_limit();

-- ---------------------------------------------------------------------
-- To add a new counted limit later (e.g. "employees" capped per plan):
--   INSERT INTO plan_counted_resources VALUES ('employees', 'employees', 'org_id');
--   INSERT INTO plan_limits VALUES ('pro', 'employees', 'counted', 10, NULL), ...;
--   DROP TRIGGER IF EXISTS trg_employees_limit ON employees;
--   CREATE TRIGGER trg_employees_limit BEFORE INSERT ON employees
--     FOR EACH ROW EXECUTE FUNCTION enforce_counted_resource_limit();
--
-- To add a new metered limit later (e.g. "100 ai_audits/month"):
--   INSERT INTO plan_limits VALUES ('pro', 'ai_audits', 'metered', 100, 'billing_cycle');
--   In application code, before running the audit:
--     const ok = await supabase.rpc('has_capacity_for', { p_org_id, p_resource: 'ai_audits' })
--   After a successful audit:
--     await supabase.rpc('consume_metered_usage', { p_org_id, p_resource: 'ai_audits' })
-- ---------------------------------------------------------------------
