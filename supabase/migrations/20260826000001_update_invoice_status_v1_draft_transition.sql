-- fix_update_invoice_status_v1_draft_transition
-- Created: 2026-08-26
--
-- Problem: create_invoice_v1 (20260826000000) now posts the debit-AR/
-- credit-revenue accrual entry at creation time, but only if the invoice
-- isn't created as 'draft'. update_invoice_status_v1 was written on the
-- prior (now false) assumption that draft->sent/viewed/partial/overdue has
-- "no ledger impact" — it's a bare status write. So an invoice created as
-- draft (the form's default) and later sent via "Send to Client" (which
-- calls this same RPC, see send-invoice-email) or manually marked sent
-- never gets its accrual entry posted at all. It silently falls back into
-- the same "AR only ever credited, never debited" bug this whole fix chain
-- exists to close.
--
-- Fix: when the status transition takes an invoice OUT of 'draft' for the
-- first time (i.e. current status is 'draft' and no journal entry already
-- exists for this invoice's reference), post the same debit-AR/credit-
-- revenue entry create_invoice_v1 would have posted at creation. Subsequent
-- transitions between sent/viewed/partial/overdue are pure status writes,
-- same as before — the entry only posts once, on the draft exit.

CREATE OR REPLACE FUNCTION update_invoice_status_v1(
    p_org_id UUID,
    p_invoice_id UUID,
    p_status TEXT,
    p_revenue_account_id UUID DEFAULT NULL
) RETURNS invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice invoices;
    v_was_draft BOOLEAN;
    v_ar_account_id UUID;
    v_revenue_account_id UUID;
    v_entry_id UUID;
    v_already_posted BOOLEAN;
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

    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND org_id = p_org_id FOR UPDATE;
    IF v_invoice IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in this organisation';
    END IF;

    v_was_draft := (v_invoice.status = 'draft');

    UPDATE invoices
    SET status = p_status::invoice_status, updated_at = NOW()
    WHERE id = p_invoice_id AND org_id = p_org_id
    RETURNING * INTO v_invoice;

    -- Post the accrual entry exactly once, the first time this invoice
    -- leaves draft. Guard on an existing entry (by reference) too, in case
    -- of a retry/race, so we never double-post.
    IF v_was_draft AND p_status != 'draft' AND v_invoice.grand_total > 0 THEN
        SELECT EXISTS (
            SELECT 1 FROM journal_entries
            WHERE org_id = p_org_id AND reference = v_invoice.invoice_number
        ) INTO v_already_posted;

        IF NOT v_already_posted THEN
            SELECT id INTO v_ar_account_id
            FROM accounts
            WHERE org_id = p_org_id AND category = 'asset' AND name = 'Accounts Receivable'
            LIMIT 1;

            IF v_ar_account_id IS NULL THEN
                RAISE EXCEPTION 'No Accounts Receivable account found for this organisation — add one in Chart of Accounts first';
            END IF;

            v_revenue_account_id := p_revenue_account_id;
            IF v_revenue_account_id IS NULL THEN
                SELECT id INTO v_revenue_account_id
                FROM accounts
                WHERE org_id = p_org_id AND category = 'revenue' AND name = 'Sales Revenue'
                LIMIT 1;
            END IF;

            IF v_revenue_account_id IS NULL THEN
                RAISE EXCEPTION 'No revenue account found for this organisation — add one in Chart of Accounts first';
            END IF;

            INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
            VALUES (
                p_org_id,
                v_invoice.issue_date,
                v_invoice.invoice_number,
                'Invoice ' || v_invoice.invoice_number || ' issued',
                'posted',
                auth.uid()
            )
            RETURNING id INTO v_entry_id;

            INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
            VALUES
                (v_entry_id, v_ar_account_id, v_invoice.grand_total, 0, 'Invoice ' || v_invoice.invoice_number || ' — AR'),
                (v_entry_id, v_revenue_account_id, 0, v_invoice.grand_total, 'Invoice ' || v_invoice.invoice_number || ' — revenue');
        END IF;
    END IF;

    RETURN v_invoice;
END;
$$;
