-- HR shift + attendance foundation
-- Scope: phase 3 scheduling + daily attendance tracking

-- 1. Enums
CREATE TYPE employee_shift_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');
CREATE TYPE employee_attendance_status AS ENUM ('scheduled', 'present', 'late', 'absent', 'half_day', 'approved_leave');

-- 2. Shift roster table
CREATE TABLE employee_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type TEXT NOT NULL DEFAULT 'standard',
    status employee_shift_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Attendance table
CREATE TABLE employee_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES employee_shifts(id) ON DELETE SET NULL,
    attendance_date DATE NOT NULL,
    status employee_attendance_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX idx_employee_shifts_org_employee_date
    ON employee_shifts (org_id, employee_id, shift_date);

CREATE INDEX idx_employee_attendance_org_employee_date
    ON employee_attendance (org_id, employee_id, attendance_date);

-- 5. RLS
ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org shifts" ON employee_shifts
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = employee_shifts.org_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage their org shifts" ON employee_shifts
    FOR ALL USING (EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = employee_shifts.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'hr_manager')
    ));

CREATE POLICY "Members can view their org attendance" ON employee_attendance
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = employee_attendance.org_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Admins can manage their org attendance" ON employee_attendance
    FOR ALL USING (EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = employee_attendance.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin', 'hr_manager')
    ));

-- 6. Audit trigger
CREATE TRIGGER audit_employee_shifts
  AFTER INSERT OR UPDATE OR DELETE ON employee_shifts
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_employee_attendance
  AFTER INSERT OR UPDATE OR DELETE ON employee_attendance
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();
