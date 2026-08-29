-- Expanded analytics reporting for client profitability, cash flow,
-- expense trends, and comparative periods.

CREATE OR REPLACE FUNCTION get_client_profitability_v1(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_limit INT DEFAULT 10
) RETURNS TABLE (
  client_id UUID,
  client_name TEXT,
  invoice_count BIGINT,
  revenue BIGINT,
  collected BIGINT,
  outstanding BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT c.id, c.name, COUNT(i.id),
    COALESCE(SUM(i.grand_total) FILTER (WHERE i.status NOT IN ('draft', 'voided')), 0)::BIGINT,
    COALESCE(SUM(i.grand_total) FILTER (WHERE i.status = 'paid'), 0)::BIGINT,
    COALESCE(SUM(i.grand_total) FILTER (WHERE i.status IN ('sent', 'viewed', 'partial', 'overdue')), 0)::BIGINT
  FROM clients c
  JOIN invoices i ON i.client_id = c.id
  WHERE c.org_id = p_org_id
    AND i.issue_date BETWEEN p_start_date AND p_end_date
    AND i.status NOT IN ('draft', 'voided')
    AND EXISTS (SELECT 1 FROM organisation_members m WHERE m.org_id = p_org_id AND m.user_id = auth.uid())
  GROUP BY c.id, c.name
  ORDER BY revenue DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION get_cash_flow_v1(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  month DATE,
  inflow BIGINT,
  outflow BIGINT,
  net BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH cash_accounts AS (
    SELECT id FROM accounts
    WHERE org_id = p_org_id
      AND category = 'asset'
      AND (name ILIKE '%cash%' OR name ILIKE '%bank%' OR code IN ('1000', '1010'))
  ), monthly AS (
    SELECT DATE_TRUNC('month', je.entry_date)::DATE AS month,
      COALESCE(SUM(l.debit) FILTER (WHERE l.account_id IN (SELECT id FROM cash_accounts)), 0)::BIGINT AS inflow,
      COALESCE(SUM(l.credit) FILTER (WHERE l.account_id IN (SELECT id FROM cash_accounts)), 0)::BIGINT AS outflow
    FROM journal_entries je
    JOIN journal_entry_lines l ON l.journal_entry_id = je.id
    WHERE je.org_id = p_org_id
      AND je.status = 'posted'
      AND je.entry_date BETWEEN p_start_date AND p_end_date
      AND EXISTS (SELECT 1 FROM organisation_members m WHERE m.org_id = p_org_id AND m.user_id = auth.uid())
    GROUP BY DATE_TRUNC('month', je.entry_date)
  )
  SELECT month, inflow, outflow, (inflow - outflow)::BIGINT FROM monthly ORDER BY month;
$$;

CREATE OR REPLACE FUNCTION get_expense_trend_v1(
  p_org_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE (
  month DATE,
  category TEXT,
  total BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT DATE_TRUNC('month', e.expense_date)::DATE, e.category::TEXT, SUM(e.amount)::BIGINT
  FROM expenses e
  WHERE e.org_id = p_org_id
    AND e.expense_date BETWEEN p_start_date AND p_end_date
    AND EXISTS (SELECT 1 FROM organisation_members m WHERE m.org_id = p_org_id AND m.user_id = auth.uid())
  GROUP BY DATE_TRUNC('month', e.expense_date), e.category
  ORDER BY 1, 2;
$$;

CREATE OR REPLACE FUNCTION get_comparative_periods_v1(
  p_org_id UUID,
  p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
  period_key TEXT,
  period_label TEXT,
  revenue BIGINT,
  expenses BIGINT,
  net BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH bounds AS (
    SELECT DATE_TRUNC('month', p_as_of_date)::DATE AS current_start,
      (DATE_TRUNC('month', p_as_of_date) + INTERVAL '1 month')::DATE AS current_end,
      (DATE_TRUNC('month', p_as_of_date) - INTERVAL '1 month')::DATE AS previous_start,
      DATE_TRUNC('month', p_as_of_date)::DATE AS previous_end,
      (DATE_TRUNC('month', p_as_of_date) - INTERVAL '1 year')::DATE AS last_year_start,
      (DATE_TRUNC('month', p_as_of_date) - INTERVAL '1 year' + INTERVAL '1 month')::DATE AS last_year_end
  ), periods AS (
    SELECT 'current'::TEXT AS period_key, 'This month'::TEXT AS period_label, current_start AS start_date, current_end AS end_date FROM bounds
    UNION ALL SELECT 'previous', 'Last month', previous_start, previous_end FROM bounds
    UNION ALL SELECT 'last_year', 'Same month last year', last_year_start, last_year_end FROM bounds
  )
  SELECT p.period_key, p.period_label,
    COALESCE(SUM(CASE WHEN a.category = 'revenue' THEN l.credit - l.debit ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN a.category = 'expense' THEN l.debit - l.credit ELSE 0 END), 0)::BIGINT,
    (COALESCE(SUM(CASE WHEN a.category = 'revenue' THEN l.credit - l.debit ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN a.category = 'expense' THEN l.debit - l.credit ELSE 0 END), 0))::BIGINT
  FROM periods p
  LEFT JOIN journal_entries je ON je.org_id = p_org_id AND je.status = 'posted' AND je.entry_date >= p.start_date AND je.entry_date < p.end_date
  LEFT JOIN journal_entry_lines l ON l.journal_entry_id = je.id
  LEFT JOIN accounts a ON a.id = l.account_id AND a.category IN ('revenue', 'expense')
  WHERE EXISTS (SELECT 1 FROM organisation_members m WHERE m.org_id = p_org_id AND m.user_id = auth.uid())
  GROUP BY p.period_key, p.period_label
  ORDER BY CASE p.period_key WHEN 'current' THEN 1 WHEN 'previous' THEN 2 ELSE 3 END;
$$;

REVOKE ALL ON FUNCTION get_client_profitability_v1(UUID, DATE, DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_cash_flow_v1(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_expense_trend_v1(UUID, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_comparative_periods_v1(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_client_profitability_v1(UUID, DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cash_flow_v1(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_trend_v1(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_comparative_periods_v1(UUID, DATE) TO authenticated;
