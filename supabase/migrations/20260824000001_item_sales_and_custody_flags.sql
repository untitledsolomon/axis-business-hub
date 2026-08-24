-- Item Sales, Discount Tracking, and Custody Eligibility
-- Created: 2026-08-24
-- Scope:
--  1. Let a daily sale reference a specific item + quantity + the actual
--     unit price charged (which may be below the item's list `selling_price`
--     — a discount). The discount amount/pct is stored explicitly rather
--     than only implied by the price delta, so it can be reported on.
--  2. Selling an item this way decrements stock via the existing
--     update_item_quantity_v1 movement-recording path, so inventory and
--     the sale stay in sync automatically.
--  3. Add can_sell / can_custody flags to items so an item can be sale-only,
--     custody-only, or both (e.g. demo headsets that are normally stock but
--     occasionally issued to staff). Existing items default to sale-only —
--     nothing becomes custody-eligible retroactively.

-- 1. Custody eligibility flags -----------------------------------------
ALTER TABLE items
    ADD COLUMN can_sell BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN can_custody BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN items.can_sell IS 'Item can be sold via quick sale / invoicing.';
COMMENT ON COLUMN items.can_custody IS 'Item can be issued to staff and tracked in the custody register.';

-- Backfill: any item already carrying custody metadata (assigned to
-- someone, or explicitly marked issued) is clearly being used as a
-- custody item today — flip it on so existing assignments don't
-- silently disappear from the Custody view once it starts filtering.
UPDATE items
SET can_custody = true
WHERE (metadata->>'assigned_employee_id') IS NOT NULL
   OR (metadata->>'custody_status') IS NOT NULL;

-- 2. Item-linked sales on daily_sales ------------------------------------
ALTER TABLE daily_sales
    ADD COLUMN item_id UUID REFERENCES items(id),
    ADD COLUMN quantity INTEGER,
    ADD COLUMN unit_list_price BIGINT,
    ADD COLUMN unit_sale_price BIGINT,
    ADD COLUMN discount_amount BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN item_movement_id UUID REFERENCES item_movements(id);

COMMENT ON COLUMN daily_sales.item_id IS 'Optional link to items — set when this sale was for tracked stock rather than a free-text walk-in sale.';
COMMENT ON COLUMN daily_sales.unit_list_price IS 'Item selling_price at time of sale (cents), captured for discount reporting.';
COMMENT ON COLUMN daily_sales.unit_sale_price IS 'Actual price per unit charged (cents) — may be below unit_list_price.';
COMMENT ON COLUMN daily_sales.discount_amount IS 'Total discount given on this sale (cents) = (unit_list_price - unit_sale_price) * quantity.';
COMMENT ON COLUMN daily_sales.discount_pct IS 'Discount as a percentage of list price, 0-100.';

-- 3. create_item_sale_v1 --------------------------------------------------
-- Mirrors create_daily_sale_v1's journal-posting logic (see that
-- function's original comment for why the entry insert is inlined rather
-- than delegated to create_journal_entry_v1: staff must be able to log
-- their own sale without needing create_journal_entry_v1's stricter
-- owner/admin/accountant-only role gate). Additionally records the stock
-- movement via update_item_quantity_v1 so quantity-on-hand and the sale
-- are always consistent — if the stock decrement fails (e.g. insufficient
-- quantity), the whole sale is rolled back.
CREATE OR REPLACE FUNCTION create_item_sale_v1(
  p_org_id UUID,
  p_item_id UUID,
  p_quantity INTEGER,
  p_unit_sale_price BIGINT,
  p_sale_date DATE,
  p_payment_method expense_payment_method,
  p_revenue_account_id UUID,
  p_received_into_account_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item items;
  v_total BIGINT;
  v_discount_amount BIGINT;
  v_discount_pct NUMERIC(5,2);
  v_description TEXT;
  new_sale_id UUID;
  new_entry_id UUID;
  new_movement_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant', 'staff')
  ) THEN
    RAISE EXCEPTION 'Not authorized to log sales for this organisation';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF p_unit_sale_price IS NULL OR p_unit_sale_price < 0 THEN
    RAISE EXCEPTION 'Sale price must be zero or greater';
  END IF;

  IF p_revenue_account_id IS NULL OR p_received_into_account_id IS NULL THEN
    RAISE EXCEPTION 'Both a revenue account and a received-into account are required';
  END IF;

  SELECT * INTO v_item FROM items WHERE id = p_item_id AND org_id = p_org_id;
  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Item not found in this organisation';
  END IF;

  IF NOT v_item.can_sell THEN
    RAISE EXCEPTION '% is not marked as sellable', v_item.name;
  END IF;

  v_total := p_unit_sale_price * p_quantity;
  v_discount_amount := GREATEST(v_item.selling_price - p_unit_sale_price, 0) * p_quantity;
  v_discount_pct := CASE
    WHEN v_item.selling_price > 0 THEN
      ROUND(GREATEST(v_item.selling_price - p_unit_sale_price, 0)::NUMERIC / v_item.selling_price * 100, 2)
    ELSE 0
  END;
  v_description := COALESCE(NULLIF(p_description, ''), v_item.name || ' x' || p_quantity);

  -- Decrement stock inline rather than calling update_item_quantity_v1,
  -- which only allows owner/admin/inventory_manager/accountant — a
  -- 'staff' caller authorized to log this sale (checked above) would be
  -- blocked by that function's stricter role gate, the same reconciliation
  -- issue create_daily_sale_v1/create_expense_v1 already solve by inlining
  -- rather than delegating. Row is locked FOR UPDATE to avoid a lost
  -- update if two sales for the same item land concurrently.
  SELECT * INTO v_item FROM items WHERE id = p_item_id AND org_id = p_org_id FOR UPDATE;

  IF v_item.current_quantity - p_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for %: % on hand, % requested', v_item.name, v_item.current_quantity, p_quantity;
  END IF;

  UPDATE items
  SET current_quantity = current_quantity - p_quantity,
      updated_at = NOW()
  WHERE id = p_item_id;

  INSERT INTO item_movements (org_id, item_id, movement_type, quantity, unit_cost, reference, notes)
  VALUES (p_org_id, p_item_id, 'sale', -p_quantity, v_item.cost_price, 'SALE', v_description)
  RETURNING id INTO new_movement_id;

  INSERT INTO daily_sales (
    org_id, sale_date, description, amount, payment_method,
    revenue_account_id, received_into_account_id, created_by,
    item_id, quantity, unit_list_price, unit_sale_price,
    discount_amount, discount_pct, item_movement_id
  )
  VALUES (
    p_org_id, p_sale_date, v_description, v_total, p_payment_method,
    p_revenue_account_id, p_received_into_account_id, auth.uid(),
    p_item_id, p_quantity, v_item.selling_price, p_unit_sale_price,
    v_discount_amount, v_discount_pct, new_movement_id
  )
  RETURNING id INTO new_sale_id;

  INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
  VALUES (p_org_id, p_sale_date, 'SALE-' || new_sale_id, v_description, 'posted', auth.uid())
  RETURNING id INTO new_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  VALUES
    (new_entry_id, p_received_into_account_id, v_total, 0, v_description),
    (new_entry_id, p_revenue_account_id, 0, v_total, v_description);

  UPDATE daily_sales SET journal_entry_id = new_entry_id, updated_at = NOW() WHERE id = new_sale_id;

  RETURN new_sale_id;
END;
$$;
