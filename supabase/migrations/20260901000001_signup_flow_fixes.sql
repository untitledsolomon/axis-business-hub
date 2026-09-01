-- Signup Flow Critical Fixes
-- Created: 2026-09-01
--
-- ISSUE: "Plan limit reached for users" error on org creation breaks signup.
-- ROOT CAUSE: Subscription inserted AFTER member, so capacity check finds no plan.
-- FIX: Move subscription insert BEFORE member insert in create_new_organisation.

-- Ensure the corrected function is in place for all future deployments.
-- This also fixes the trigger to allow org creators even at "zero capacity"
-- by skipping limit checks for single-org-owner scenarios.

-- Step 1: Harden has_capacity_for to never reject an org's first member.
-- (An org creator/owner must always be able to join their own org during creation.)
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
  v_current_member_count INTEGER;
BEGIN
  SELECT s.plan_id INTO v_plan_id
  FROM subscriptions s
  WHERE s.org_id = p_org_id
    AND s.status IN ('trialing', 'active')
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- Special case: if no subscription exists but we're adding the first member,
  -- allow it (the subscription should have just been created, this is bootstrap).
  -- For any other resource, if no subscription, deny.
  IF v_plan_id IS NULL THEN
    IF p_resource = 'users' THEN
      v_current_member_count := get_counted_resource_usage(p_org_id, 'users');
      IF v_current_member_count = 0 THEN
        RETURN true; -- Allow the org creator to join
      END IF;
    END IF;
    RETURN false; -- no active/trialing subscription and not bootstrap scenario
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

-- Step 2: Ensure create_new_organisation always creates subscription before members.
-- (This is the definitive version; earlier migrations may be overridden here.)
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

  -- CRITICAL: Insert subscription FIRST so capacity checks in the next insert pass.
  -- New organisations start on a free 7-day Starter trial immediately.
  INSERT INTO subscriptions (
    user_id, org_id, paddle_subscription_id, paddle_customer_id,
    paddle_price_id, plan_id, status, trial_ends_at, current_period_end
  ) VALUES (
    user_id, new_org_id, 'trial-' || new_org_id::TEXT,
    'trial-customer-' || new_org_id::TEXT, 'trial_starter', 'starter',
    'trialing', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days'
  );

  -- Now add the owner as a member. The subscription above means capacity checks pass.
  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (new_org_id, user_id, 'owner');

  -- Seed default chart of accounts so forms have options immediately
  INSERT INTO accounts (org_id, code, name, category, sub_type, currency, is_active) VALUES
    (new_org_id, '1000', 'Cash', 'asset', 'Current Asset', 'UGX', true),
    (new_org_id, '1010', 'Bank Account', 'asset', 'Current Asset', 'UGX', true),
    (new_org_id, '1200', 'Accounts Receivable', 'asset', 'Current Asset', 'UGX', true),
    (new_org_id, '2000', 'Accounts Payable', 'liability', 'Current Liability', 'UGX', true),
    (new_org_id, '3000', 'Owner''s Equity', 'equity', 'Equity', 'UGX', true),
    (new_org_id, '4000', 'Sales Revenue', 'revenue', 'Operating Revenue', 'UGX', true),
    (new_org_id, '4010', 'Service Revenue', 'revenue', 'Operating Revenue', 'UGX', true),
    (new_org_id, '5000', 'Rent Expense', 'expense', 'Operating Expense', 'UGX', true),
    (new_org_id, '5010', 'Salaries Expense', 'expense', 'Operating Expense', 'UGX', true),
    (new_org_id, '5020', 'Utilities Expense', 'expense', 'Operating Expense', 'UGX', true),
    (new_org_id, '5030', 'General Expense', 'expense', 'Operating Expense', 'UGX', true);

  RETURN new_org_id;
END;
$$;

-- Step 3: Log this fix for debugging
COMMENT ON FUNCTION create_new_organisation IS 
  'Creates org with trial subscription BEFORE adding member.
   Ensures capacity checks always pass for org creators.
   Fixed: 2026-09-01 to resolve "plan limit reached for users" on signup.';
