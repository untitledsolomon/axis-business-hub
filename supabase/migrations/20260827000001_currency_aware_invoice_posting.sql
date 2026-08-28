-- currency_aware_invoice_posting
-- Created: 2026-08-27
--
-- Problem 1 (dashboard double-count): the dashboard was summing invoice
-- revenue from `invoices.grand_total` directly AND again from the journal
-- entry that update_invoice_status_v1's draft-exit accrual posts for that
-- same invoice — that's a client-side fix (hooks/dashboard/use-dashboard-
-- summary.ts), not a schema issue, and is already corrected there.
--
-- Problem 2 (this migration): update_invoice_status_v1 and
-- mark_invoice_paid_v1 post v_invoice.grand_total straight into
-- journal_entry_lines with zero currency conversion. journal_entries has no
-- currency column of its own — every line is implicitly assumed to be in
-- the org's base_currency. That's fine while every invoice is issued in the
-- org's own currency, but breaks the moment an invoice is billed in a
-- different currency (e.g. a Trevix client in South Sudan invoiced in USD
-- or SSP while Trevix's base_currency is UGX): the raw USD-minor-unit
-- number would be posted into the ledger as if it were UGX, corrupting
-- Accounts Receivable, revenue, and every downstream report.
--
-- Fix: both RPCs now convert grand_total from invoice.currency to the org's
-- base_currency using invoice.exchange_rate (already existed, unused for
-- this) before writing journal_entry_lines. Currency-correct minor-unit
-- conversion (UGX has 0 decimal digits, USD/SSP have 2) is handled by
-- app-side lib/currency.ts for display; here we only need the numeric FX
-- multiplication since both source and target amounts stay in their
-- respective currency's own minor units — the RPC doesn't need to know
-- decimal-digit counts, just the org's base_currency and each invoice's rate.

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
    v_base_currency TEXT;
    v_posted_amount BIGINT;
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

            -- Convert grand_total (in invoice.currency's minor units) to the
            -- org's base_currency minor units before posting. The ledger is
            -- always denominated in base_currency; exchange_rate is "1 unit
            -- of invoice.currency = exchange_rate units of base_currency
            -- major-unit value", matching how it's already documented on
            -- the invoices table and used app-side in lib/currency.ts.
            SELECT base_currency INTO v_base_currency FROM organisations WHERE id = p_org_id;

            IF v_invoice.currency = v_base_currency THEN
                v_posted_amount := v_invoice.grand_total;
            ELSE
                v_posted_amount := ROUND(v_invoice.grand_total * COALESCE(v_invoice.exchange_rate, 1.0));
            END IF;

            INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
            VALUES (
                p_org_id,
                v_invoice.issue_date,
                v_invoice.invoice_number,
                'Invoice ' || v_invoice.invoice_number || ' issued'
                    || CASE WHEN v_invoice.currency != v_base_currency
                        THEN ' (' || v_invoice.currency || ' ' || v_invoice.grand_total || ' @ ' || v_invoice.exchange_rate || ')'
                        ELSE '' END,
                'posted',
                auth.uid()
            )
            RETURNING id INTO v_entry_id;

            INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
            VALUES
                (v_entry_id, v_ar_account_id, v_posted_amount, 0, 'Invoice ' || v_invoice.invoice_number || ' — AR'),
                (v_entry_id, v_revenue_account_id, 0, v_posted_amount, 'Invoice ' || v_invoice.invoice_number || ' — revenue');
        END IF;
    END IF;

    RETURN v_invoice;
END;
$$;

CREATE OR REPLACE FUNCTION mark_invoice_paid_v1(
    p_org_id UUID,
    p_invoice_id UUID,
    p_deposit_account_id UUID,
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
    v_base_currency TEXT;
    v_posted_amount BIGINT;
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

    SELECT id INTO v_ar_account_id
    FROM accounts
    WHERE org_id = p_org_id AND category = 'asset' AND name = 'Accounts Receivable'
    LIMIT 1;

    IF v_ar_account_id IS NULL THEN
        RAISE EXCEPTION 'No Accounts Receivable account found for this organisation — add one in Chart of Accounts first';
    END IF;

    -- Same currency conversion as the accrual entry above — the payment
    -- must clear the same base-currency AR balance the accrual created, or
    -- AR never nets to zero for a foreign-currency invoice.
    SELECT base_currency INTO v_base_currency FROM organisations WHERE id = p_org_id;

    IF v_invoice.currency = v_base_currency THEN
        v_posted_amount := v_invoice.grand_total;
    ELSE
        v_posted_amount := ROUND(v_invoice.grand_total * COALESCE(v_invoice.exchange_rate, 1.0));
    END IF;

    INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
    VALUES (
        p_org_id,
        p_payment_date,
        COALESCE(p_reference, v_invoice.invoice_number),
        'Payment received for invoice ' || v_invoice.invoice_number
            || CASE WHEN v_invoice.currency != v_base_currency
                THEN ' (' || v_invoice.currency || ' ' || v_invoice.grand_total || ' @ ' || v_invoice.exchange_rate || ')'
                ELSE '' END,
        'posted',
        auth.uid()
    )
    RETURNING id INTO v_journal_entry_id;

    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
    VALUES
        (v_journal_entry_id, p_deposit_account_id, v_posted_amount, 0, 'Payment received — ' || v_invoice.invoice_number),
        (v_journal_entry_id, v_ar_account_id, 0, v_posted_amount, 'Clear AR — ' || v_invoice.invoice_number);

    UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = p_invoice_id;

    RETURN v_journal_entry_id;
END;
$$;
