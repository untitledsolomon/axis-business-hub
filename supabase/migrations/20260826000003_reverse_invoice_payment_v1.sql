-- reverse_invoice_payment_v1
-- Created: 2026-08-26
--
-- Problem: mark_invoice_paid_v1 has no counterpart. If a payment is
-- recorded against the wrong deposit account, the wrong amount, or on the
-- wrong invoice entirely, there was no way to correct it — void_invoice_v1
-- explicitly refuses to touch a 'paid' invoice ("this would leave the
-- ledger inconsistent"), and there's no unmark/undo action anywhere. The
-- only fix was a manual SQL correction, which is what fixing Trevix's
-- misposted expense required — that shouldn't be the normal recovery path
-- for a payment mistake.
--
-- Fix: reverse_invoice_payment_v1 voids the payment journal entry (the one
-- mark_invoice_paid_v1 posted — debit deposit account, credit AR) and
-- reverts the invoice to 'sent'. The original accrual entry (debit AR,
-- credit revenue, from create_invoice_v1 / update_invoice_status_v1) is
-- untouched — reversing a payment doesn't mean the invoice was never
-- issued, it means the cash didn't actually land the way it was recorded.
-- After reversal, mark_invoice_paid_v1 can be called again with the
-- correct account/amount/date.
--
-- 'sent' is used as the reverted status rather than trying to reconstruct
-- whatever the invoice's status was right before payment (viewed/partial/
-- overdue aren't tracked historically) — it's the safe universal "this is
-- an issued, outstanding invoice" state, and the invoice's own history
-- (due_date vs today) still drives whether it reads as overdue elsewhere.

CREATE OR REPLACE FUNCTION reverse_invoice_payment_v1(
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
    v_payment_entry_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant')
    ) THEN
        RAISE EXCEPTION 'Not authorized to reverse invoice payments for this organisation';
    END IF;

    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id AND org_id = p_org_id FOR UPDATE;
    IF v_invoice IS NULL THEN
        RAISE EXCEPTION 'Invoice not found in this organisation';
    END IF;

    IF v_invoice.status != 'paid' THEN
        RAISE EXCEPTION 'Invoice is not marked as paid — nothing to reverse';
    END IF;

    -- mark_invoice_paid_v1 posts its payment entry with
    -- reference = COALESCE(p_reference, invoice_number) and description
    -- starting with 'Payment received for invoice'. The accrual entry
    -- (create_invoice_v1 / update_invoice_status_v1) shares the same
    -- reference but a different description ('... issued'), so match on
    -- description to void only the payment leg, never the accrual.
    SELECT id INTO v_payment_entry_id
    FROM journal_entries
    WHERE org_id = p_org_id
      AND status = 'posted'
      AND description LIKE 'Payment received for invoice %'
      AND description LIKE '%' || v_invoice.invoice_number || '%'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_payment_entry_id IS NULL THEN
        RAISE EXCEPTION 'Could not find the payment journal entry for this invoice — reverse it manually via the General Ledger';
    END IF;

    UPDATE journal_entries
    SET status = 'void',
        description = COALESCE(description || E'\n', '') || 'Voided: payment reversed'
            || CASE WHEN p_reason IS NOT NULL THEN ' — ' || p_reason ELSE '' END,
        updated_at = NOW()
    WHERE id = v_payment_entry_id;

    UPDATE invoices
    SET status = 'sent',
        notes = COALESCE(notes || E'\n', '') || 'Payment reversed'
            || CASE WHEN p_reason IS NOT NULL THEN ' — ' || p_reason ELSE '' END,
        updated_at = NOW()
    WHERE id = p_invoice_id
    RETURNING * INTO v_invoice;

    RETURN v_invoice;
END;
$$;
