-- fix_void_and_delete_ledger_desync
-- Created: 2026-08-26
--
-- Finance audit found three related gaps, all the same shape: an action on
-- a sub-ledger row (expenses, daily_sales, invoices) didn't touch the
-- journal entry it posted, so the sub-ledger and the GL silently drift
-- apart.
--
-- 1. void_invoice_v1 blocks voiding a *paid* invoice (correct — the
--    payment entry stays), but for sent/viewed/partial/overdue invoices —
--    which, since create_invoice_v1 and the update_invoice_status_v1 fix,
--    now carry a real debit-AR/credit-revenue entry — voiding never
--    reversed that entry. AR and revenue stayed permanently inflated by
--    every voided invoice that had already left draft.
--
-- 2. expenses/daily_sales rows can be hard-deleted from the UI
--    (ExpenseDetail/ExpensesList "Delete Expense",
--    DailySaleDetail/DailySalesList equivalent) with zero cleanup of the
--    journal entry the create RPC posted. The GL entry survives forever,
--    permanently overstating that expense/revenue with no way to trace it
--    back once the sub-ledger row is gone.
--
-- Fix: replace the hard deletes with delete_expense_v1 / delete_daily_sale_v1
-- RPCs that void the linked journal entry (soft-void, same as
-- void_journal_entry_v1 — audit trail preserved) before removing the
-- sub-ledger row. void_invoice_v1 now does the same for its own linked
-- entry (matched by reference = invoice_number, same lookup
-- update_invoice_status_v1 uses to avoid double-posting).

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
    v_entry_id UUID;
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

    -- Void the accrual entry too, if this invoice ever left draft and
    -- posted one. Matched by reference the same way update_invoice_status_v1
    -- checks for an existing entry before posting.
    SELECT id INTO v_entry_id
    FROM journal_entries
    WHERE org_id = p_org_id AND reference = v_invoice.invoice_number AND status = 'posted'
    LIMIT 1;

    IF v_entry_id IS NOT NULL THEN
        UPDATE journal_entries
        SET status = 'void',
            description = COALESCE(description || E'\n', '') || 'Voided: invoice ' || v_invoice.invoice_number || ' voided'
                || CASE WHEN p_reason IS NOT NULL THEN ' — ' || p_reason ELSE '' END,
            updated_at = NOW()
        WHERE id = v_entry_id;
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

CREATE OR REPLACE FUNCTION delete_expense_v1(
    p_org_id UUID,
    p_expense_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expense expenses;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant')
    ) THEN
        RAISE EXCEPTION 'Not authorized to delete expenses for this organisation';
    END IF;

    SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id AND org_id = p_org_id;
    IF v_expense IS NULL THEN
        RAISE EXCEPTION 'Expense not found in this organisation';
    END IF;

    IF v_expense.journal_entry_id IS NOT NULL THEN
        UPDATE journal_entries
        SET status = 'void',
            description = COALESCE(description || E'\n', '') || 'Voided: expense deleted',
            updated_at = NOW()
        WHERE id = v_expense.journal_entry_id AND status = 'posted';
    END IF;

    DELETE FROM expenses WHERE id = p_expense_id AND org_id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_daily_sale_v1(
    p_org_id UUID,
    p_sale_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale daily_sales;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant')
    ) THEN
        RAISE EXCEPTION 'Not authorized to delete daily sales for this organisation';
    END IF;

    SELECT * INTO v_sale FROM daily_sales WHERE id = p_sale_id AND org_id = p_org_id;
    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Daily sale not found in this organisation';
    END IF;

    IF v_sale.journal_entry_id IS NOT NULL THEN
        UPDATE journal_entries
        SET status = 'void',
            description = COALESCE(description || E'\n', '') || 'Voided: daily sale deleted',
            updated_at = NOW()
        WHERE id = v_sale.journal_entry_id AND status = 'posted';
    END IF;

    -- Item-linked sales (create_item_sale_v1) decrement stock via
    -- update_item_quantity_v1 when the sale is made. Deleting the sale
    -- without reversing that left inventory permanently short by the
    -- quantity sold, with no trace of why once the sale row was gone.
    IF v_sale.item_id IS NOT NULL AND v_sale.quantity IS NOT NULL AND v_sale.quantity > 0 THEN
        PERFORM update_item_quantity_v1(
            p_org_id,
            v_sale.item_id,
            v_sale.quantity, -- positive: restores the stock the sale removed
            'return',
            'Sale deleted — ' || COALESCE(v_sale.description, p_sale_id::TEXT),
            'Reversed by delete_daily_sale_v1'
        );
    END IF;

    DELETE FROM daily_sales WHERE id = p_sale_id AND org_id = p_org_id;
END;
$$;
