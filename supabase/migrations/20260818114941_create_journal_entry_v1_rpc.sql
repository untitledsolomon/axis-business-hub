-- Placeholder for remote Supabase migration
-- Remote version: 20260818114941
-- Remote name: create_journal_entry_v1_rpc
-- IMPORTANT: Replace this placeholder with the exact SQL from the Supabase project.
-- Suggested ways to obtain the SQL:
-- 1) Locally with supabase CLI (example -- adjust for your CLI version):
--    supabase migrations download --project-ref <PROJECT_REF> --name 'create_journal_entry_v1_rpc' --output 'D:\\Projects\\copilot-worktrees\\axis-business-hub\\dawnagent80-verbose-memory\\supabase\\migrations\20260818114941_create_journal_entry_v1_rpc.sql'
-- 2) From Supabase Studio: Project -> Database -> Migrations -> find the migration and download the SQL.
-- After replacing, commit and push. Do NOT change the filename; Supabase tracks migrations by filename/version.

CREATE OR REPLACE FUNCTION create_journal_entry_v1(
  p_org_id UUID,
  p_entry_date DATE,
  p_reference TEXT,
  p_description TEXT,
  p_status TEXT,
  p_lines JSONB
)
RETURNS UUID AS $$
DECLARE
  new_entry_id UUID;
  line JSONB;
  total_debit BIGINT := 0;
  total_credit BIGINT := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Not authorized to create journal entries for this organisation';
  END IF;

  FOR line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    total_debit := total_debit + COALESCE((line->>'debit')::BIGINT, 0);
    total_credit := total_credit + COALESCE((line->>'credit')::BIGINT, 0);
  END LOOP;

  IF total_debit != total_credit THEN
    RAISE EXCEPTION 'Journal entry is out of balance: debits % do not equal credits %', total_debit, total_credit;
  END IF;

  IF total_debit = 0 THEN
    RAISE EXCEPTION 'Journal entry must have a non-zero amount';
  END IF;

  INSERT INTO journal_entries (org_id, entry_date, reference, description, status, created_by)
  VALUES (p_org_id, p_entry_date, p_reference, p_description, p_status::journal_entry_status, auth.uid())
  RETURNING id INTO new_entry_id;

  INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description)
  SELECT
    new_entry_id,
    (line->>'account_id')::UUID,
    COALESCE((line->>'debit')::BIGINT, 0),
    COALESCE((line->>'credit')::BIGINT, 0),
    line->>'description'
  FROM jsonb_array_elements(p_lines) AS line;

  RETURN new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


