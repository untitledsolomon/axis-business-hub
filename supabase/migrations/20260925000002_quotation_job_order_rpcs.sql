-- RPCs for the quotation -> job order -> delivery workflow:
--   * convert_quotation_to_invoice_v1: turn an accepted quotation into a
--     draft invoice, copying client/items/totals and linking invoices.quotation_id
--     back for traceability. Mirrors the plain-insert shape lib/invoicing's
--     createInvoice() uses client-side (no create_invoice_v1 accrual-posting
--     function exists in this migration history to build on) — the invoice
--     is created as 'draft', so the existing draft-exit accrual logic in
--     update_invoice_status_v1 posts the ledger entry the normal way once
--     it's later sent/marked paid, same as any other invoice.
--   * create_job_order_v1: create a job order directly (no prior quotation
--     required, per design) using the org's default status.
--   * update_job_order_status_v1: move a job order to a different
--     org-configured status, validating the status belongs to this org.

CREATE OR REPLACE FUNCTION convert_quotation_to_invoice_v1(
    p_org_id UUID,
    p_quotation_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quotation quotations;
    v_new_invoice_id UUID;
    v_invoice_number TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant', 'sales')
    ) THEN
        RAISE EXCEPTION 'Not authorized to convert quotations for this organisation';
    END IF;

    SELECT * INTO v_quotation FROM quotations WHERE id = p_quotation_id AND org_id = p_org_id FOR UPDATE;
    IF v_quotation IS NULL THEN
        RAISE EXCEPTION 'Quotation not found in this organisation';
    END IF;

    IF v_quotation.converted_invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'This quotation has already been converted to invoice %', v_quotation.converted_invoice_id;
    END IF;

    v_invoice_number := get_next_invoice_number(p_org_id);

    INSERT INTO invoices (
        org_id, client_id, invoice_number, issue_date, due_date, status,
        subtotal, tax_total, discount_total, grand_total, currency, exchange_rate,
        notes, quotation_id
    )
    VALUES (
        p_org_id, v_quotation.client_id, v_invoice_number, CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days', 'draft',
        v_quotation.subtotal, v_quotation.tax_total, v_quotation.discount_total, v_quotation.grand_total,
        v_quotation.currency, v_quotation.exchange_rate,
        v_quotation.notes, p_quotation_id
    )
    RETURNING id INTO v_new_invoice_id;

    INSERT INTO invoice_items (org_id, invoice_id, description, quantity, unit_price, tax_rate_id, discount_amount, total)
    SELECT p_org_id, v_new_invoice_id, description, quantity, unit_price, tax_rate_id, discount_amount, total
    FROM quotation_items
    WHERE quotation_id = p_quotation_id;

    UPDATE quotations
    SET status = 'converted', converted_invoice_id = v_new_invoice_id, updated_at = NOW()
    WHERE id = p_quotation_id AND org_id = p_org_id;

    RETURN v_new_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION convert_quotation_to_invoice_v1(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION convert_quotation_to_invoice_v1(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION create_job_order_v1(
    p_org_id UUID,
    p_client_id UUID,
    p_description TEXT,
    p_quantity NUMERIC,
    p_currency TEXT DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_quotation_id UUID DEFAULT NULL,
    p_status_id UUID DEFAULT NULL
) RETURNS job_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_order job_orders;
    v_status_id UUID;
    v_job_order_number TEXT;
    v_org_currency TEXT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant', 'sales')
    ) THEN
        RAISE EXCEPTION 'Not authorized to create job orders for this organisation';
    END IF;

    v_status_id := p_status_id;
    IF v_status_id IS NULL THEN
        SELECT id INTO v_status_id FROM job_order_statuses WHERE org_id = p_org_id AND is_default LIMIT 1;
    END IF;
    IF v_status_id IS NULL THEN
        RAISE EXCEPTION 'No default job order status configured for this organisation';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM job_order_statuses WHERE id = v_status_id AND org_id = p_org_id) THEN
        RAISE EXCEPTION 'Status does not belong to this organisation';
    END IF;

    IF p_quotation_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM quotations WHERE id = p_quotation_id AND org_id = p_org_id
    ) THEN
        RAISE EXCEPTION 'Quotation does not belong to this organisation';
    END IF;

    SELECT base_currency INTO v_org_currency FROM organisations WHERE id = p_org_id;
    v_job_order_number := get_next_job_order_number(p_org_id);

    INSERT INTO job_orders (
        org_id, client_id, quotation_id, job_order_number, status_id,
        description, quantity, currency, due_date, notes, created_by
    )
    VALUES (
        p_org_id, p_client_id, p_quotation_id, v_job_order_number, v_status_id,
        p_description, p_quantity, COALESCE(p_currency, v_org_currency, 'UGX'), p_due_date, p_notes, auth.uid()
    )
    RETURNING * INTO v_job_order;

    RETURN v_job_order;
END;
$$;

REVOKE ALL ON FUNCTION create_job_order_v1(UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_job_order_v1(UUID, UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION update_job_order_status_v1(
    p_org_id UUID,
    p_job_order_id UUID,
    p_status_id UUID
) RETURNS job_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_job_order job_orders;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'accountant', 'sales')
    ) THEN
        RAISE EXCEPTION 'Not authorized to update job orders for this organisation';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM job_order_statuses WHERE id = p_status_id AND org_id = p_org_id) THEN
        RAISE EXCEPTION 'Status does not belong to this organisation';
    END IF;

    UPDATE job_orders
    SET status_id = p_status_id, updated_at = NOW()
    WHERE id = p_job_order_id AND org_id = p_org_id
    RETURNING * INTO v_job_order;

    IF v_job_order IS NULL THEN
        RAISE EXCEPTION 'Job order not found in this organisation';
    END IF;

    RETURN v_job_order;
END;
$$;

REVOKE ALL ON FUNCTION update_job_order_status_v1(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_job_order_status_v1(UUID, UUID, UUID) TO authenticated;
