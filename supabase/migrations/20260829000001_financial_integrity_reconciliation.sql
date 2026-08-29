-- Financial integrity reconciliation
-- Created: 2026-08-29
--
-- Exposes the accounting invariants as a database check that can be called by
-- tests, support tooling, or a periodic health check. It reports drift without
-- mutating financial data.

CREATE OR REPLACE FUNCTION has_axis_write_access(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organisation_members m
    JOIN subscriptions s ON s.org_id = m.org_id
    WHERE m.org_id = p_org_id
      AND m.user_id = auth.uid()
      AND s.status IN ('trialing', 'active')
      AND COALESCE(s.current_period_end, s.trial_ends_at, now()) > now()
  );
$$;

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
        OR (p_feature IN ('advanced_reports', 'inventory', 'employees', 'custom_email_domain') AND s.plan_id IN ('pro', 'advanced'))
        OR (p_feature = 'connections' AND s.plan_id = 'advanced')
      )
  );
$$;

REVOKE ALL ON FUNCTION has_axis_feature_access(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_axis_feature_access(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION has_axis_write_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_axis_write_access(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION reconcile_financial_integrity_v1(p_org_id UUID)
RETURNS TABLE (
  issue_type TEXT,
  record_id UUID,
  detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to inspect financial integrity for this organisation';
  END IF;

  RETURN QUERY
  SELECT
    'unbalanced_journal_entry'::TEXT,
    je.id,
    format('Posted entry has debits %s and credits %s',
      COALESCE(SUM(jel.debit), 0),
      COALESCE(SUM(jel.credit), 0))
  FROM journal_entries je
  LEFT JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE je.org_id = p_org_id
    AND je.status = 'posted'
  GROUP BY je.id
  HAVING COALESCE(SUM(jel.debit), 0) <> COALESCE(SUM(jel.credit), 0);

  RETURN QUERY
  SELECT
    'invalid_journal_line'::TEXT,
    jel.journal_entry_id,
    'Posted entry contains a negative amount, both debit and credit, or neither amount'::TEXT
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE je.org_id = p_org_id
    AND je.status = 'posted'
    AND (
      jel.debit < 0
      OR jel.credit < 0
      OR (jel.debit > 0 AND jel.credit > 0)
      OR (jel.debit = 0 AND jel.credit = 0)
    );

  RETURN QUERY
  SELECT
    'wrong_org_account'::TEXT,
    jel.journal_entry_id,
    'Posted entry line points to an account owned by another organisation'::TEXT
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  LEFT JOIN accounts a ON a.id = jel.account_id
  WHERE je.org_id = p_org_id
    AND je.status = 'posted'
    AND (a.id IS NULL OR a.org_id <> p_org_id);

  RETURN QUERY
  SELECT
    'missing_expense_journal_entry'::TEXT,
    e.id,
    'Expense has no linked journal entry'::TEXT
  FROM expenses e
  LEFT JOIN journal_entries je ON je.id = e.journal_entry_id
  WHERE e.org_id = p_org_id
    AND e.journal_entry_id IS NULL;

  RETURN QUERY
  SELECT
    'missing_daily_sale_journal_entry'::TEXT,
    s.id,
    'Daily sale has no linked journal entry'::TEXT
  FROM daily_sales s
  LEFT JOIN journal_entries je ON je.id = s.journal_entry_id
  WHERE s.org_id = p_org_id
    AND s.journal_entry_id IS NULL;

  RETURN QUERY
  SELECT
    'missing_invoice_accrual'::TEXT,
    i.id,
    'Non-draft invoice has no posted journal entry with its invoice reference'::TEXT
  FROM invoices i
  WHERE i.org_id = p_org_id
    AND i.status IN ('sent', 'viewed', 'partial', 'paid', 'overdue')
    AND NOT EXISTS (
      SELECT 1
      FROM journal_entries je
      WHERE je.org_id = i.org_id
        AND je.reference = i.invoice_number
        AND je.status = 'posted'
    );

  RETURN QUERY
  SELECT
    'voided_invoice_has_posted_entry'::TEXT,
    i.id,
    'Voided invoice still has a posted journal entry with its invoice reference'::TEXT
  FROM invoices i
  WHERE i.org_id = p_org_id
    AND i.status = 'voided'
    AND EXISTS (
      SELECT 1
      FROM journal_entries je
      WHERE je.org_id = i.org_id
        AND je.reference = i.invoice_number
        AND je.status = 'posted'
    );
END;
$$;

REVOKE ALL ON FUNCTION reconcile_financial_integrity_v1(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reconcile_financial_integrity_v1(UUID) TO authenticated;

-- Replace the original RPC with database-side line validation. Client-side
-- balance checks are useful for UX, but they cannot be the integrity boundary.
CREATE OR REPLACE FUNCTION create_journal_entry_v1(
  p_org_id UUID,
  p_entry_date DATE,
  p_reference TEXT,
  p_description TEXT,
  p_status TEXT,
  p_lines JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_entry_id UUID;
  line JSONB;
  account_id UUID;
  debit_amount BIGINT;
  credit_amount BIGINT;
  total_debit BIGINT := 0;
  total_credit BIGINT := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Not authorized to create journal entries for this organisation';
  END IF;

  IF NOT has_axis_write_access(p_org_id) THEN
    RAISE EXCEPTION 'Organisation entitlement is read-only or expired';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'Journal entry must contain at least two lines';
  END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    account_id := (line->>'account_id')::UUID;
    debit_amount := COALESCE((line->>'debit')::BIGINT, 0);
    credit_amount := COALESCE((line->>'credit')::BIGINT, 0);

    IF debit_amount < 0 OR credit_amount < 0
       OR (debit_amount > 0 AND credit_amount > 0)
       OR (debit_amount = 0 AND credit_amount = 0) THEN
      RAISE EXCEPTION 'Each journal line must contain exactly one non-negative debit or credit amount';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE id = account_id AND org_id = p_org_id
    ) THEN
      RAISE EXCEPTION 'Journal line account does not belong to this organisation';
    END IF;

    total_debit := total_debit + debit_amount;
    total_credit := total_credit + credit_amount;
  END LOOP;

  IF total_debit <> total_credit THEN
    RAISE EXCEPTION 'Journal entry is out of balance: debits % do not equal credits %', total_debit, total_credit;
  END IF;

  IF total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry must have a non-zero amount';
  END IF;

  INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
  VALUES (p_org_id, p_entry_date, p_reference, p_description, p_status::journal_entry_status, auth.uid())
  RETURNING id INTO new_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  SELECT
    new_entry_id,
    (line_item->>'account_id')::UUID,
    COALESCE((line_item->>'debit')::BIGINT, 0),
    COALESCE((line_item->>'credit')::BIGINT, 0),
    line_item->>'description'
  FROM jsonb_array_elements(p_lines) AS line_item;

  RETURN new_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION create_journal_entry_v1(UUID, DATE, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_journal_entry_v1(UUID, DATE, TEXT, TEXT, TEXT, JSONB) TO authenticated;
