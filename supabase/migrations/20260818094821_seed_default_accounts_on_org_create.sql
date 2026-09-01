-- Placeholder for remote Supabase migration
-- Remote version: 20260818094821
-- Remote name: seed_default_accounts_on_org_create
-- IMPORTANT: Replace this placeholder with the exact SQL from the Supabase project.
-- Suggested ways to obtain the SQL:
-- 1) Locally with supabase CLI (example -- adjust for your CLI version):
--    supabase migrations download --project-ref <PROJECT_REF> --name 'seed_default_accounts_on_org_create' --output 'D:\\Projects\\copilot-worktrees\\axis-business-hub\\dawnagent80-verbose-memory\\supabase\\migrations\20260818094821_seed_default_accounts_on_org_create.sql'
-- 2) From Supabase Studio: Project -> Database -> Migrations -> find the migration and download the SQL.
-- After replacing, commit and push. Do NOT change the filename; Supabase tracks migrations by filename/version.

CREATE OR REPLACE FUNCTION create_new_organisation(org_name TEXT, org_slug TEXT, user_id UUID)
RETURNS UUID AS $$
DECLARE
    new_org_id UUID;
BEGIN
    INSERT INTO organisations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO new_org_id;

    INSERT INTO organisation_members (org_id, user_id, role)
    VALUES (new_org_id, user_id, 'owner');

    INSERT INTO accounts (org_id, code, name, category, sub_type, currency, is_active) VALUES
        (new_org_id, '1000', 'Cash', 'asset', 'Current Asset', 'UGX', true),
        (new_org_id, '1010', 'Bank Account', 'asset', 'Current Asset', 'UGX', true),
        (new_org_id, '1200', 'Accounts Receivable', 'asset', 'Current Asset', 'UGX', true),
        (new_org_id, '2000', 'Accounts Payable', 'liability', 'Current Liability', 'UGX', true),
        (new_org_id, '3000', 'Owner''s Equity', 'equity', 'Equity', 'UGX', true),
        (new_org_id, '4000', 'Sales Revenue', 'revenue', 'Operating Revenue', 'UGX', true),
        (new_org_id, '4010', 'Service Revenue', 'revenue', 'Operating Revenue', 'UGX', true),
        (new_org_id, '5000', 'Rent Expense', 'expense', 'Operating Expense', 'UGX', true),
        (new_org_id, '5010', 'Salaries Expense', 'expense', 'Operating Expense', 'UGX', true),
        (new_org_id, '5020', 'Utilities Expense', 'expense', 'Operating Expense', 'UGX', true),
        (new_org_id, '5030', 'General Expense', 'expense', 'Operating Expense', 'UGX', true);

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


