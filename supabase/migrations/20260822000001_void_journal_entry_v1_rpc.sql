-- The Transactions page's "Void Transaction" menu item had no backing
-- function — it was a dead DropdownMenuItem with no onSelect at all. This
-- adds void_journal_entry_v1, mirroring the void_invoice_v1 pattern already
-- established in 20260820000002_invoice_status_transitions.sql: soft-void
-- (never hard-delete a posted financial record), authorization re-checked
-- explicitly since SECURITY DEFINER bypasses journal_entries' own RLS.

CREATE OR REPLACE FUNCTION void_journal_entry_v1(
    p_org_id UUID,
    p_entry_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS journal_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entry journal_entries;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant')
    ) THEN
        RAISE EXCEPTION 'Not authorized to void journal entries for this organisation';
    END IF;

    SELECT * INTO v_entry FROM journal_entries
    WHERE id = p_entry_id AND org_id = p_org_id
    FOR UPDATE;

    IF v_entry IS NULL THEN
        RAISE EXCEPTION 'Journal entry not found in this organisation';
    END IF;

    IF v_entry.status = 'void' THEN
        RAISE EXCEPTION 'This entry is already void';
    END IF;

    -- Voiding leaves the entry and its lines on record (financial audit
    -- trail must never disappear) but flips status so it stops counting
    -- toward Transactions/Ledger/Banking totals, dashboard aggregates, and
    -- account running balances, all of which filter or classify by status.
    UPDATE journal_entries
    SET status = 'void',
        description = CASE
          WHEN p_reason IS NOT NULL THEN COALESCE(description || E'\n', '') || 'Voided: ' || p_reason
          ELSE description
        END,
        updated_at = NOW()
    WHERE id = p_entry_id
    RETURNING * INTO v_entry;

    RETURN v_entry;
END;
$$;
