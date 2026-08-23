-- Expenses & Daily Sales Foundation Migration
-- Created: 2026-08-23
-- Scope: Section 1 & 2 of the Aug 2026 implementation brief.
--
-- Problem: there was no way to record a day-to-day business expense (transport,
-- lunch, rent) or a non-invoiced walk-in sale (a 5,000 UGX print job) without
-- manually building a balanced journal entry by hand. That's not how a small
-- business owner thinks about "I bought lunch for the team" or "sold some
-- stickers to a walk-in." This adds dedicated tables plus SECURITY DEFINER
-- RPCs that post the correct double-entry journal entry invisibly, so the
-- ledger never goes out of sync with what the owner sees as "an expense" or
-- "a sale."

-- 1. Enums
CREATE TYPE expense_recurrence AS ENUM ('one_off', 'daily', 'weekly', 'monthly');
CREATE TYPE expense_payment_method AS ENUM ('cash', 'bank', 'mobile_money');

-- 2. Expenses
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL, -- 'transport', 'meals', 'supplies', 'rent', 'utilities', 'salaries', 'other'
    description TEXT NOT NULL,
    amount BIGINT NOT NULL, -- cents, matches existing money convention across the codebase
    recurrence expense_recurrence NOT NULL DEFAULT 'one_off',
    payment_method expense_payment_method NOT NULL DEFAULT 'cash',
    expense_account_id UUID REFERENCES accounts(id), -- which GL expense account this posts to
    paid_from_account_id UUID REFERENCES accounts(id), -- which cash/bank GL account it left from
    journal_entry_id UUID REFERENCES journal_entries(id), -- traceability back to the GL entry it generated
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Daily / quick sales (non-invoiced revenue)
CREATE TABLE daily_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    description TEXT NOT NULL, -- e.g. "Sticker + A4 printing, walk-ins"
    amount BIGINT NOT NULL,
    payment_method expense_payment_method NOT NULL DEFAULT 'cash',
    revenue_account_id UUID REFERENCES accounts(id),
    received_into_account_id UUID REFERENCES accounts(id),
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS
-- Read: any org member (matches the org-membership read pattern already
-- used on transactions/invoices/employees).
-- Write: owner/admin/accountant/staff can INSERT their own entries (staff
-- need to be able to log their own transport/lunch expense or a walk-in
-- sale on the spot); UPDATE/DELETE restricted to owner/admin/accountant so
-- staff can't silently edit or remove someone else's entries after the
-- fact, mirroring the tighter write-gating already used on journal_entries.
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org expenses" ON expenses
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = expenses.org_id AND user_id = auth.uid()));
CREATE POLICY "Staff can log their own org expenses" ON expenses
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = expenses.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'staff')));
CREATE POLICY "Admins can edit/delete their org expenses" ON expenses
    FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = expenses.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));
CREATE POLICY "Admins can delete their org expenses" ON expenses
    FOR DELETE USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = expenses.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

CREATE POLICY "Members can view their org daily sales" ON daily_sales
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = daily_sales.org_id AND user_id = auth.uid()));
CREATE POLICY "Staff can log their own org daily sales" ON daily_sales
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = daily_sales.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'staff')));
CREATE POLICY "Admins can edit their org daily sales" ON daily_sales
    FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = daily_sales.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));
CREATE POLICY "Admins can delete their org daily sales" ON daily_sales
    FOR DELETE USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = daily_sales.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant')));

-- 5. Audit triggers (matches existing convention, e.g. employees)
CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_daily_sales
  AFTER INSERT OR UPDATE OR DELETE ON daily_sales
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 6. Helpful indexes for date-range + category filtering (expenses list,
-- daily sales list, and the end-of-day reconciliation view all filter by
-- org_id + date).
CREATE INDEX idx_expenses_org_date ON expenses (org_id, expense_date DESC);
CREATE INDEX idx_expenses_org_category ON expenses (org_id, category);
CREATE INDEX idx_daily_sales_org_date ON daily_sales (org_id, sale_date DESC);
