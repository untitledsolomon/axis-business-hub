-- Clients and Invoicing Migration
-- Created: 2026-04-20

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE client_type AS ENUM ('individual', 'company');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE client_status AS ENUM ('active', 'inactive', 'blocked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'voided');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    company_name TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    type client_type NOT NULL DEFAULT 'company',
    status client_status NOT NULL DEFAULT 'active',
    currency TEXT NOT NULL DEFAULT 'UGX',
    payment_terms TEXT, -- e.g., 'Net 30'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    subtotal BIGINT NOT NULL DEFAULT 0,
    tax_total BIGINT NOT NULL DEFAULT 0,
    discount_total BIGINT NOT NULL DEFAULT 0,
    grand_total BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'UGX',
    exchange_rate NUMERIC DEFAULT 1.0,
    notes TEXT,
    payment_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, invoice_number)
);

-- 4. Invoice Items Table
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL DEFAULT 0, -- Stored in cents
    tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
    discount_amount BIGINT DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RLS Policies

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org clients" ON clients
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = clients.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org clients" ON clients
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = clients.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org invoices" ON invoices
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = invoices.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org invoices" ON invoices
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = invoices.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org invoice items" ON invoice_items
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = invoice_items.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org invoice items" ON invoice_items
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = invoice_items.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

-- 6. Audit Triggers

CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_invoice_items
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 7. Helper: Auto-increment invoice number per org (simplified)
CREATE OR REPLACE FUNCTION get_next_invoice_number(p_org_id UUID) RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '[0-9]+')::INTEGER), 0) + 1
    INTO next_num
    FROM invoices
    WHERE org_id = p_org_id;

    RETURN 'INV-' || TO_CHAR(next_num, 'FM000');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
