-- Employees Foundation Migration
-- Created: 2026-08-17
-- Scope: UI-first per V1 Roadmap Phase 3 — schema + read access only.
-- No shift/attendance/payroll logic yet; that follows once a specific
-- client (Next Level Store) requirement is confirmed.

-- 1. Enums
CREATE TYPE employee_status AS ENUM ('active', 'on_leave', 'terminated');

-- 2. Employees
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'staff',
    department TEXT,
    status employee_status NOT NULL DEFAULT 'active',
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org employees" ON employees
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = employees.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org employees" ON employees
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = employees.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'hr_manager')));

-- 4. Audit trigger (matches existing convention)
CREATE TRIGGER audit_employees
  AFTER INSERT OR UPDATE OR DELETE ON employees
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();
