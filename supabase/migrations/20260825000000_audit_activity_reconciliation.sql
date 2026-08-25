DO $$
DECLARE
  table_name TEXT;
  trigger_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['invoices', 'journal_entries', 'journal_entry_lines', 'clients', 'items', 'employees', 'expenses', 'daily_sales'] LOOP
    trigger_name := 'audit_' || table_name;
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', trigger_name, table_name);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION process_audit_log()', trigger_name, table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Members can view fellow profiles" ON profiles;
CREATE POLICY "Members can view fellow profiles" ON profiles
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM organisation_members member
    JOIN organisation_members viewer ON viewer.org_id = member.org_id
    WHERE member.user_id = profiles.id AND viewer.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS audit_log_org_created_at_idx ON audit_log (org_id, created_at DESC);