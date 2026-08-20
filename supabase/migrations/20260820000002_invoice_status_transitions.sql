-- Invoice Status Transitions (Phase 1 completion)
-- Created: 2026-08-20
-- Scope: "Mark as Paid" and "Void Invoice" need to be more than a status
-- flag flip — a paid invoice represents real cash received against
-- Accounts Receivable, and needs a real journal entry posted so the
-- ledger/dashboard/banking balances stay correct. This mirrors the same
-- atomicity pattern as create_journal_entry_v1 and record_stock_movement_v1:
-- the status change and the accounting effect happen in one transaction.

CREATE OR REPLACE FUNCTION mark_invoice_paid_v1(
    p_org_id UUID,
    p_invoice_id UUID,
    p_deposit_account_id UUID, -- bank/cash account the payment landed in
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_reference TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice invoices;
    v_ar_account_id UUID;
    v_journal_entry_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant', 'sales')
    ) THEN
        RAISE EXCEPTION 'Not authorized to update invoices for this organisation';
    END IF;

    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND org_id = p_org_id FOR UPDATE;
    IF v_invoice IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in this organisation';
    END IF;

    IF v_invoice.status = 'paid' THEN
        RAISE EXCEPTION 'Invoice is already marked as paid';
    END IF;

    IF v_invoice.status = 'voided' THEN
        RAISE EXCEPTION 'Cannot mark a voided invoice as paid';
    END IF;

    -- Find (don't assume) the org's Accounts Receivable account by category
    -- + name convention set up by create_new_organisation's seed accounts.
    SELECT id INTO v_ar_account_id
    FROM accounts
    WHERE org_id = p_org_id AND category = 'asset' AND name = 'Accounts Receivable'
    LIMIT 1;

    IF v_ar_account_id IS NULL THEN
        RAISE EXCEPTION 'No Accounts Receivable account found for this organisation — add one in Chart of Accounts first';
    END IF;

    -- Debit the deposit account (cash/bank increases), credit AR (receivable clears).
    INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
    VALUES (
        p_org_id,
        p_payment_date,
        COALESCE(p_reference, v_invoice.invoice_number),
        'Payment received for invoice ' || v_invoice.invoice_number,
        'posted',
        auth.uid()
    )
    RETURNING id INTO v_journal_entry_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES
        (v_journal_entry_id, p_deposit_account_id, v_invoice.grand_total, 0, 'Payment received — ' || v_invoice.invoice_number),
        (v_journal_entry_id, v_ar_account_id, 0, v_invoice.grand_total, 'Clear AR — ' || v_invoice.invoice_number);

    UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = p_invoice_id;

    RETURN v_journal_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION void_invoice_v1(
    p_org_id UUID,
    p_invoice_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice invoices;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant', 'sales')
    ) THEN
        RAISE EXCEPTION 'Not authorized to update invoices for this organisation';
    END IF;

    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND org_id = p_org_id FOR UPDATE;
    IF v_invoice IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in this organisation';
    END IF;

    IF v_invoice.status = 'paid' THEN
        RAISE EXCEPTION 'Cannot void a paid invoice — this would leave the ledger inconsistent. Reverse the payment first if needed.';
    END IF;

    UPDATE invoices
    SET status = 'voided',
        notes = CASE WHEN p_reason IS NOT NULL THEN COALESCE(notes || E'\n', '') || 'Voided: ' || p_reason ELSE notes END,
        updated_at = NOW()
    WHERE id = p_invoice_id
    RETURNING * INTO v_invoice;

    RETURN v_invoice;
END;
$$;

-- Simple status transitions that don't need accounting side-effects
-- (sent/viewed) can go through this general-purpose one instead of a
-- dedicated RPC each, since they're just a status write with an
-- authorization check — no ledger impact.
CREATE OR REPLACE FUNCTION update_invoice_status_v1(
    p_org_id UUID,
    p_invoice_id UUID,
    p_status TEXT
) RETURNS invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice invoices;
BEGIN
    IF p_status NOT IN ('draft', 'sent', 'viewed', 'partial', 'overdue') THEN
        RAISE EXCEPTION 'Use mark_invoice_paid_v1 or void_invoice_v1 for those status transitions';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant', 'sales')
    ) THEN
        RAISE EXCEPTION 'Not authorized to update invoices for this organisation';
    END IF;

    UPDATE invoices
    SET status = p_status::invoice_status, updated_at = NOW()
    WHERE id = p_invoice_id AND org_id = p_org_id
    RETURNING * INTO v_invoice;

    IF v_invoice IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in this organisation';
    END IF;

    RETURN v_invoice;
END;
$$;
