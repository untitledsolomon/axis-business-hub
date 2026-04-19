-- Finance Foundation Migration
-- Created: 2026-04-20

-- 1. Enums
CREATE TYPE account_category AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE journal_entry_status AS ENUM ('draft', 'posted', 'void');

-- 2. Accounts (Chart of Accounts)
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category account_category NOT NULL,
    sub_type TEXT, -- e.g., 'Current Asset', 'Fixed Asset', 'Operating Expense'
    currency TEXT NOT NULL DEFAULT 'UGX',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- 3. Tax Rates
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rate NUMERIC NOT NULL, -- e.g., 18.0 for 18%
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Bank Accounts
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id), -- GL Account
    name TEXT NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    currency TEXT NOT NULL DEFAULT 'UGX',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Journal Entries
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    description TEXT,
    status journal_entry_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Journal Entry Lines
CREATE TABLE journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id),
    debit BIGINT NOT NULL DEFAULT 0, -- Stored in cents
    credit BIGINT NOT NULL DEFAULT 0, -- Stored in cents
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS Policies

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org accounts" ON accounts
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = accounts.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org accounts" ON accounts
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = accounts.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

CREATE POLICY "Members can view their org tax rates" ON tax_rates
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = tax_rates.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org tax rates" ON tax_rates
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = tax_rates.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

CREATE POLICY "Members can view their org bank accounts" ON bank_accounts
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = bank_accounts.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org bank accounts" ON bank_accounts
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = bank_accounts.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

CREATE POLICY "Members can view their org journal entries" ON journal_entries
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = journal_entries.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org journal entries" ON journal_entries
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = journal_entries.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

CREATE POLICY "Members can view their org journal entry lines" ON journal_entry_lines
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM journal_entries
        JOIN organisation_members ON organisation_members.org_id = journal_entries.org_id
        WHERE journal_entries.id = journal_entry_lines.journal_entry_id AND organisation_members.user_id = auth.uid()
    ));

-- 8. Audit Triggers

CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_tax_rates
  AFTER INSERT OR UPDATE OR DELETE ON tax_rates
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_bank_accounts
  AFTER INSERT OR UPDATE OR DELETE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- Note: journal_entry_lines might be too noisy for audit log if we already audit journal_entries,
-- but for financial integrity it is better to have it.
CREATE TRIGGER audit_journal_entry_lines
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();
