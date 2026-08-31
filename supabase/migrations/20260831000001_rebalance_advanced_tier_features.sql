-- Rebalance plan features: employees and custom_email_domain move from
-- Pro to Advanced-only, matching the finalized pricing tiers in
-- lib/paddle-plans.ts (Starter $25, Pro $60, Advanced $120).
--
-- Previously 'employees' and 'custom_email_domain' were granted to both
-- 'pro' and 'advanced' plans. They are now Advanced-exclusive so Advanced
-- has real differentiators beyond the still-unbuilt 'connections' features.

CREATE OR REPLACE FUNCTION has_axis_feature_access(p_org_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    JOIN organisation_members m ON m.org_id = s.org_id AND m.user_id = auth.uid()
    WHERE s.org_id = p_org_id
      AND s.status IN ('trialing', 'active')
      AND COALESCE(s.current_period_end, s.trial_ends_at, now()) > now()
      AND (
        p_feature IN ('clients', 'invoicing', 'finance_core', 'basic_reports')
        OR (p_feature IN ('advanced_reports', 'inventory') AND s.plan_id IN ('pro', 'advanced'))
        OR (p_feature IN ('employees', 'custom_email_domain', 'connections') AND s.plan_id = 'advanced')
      )
  );
$$;

REVOKE ALL ON FUNCTION has_axis_feature_access(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_axis_feature_access(UUID, TEXT) TO authenticated;
