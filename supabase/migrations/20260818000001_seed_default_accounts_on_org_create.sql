-- Every organisation created via create_new_organisation() previously had
-- zero accounts, which meant any form referencing an account (Journal
-- Entry, Bank Account) rendered its Account dropdown with no options — the
-- dialog would open, show its title, but have nothing usable inside it.
-- This wasn't a rendering bug; it was missing seed data. Real accounting
-- software always ships a starter Chart of Accounts for exactly this
-- reason. This migration makes org creation atomically seed one.

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
