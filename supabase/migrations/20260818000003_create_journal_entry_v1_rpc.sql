-- The frontend (lib/finance/queries.ts, createJournalEntry) calls
-- create_journal_entry_v1 via supabase.rpc(...), but this function was
-- never actually created in any migration — it doesn't exist in the
-- database at all. Every attempt to record a journal entry (including via
-- the Transactions and Ledger "New Journal Entry" dialogs) fails with
-- PGRST202 (function not found), which JournalEntryForm's catch block
-- reduces to a generic "Failed to create journal entry" toast, hiding the
-- real cause.
--
-- This creates the entry and its lines atomically in one transaction, so a
-- journal entry can never be left half-written (e.g. entry created but
-- lines failed, or vice versa) — critical for financial data integrity.

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
  -- SECURITY DEFINER bypasses journal_entries' own RLS policy (which
  -- restricts writes to owner/admin/accountant roles), so that check has
  -- to be re-implemented explicitly here — otherwise any authenticated
  -- user could pass an arbitrary p_org_id and post entries into an
  -- organisation they don't belong to.
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin', 'accountant')
  ) THEN
    RAISE EXCEPTION 'Not authorized to create journal entries for this organisation';
  END IF;

  -- Guard against an unbalanced entry reaching the database even if a
  -- future caller skips the client-side balance check in JournalEntryForm.
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
    (line_item->>'account_id')::UUID,
    COALESCE((line_item->>'debit')::BIGINT, 0),
    COALESCE((line_item->>'credit')::BIGINT, 0),
    line_item->>'description'
  FROM jsonb_array_elements(p_lines) AS line_item;

  RETURN new_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
