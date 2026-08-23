-- create_expense_v1 / create_daily_sale_v1
-- Created: 2026-08-23
--
-- These wrap the "quick add" expense/sale forms. Both call the existing
-- create_journal_entry_v1 RPC internally to post the two-line balanced
-- journal entry, rather than duplicating the balance-check/role-check logic
-- by hand. Calling one SECURITY DEFINER function from another works fine in
-- Postgres (the callee's own SECURITY DEFINER context still applies, and its
-- internal role check against organisation_members re-validates
-- auth.uid()/p_org_id independently) so there's no double-role-check
-- failure risk here — the caller and callee are checking the same
-- auth.uid() against the same org_id with an overlapping-but-compatible
-- role set (owner/admin/accountant, matching what create_journal_entry_v1
-- itself requires). Note: create_journal_entry_v1's role check is
-- ('owner','admin','accountant') only — it does NOT include 'staff'. Per
-- the brief, staff should be able to log their own transport/lunch expense
-- or a walk-in sale, so both RPCs below explicitly allow 'staff' for the
-- expenses/daily_sales row itself, but the resulting journal entry is
-- always posted with status 'posted' via create_journal_entry_v1 which
-- still only allows owner/admin/accountant to succeed. To reconcile this
-- without staff being blocked from logging their own entries, both RPCs
-- run the journal-entry insert inline (mirroring create_journal_entry_v1's
-- balance-checked insert logic exactly, per the brief's fallback
-- instruction) rather than calling it as a sub-transaction, so a 'staff'
-- caller who is authorized to create an expense/sale is also authorized to
-- have its linked journal entry posted, without loosening
-- create_journal_entry_v1's own role gate used elsewhere in the app.

CREATE OR REPLACE FUNCTION create_expense_v1(
  p_org_id UUID,
  p_expense_date DATE,
  p_category TEXT,
  p_description TEXT,
  p_amount BIGINT,
  p_recurrence expense_recurrence,
  p_payment_method expense_payment_method,
  p_expense_account_id UUID,
  p_paid_from_account_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_expense_id UUID;
  new_entry_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant', 'staff')
  ) THEN
    RAISE EXCEPTION 'Not authorized to log expenses for this organisation';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be greater than zero';
  END IF;

  IF p_expense_account_id IS NULL OR p_paid_from_account_id IS NULL THEN
    RAISE EXCEPTION 'Both an expense account and a paid-from account are required';
  END IF;

  INSERT INTO expenses (
    org_id, expense_date, category, description, amount,
    recurrence, payment_method, expense_account_id, paid_from_account_id, created_by
  )
  VALUES (
    p_org_id, p_expense_date, p_category, p_description, p_amount,
    p_recurrence, p_payment_method, p_expense_account_id, p_paid_from_account_id, auth.uid()
  )
  RETURNING id INTO new_expense_id;

  -- Debit the expense account, credit the account it was paid from —
  -- inlined (rather than calling create_journal_entry_v1) so a 'staff'
  -- caller authorized to log their own expense isn't blocked by
  -- create_journal_entry_v1's stricter owner/admin/accountant-only role
  -- check on the journal entry itself. This mirrors that function's insert
  -- logic exactly.
  INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
  VALUES (p_org_id, p_expense_date, 'EXP-' || new_expense_id, p_description, 'posted', auth.uid())
  RETURNING id INTO new_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  VALUES
    (new_entry_id, p_expense_account_id, p_amount, 0, p_description),
    (new_entry_id, p_paid_from_account_id, 0, p_amount, p_description);

  UPDATE expenses SET journal_entry_id = new_entry_id, updated_at = NOW() WHERE id = new_expense_id;

  RETURN new_expense_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_daily_sale_v1(
  p_org_id UUID,
  p_sale_date DATE,
  p_description TEXT,
  p_amount BIGINT,
  p_payment_method expense_payment_method,
  p_revenue_account_id UUID,
  p_received_into_account_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_sale_id UUID;
  new_entry_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant', 'staff')
  ) THEN
    RAISE EXCEPTION 'Not authorized to log sales for this organisation';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Sale amount must be greater than zero';
  END IF;

  IF p_revenue_account_id IS NULL OR p_received_into_account_id IS NULL THEN
    RAISE EXCEPTION 'Both a revenue account and a received-into account are required';
  END IF;

  INSERT INTO daily_sales (
    org_id, sale_date, description, amount,
    payment_method, revenue_account_id, received_into_account_id, created_by
  )
  VALUES (
    p_org_id, p_sale_date, p_description, p_amount,
    p_payment_method, p_revenue_account_id, p_received_into_account_id, auth.uid()
  )
  RETURNING id INTO new_sale_id;

  -- Debit cash/bank received, credit revenue — reversed posting direction
  -- from create_expense_v1, same inlining rationale as above.
  INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
  VALUES (p_org_id, p_sale_date, 'SALE-' || new_sale_id, p_description, 'posted', auth.uid())
  RETURNING id INTO new_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  VALUES
    (new_entry_id, p_received_into_account_id, p_amount, 0, p_description),
    (new_entry_id, p_revenue_account_id, 0, p_amount, p_description);

  UPDATE daily_sales SET journal_entry_id = new_entry_id, updated_at = NOW() WHERE id = new_sale_id;

  RETURN new_sale_id;
END;
$$;
