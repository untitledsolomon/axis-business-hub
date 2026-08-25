-- journal_entry_lines inherits organisation scope through journal_entries.
-- Keep line-level edits visible because changing lines can be the only mutation
-- when an existing journal entry is edited.
DROP TRIGGER IF EXISTS audit_journal_entry_lines ON journal_entry_lines;

CREATE OR REPLACE FUNCTION audit_journal_entry_line() RETURNS TRIGGER AS $$
DECLARE
  current_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT org_id INTO current_org_id FROM journal_entries WHERE id = OLD.journal_entry_id;
    INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
    VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  SELECT org_id INTO current_org_id FROM journal_entries WHERE id = NEW.journal_entry_id;
  INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_journal_entry_lines
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION audit_journal_entry_line();