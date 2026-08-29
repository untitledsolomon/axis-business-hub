-- Enforce read-only expiry at the database boundary.
-- Client-side controls improve UX, but triggers protect direct table writes and
-- SECURITY DEFINER RPCs consistently across every accounting module.

CREATE OR REPLACE FUNCTION enforce_axis_write_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_org_id UUID;
BEGIN
  record_org_id := COALESCE(
    (to_jsonb(NEW)->>'org_id')::UUID,
    (to_jsonb(OLD)->>'org_id')::UUID
  );

  IF record_org_id IS NULL OR NOT has_axis_write_access(record_org_id) THEN
    RAISE EXCEPTION 'Organisation entitlement is read-only or expired';
  END IF;

  IF TG_TABLE_NAME IN ('items', 'item_movements')
     AND NOT has_axis_feature_access(record_org_id, 'inventory') THEN
    RAISE EXCEPTION 'Inventory requires a Pro or Advanced plan';
  ELSIF TG_TABLE_NAME IN ('employees', 'employee_shifts', 'employee_attendance')
     AND NOT has_axis_feature_access(record_org_id, 'employees') THEN
    RAISE EXCEPTION 'People management requires a Pro or Advanced plan';
    ELSIF TG_TABLE_NAME = 'connections'
      AND COALESCE(to_jsonb(NEW)->>'provider', to_jsonb(OLD)->>'provider') <> 'resend'
     AND NOT has_axis_feature_access(record_org_id, 'connections') THEN
    RAISE EXCEPTION 'Connections require an Advanced plan';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_axis_line_write_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT org_id INTO record_org_id
    FROM journal_entries
    WHERE id = OLD.journal_entry_id;
  ELSE
    SELECT org_id INTO record_org_id
    FROM journal_entries
    WHERE id = NEW.journal_entry_id;
  END IF;

  IF record_org_id IS NULL OR NOT has_axis_write_access(record_org_id) THEN
    RAISE EXCEPTION 'Organisation entitlement is read-only or expired';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'clients', 'invoices', 'invoice_items', 'accounts', 'tax_rates',
    'bank_accounts', 'journal_entries', 'expenses', 'daily_sales', 'items',
    'item_movements', 'employees', 'employee_shifts', 'employee_attendance'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_entitlement_write ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_entitlement_write BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_axis_write_access()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_entry_lines_entitlement_write ON journal_entry_lines;
CREATE TRIGGER trg_journal_entry_lines_entitlement_write
  BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION enforce_axis_line_write_access();
