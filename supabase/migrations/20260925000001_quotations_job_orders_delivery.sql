-- Order tracking: quotations, job orders (generic core + org-configurable
-- statuses/cost types), and delivery forms.
--
-- Design recap (see project notes):
--   * Quotations follow the same send-to-client pattern as invoices.
--   * Job orders are internal-only; staff can create them directly, with or
--     without a prior quotation. They carry a generic core schema shared by
--     every tenant, plus org-configurable status stages and cost types,
--     since tenants differ by trade (printing vs sewing vs other work).
--   * Invoices get nullable links to quotation_id and job_order_id for
--     full-chain traceability. Invoice usually precedes the job order but
--     can follow it.
--   * Delivery forms are many-to-many against job orders (a client can pick
--     up multiple job orders together, or one job order can be delivered in
--     partial batches).
--   * Cost tracking / margin calc and configurable statuses/cost types are
--     gated to Pro+ (job_costing feature); the quotation -> job order ->
--     delivery workflow itself is available on Starter.

-- ============================================================
-- 1. Enums
-- ============================================================

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'converted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 2. Quotations
-- ============================================================

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    quotation_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,
    status quotation_status NOT NULL DEFAULT 'draft',
    subtotal BIGINT NOT NULL DEFAULT 0,
    tax_total BIGINT NOT NULL DEFAULT 0,
    discount_total BIGINT NOT NULL DEFAULT 0,
    grand_total BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'UGX',
    exchange_rate NUMERIC DEFAULT 1.0,
    notes TEXT,
    terms TEXT,
    converted_invoice_id UUID, -- set when a matching invoice is issued from this quotation
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, quotation_number)
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price BIGINT NOT NULL DEFAULT 0,
    tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
    discount_amount BIGINT DEFAULT 0,
    total BIGINT NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotations_org_id ON quotations(org_id);
CREATE INDEX idx_quotations_client_id ON quotations(client_id);
CREATE INDEX idx_quotations_status ON quotations(org_id, status);
CREATE INDEX idx_quotation_items_quotation_id ON quotation_items(quotation_id);

-- ============================================================
-- 3. Job order status stages (org-configurable, Pro+ editable;
--    every org gets a seeded default list so onboarding stays frictionless)
-- ============================================================

CREATE TABLE job_order_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    key TEXT NOT NULL, -- stable machine key, e.g. 'printing'
    label TEXT NOT NULL, -- display label, e.g. 'Printing'
    color TEXT, -- optional UI accent, e.g. '#6366f1'
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_terminal BOOLEAN NOT NULL DEFAULT false, -- e.g. Delivered / Cancelled
    is_default BOOLEAN NOT NULL DEFAULT false, -- initial status for new job orders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, key)
);

CREATE INDEX idx_job_order_statuses_org_id ON job_order_statuses(org_id, sort_order);

-- Only one default status per org
CREATE UNIQUE INDEX idx_job_order_statuses_one_default
    ON job_order_statuses(org_id) WHERE is_default;

-- ============================================================
-- 4. Job order cost types (org-configurable, Pro+; e.g. blank, DTF,
--    pressing for a printer, or fabric/labour for a tailor)
-- ============================================================

CREATE TABLE job_order_cost_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, key)
);

CREATE INDEX idx_job_order_cost_types_org_id ON job_order_cost_types(org_id, sort_order);

-- ============================================================
-- 5. Job orders (generic core; internal-only; optional quotation link;
--    can be created directly by staff without a prior quotation)
-- ============================================================

CREATE TABLE job_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    job_order_number TEXT NOT NULL,
    status_id UUID NOT NULL REFERENCES job_order_statuses(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    amount_paid BIGINT NOT NULL DEFAULT 0, -- tracked here for shop-floor visibility; ledger stays source of truth via invoices
    currency TEXT NOT NULL DEFAULT 'UGX',
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, job_order_number)
);

CREATE INDEX idx_job_orders_org_id ON job_orders(org_id);
CREATE INDEX idx_job_orders_client_id ON job_orders(client_id);
CREATE INDEX idx_job_orders_quotation_id ON job_orders(quotation_id);
CREATE INDEX idx_job_orders_status_id ON job_orders(status_id);

-- Job order costs: line items against the org's configured cost types,
-- rolling up into a margin calculation. Pro+ only (enforced below).
CREATE TABLE job_order_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    cost_type_id UUID NOT NULL REFERENCES job_order_cost_types(id) ON DELETE RESTRICT,
    amount BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_order_costs_job_order_id ON job_order_costs(job_order_id);
CREATE INDEX idx_job_order_costs_org_id ON job_order_costs(org_id);

-- Status history, for a simple audit trail of the workflow (New -> Paid ->
-- Printing -> Ready -> Delivered, or whatever the org has configured).
CREATE TABLE job_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    from_status_id UUID REFERENCES job_order_statuses(id) ON DELETE SET NULL,
    to_status_id UUID NOT NULL REFERENCES job_order_statuses(id) ON DELETE RESTRICT,
    changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_order_status_history_job_order_id ON job_order_status_history(job_order_id);

-- ============================================================
-- 6. Delivery forms (many-to-many against job orders, since a client can
--    pick up multiple job orders together, or one job order can be
--    delivered across partial batches)
-- ============================================================

CREATE TABLE delivery_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    delivery_number TEXT NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    recipient_name TEXT,
    recipient_signature_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, delivery_number)
);

CREATE TABLE delivery_form_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    delivery_form_id UUID NOT NULL REFERENCES delivery_forms(id) ON DELETE CASCADE,
    job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE RESTRICT,
    quantity_delivered NUMERIC NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(delivery_form_id, job_order_id)
);

CREATE INDEX idx_delivery_forms_org_id ON delivery_forms(org_id);
CREATE INDEX idx_delivery_forms_client_id ON delivery_forms(client_id);
CREATE INDEX idx_delivery_form_items_delivery_form_id ON delivery_form_items(delivery_form_id);
CREATE INDEX idx_delivery_form_items_job_order_id ON delivery_form_items(job_order_id);

-- ============================================================
-- 7. Invoice traceability: nullable links to quotation_id / job_order_id
-- ============================================================

ALTER TABLE invoices ADD COLUMN quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL;
ALTER TABLE invoices ADD COLUMN job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX idx_invoices_job_order_id ON invoices(job_order_id);

-- Now that quotations exist, wire the forward-reference from quotations to
-- the invoice it was converted into.
ALTER TABLE quotations ADD CONSTRAINT fk_quotations_converted_invoice
    FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================================
-- 8. Sequential per-org numbering helpers, matching get_next_invoice_number
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_quotation_number(p_org_id UUID) RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(quotation_number FROM '[0-9]+')::INTEGER), 0) + 1
    INTO next_num
    FROM quotations
    WHERE org_id = p_org_id;

    RETURN 'QUO-' || TO_CHAR(next_num, 'FM000');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_job_order_number(p_org_id UUID) RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(job_order_number FROM '[0-9]+')::INTEGER), 0) + 1
    INTO next_num
    FROM job_orders
    WHERE org_id = p_org_id;

    RETURN 'JOB-' || TO_CHAR(next_num, 'FM000');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_next_delivery_number(p_org_id UUID) RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(delivery_number FROM '[0-9]+')::INTEGER), 0) + 1
    INTO next_num
    FROM delivery_forms
    WHERE org_id = p_org_id;

    RETURN 'DEL-' || TO_CHAR(next_num, 'FM000');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION get_next_quotation_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_quotation_number(UUID) TO authenticated;
REVOKE ALL ON FUNCTION get_next_job_order_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_job_order_number(UUID) TO authenticated;
REVOKE ALL ON FUNCTION get_next_delivery_number(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_next_delivery_number(UUID) TO authenticated;

-- ============================================================
-- 9. New org seeding: default job order status list, per the Mabruk-style
--    flow but generic — every org starts with this and can edit it (Pro+).
-- ============================================================

CREATE OR REPLACE FUNCTION seed_default_job_order_statuses(p_org_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO job_order_statuses (org_id, key, label, sort_order, is_default, is_terminal)
    VALUES
        (p_org_id, 'new', 'New', 1, true, false),
        (p_org_id, 'in_progress', 'In Progress', 2, false, false),
        (p_org_id, 'ready', 'Ready', 3, false, false),
        (p_org_id, 'delivered', 'Delivered', 4, false, true)
    ON CONFLICT (org_id, key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION seed_default_job_order_statuses(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION seed_default_job_order_statuses(UUID) TO authenticated;

-- Hook the seed into whatever already provisions a new organisation.
-- organisations gets its row inserted by the signup flow; a trigger keeps
-- this automatic and matches how other org-scoped defaults are seeded.
CREATE OR REPLACE FUNCTION trg_seed_job_order_statuses() RETURNS TRIGGER AS $$
BEGIN
    PERFORM seed_default_job_order_statuses(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_organisations_seed_job_order_statuses ON organisations;
CREATE TRIGGER trg_organisations_seed_job_order_statuses
    AFTER INSERT ON organisations
    FOR EACH ROW EXECUTE FUNCTION trg_seed_job_order_statuses();

-- Backfill existing orgs that predate this migration.
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM organisations LOOP
        PERFORM seed_default_job_order_statuses(org.id);
    END LOOP;
END;
$$;

-- ============================================================
-- 10. Margin calculation view (per-org configurable cost types roll up
--     into per-job-order and aggregate margin figures)
-- ============================================================

CREATE OR REPLACE VIEW job_order_margins AS
SELECT
    jo.id AS job_order_id,
    jo.org_id,
    jo.job_order_number,
    jo.amount_paid AS revenue,
    COALESCE(SUM(joc.amount), 0) AS total_cost,
    jo.amount_paid - COALESCE(SUM(joc.amount), 0) AS margin,
    CASE
        WHEN jo.amount_paid > 0
        THEN ROUND(((jo.amount_paid - COALESCE(SUM(joc.amount), 0))::NUMERIC / jo.amount_paid) * 100, 2)
        ELSE NULL
    END AS margin_pct
FROM job_orders jo
LEFT JOIN job_order_costs joc ON joc.job_order_id = jo.id
GROUP BY jo.id, jo.org_id, jo.job_order_number, jo.amount_paid;

-- ============================================================
-- 11. RLS policies (mirrors clients/invoices: members read,
--     owner/admin/accountant/sales write)
-- ============================================================

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_order_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_order_cost_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_order_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_form_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org quotations" ON quotations
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = quotations.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org quotations" ON quotations
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = quotations.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org quotation items" ON quotation_items
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = quotation_items.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org quotation items" ON quotation_items
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = quotation_items.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org job order statuses" ON job_order_statuses
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_statuses.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org job order statuses" ON job_order_statuses
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_statuses.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org job order cost types" ON job_order_cost_types
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_cost_types.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org job order cost types" ON job_order_cost_types
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_cost_types.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org job orders" ON job_orders
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_orders.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org job orders" ON job_orders
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_orders.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org job order costs" ON job_order_costs
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_costs.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org job order costs" ON job_order_costs
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_costs.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org job order status history" ON job_order_status_history
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_status_history.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org job order status history" ON job_order_status_history
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = job_order_status_history.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org delivery forms" ON delivery_forms
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = delivery_forms.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org delivery forms" ON delivery_forms
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = delivery_forms.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

CREATE POLICY "Members can view their org delivery form items" ON delivery_form_items
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = delivery_form_items.org_id AND user_id = auth.uid()));
CREATE POLICY "Admins can manage their org delivery form items" ON delivery_form_items
    FOR ALL USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = delivery_form_items.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'accountant', 'sales')));

-- ============================================================
-- 12. Audit triggers
-- ============================================================

CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE OR DELETE ON quotations FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_quotation_items AFTER INSERT OR UPDATE OR DELETE ON quotation_items FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_job_order_statuses AFTER INSERT OR UPDATE OR DELETE ON job_order_statuses FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_job_order_cost_types AFTER INSERT OR UPDATE OR DELETE ON job_order_cost_types FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_job_orders AFTER INSERT OR UPDATE OR DELETE ON job_orders FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_job_order_costs AFTER INSERT OR UPDATE OR DELETE ON job_order_costs FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_delivery_forms AFTER INSERT OR UPDATE OR DELETE ON delivery_forms FOR EACH ROW EXECUTE FUNCTION process_audit_log();
CREATE TRIGGER audit_delivery_form_items AFTER INSERT OR UPDATE OR DELETE ON delivery_form_items FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- ============================================================
-- 13. Job order status transition logging (mirrors the workflow spirit of
--     invoice_status_transitions: record every status change)
-- ============================================================

CREATE OR REPLACE FUNCTION log_job_order_status_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.status_id IS DISTINCT FROM OLD.status_id THEN
        INSERT INTO job_order_status_history (org_id, job_order_id, from_status_id, to_status_id, changed_by)
        VALUES (
            NEW.org_id,
            NEW.id,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status_id ELSE NULL END,
            NEW.status_id,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_job_orders_log_status_change
    AFTER INSERT OR UPDATE ON job_orders
    FOR EACH ROW EXECUTE FUNCTION log_job_order_status_change();

-- ============================================================
-- 14. Entitlements: workflow on Starter+, cost tracking / margin calc /
--     configurable statuses & cost types gated to Pro+ (job_costing)
-- ============================================================

CREATE OR REPLACE FUNCTION has_axis_feature_access(p_org_id UUID, p_feature TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM subscriptions s
    JOIN organisation_members m ON m.org_id = s.org_id AND m.user_id = auth.uid()
    WHERE s.org_id = p_org_id
      AND s.status IN ('trialing', 'active')
      AND COALESCE(s.current_period_end, s.trial_ends_at, now()) > now()
      AND (
        p_feature IN ('clients', 'invoicing', 'finance_core', 'basic_reports', 'quotations', 'job_orders', 'delivery_forms')
        OR (p_feature IN ('advanced_reports', 'inventory', 'job_costing') AND s.plan_id IN ('pro', 'advanced'))
        OR (p_feature IN ('employees', 'custom_email_domain', 'connections') AND s.plan_id = 'advanced')
      )
  );
$$;

REVOKE ALL ON FUNCTION has_axis_feature_access(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION has_axis_feature_access(UUID, TEXT) TO authenticated;

-- Base entitlement (read-only expiry) + plan-gating for the new tables,
-- extending enforce_axis_write_access exactly as it already does for
-- inventory/employees/connections.
CREATE OR REPLACE FUNCTION enforce_axis_write_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  record_org_id UUID;
BEGIN
  record_org_id := COALESCE(
    (to_jsonb(NEW)->>'org_id')::UUID,
    (to_jsonb(OLD)->>'org_id')::UUID
  );

  IF record_org_id IS NULL OR NOT has_axis_write_access(record_org_id) THEN
    RAISE EXCEPTION 'Organisation entitlement is read-only or expired';
  END IF;

  IF TG_TABLE_NAME IN ('items', 'item_movements')
     AND NOT has_axis_feature_access(record_org_id, 'inventory') THEN
    RAISE EXCEPTION 'Inventory requires a Pro or Advanced plan';
  ELSIF TG_TABLE_NAME IN ('employees', 'employee_shifts', 'employee_attendance')
     AND NOT has_axis_feature_access(record_org_id, 'employees') THEN
    RAISE EXCEPTION 'People management requires a Pro or Advanced plan';
  ELSIF TG_TABLE_NAME = 'connections'
     AND COALESCE(to_jsonb(NEW)->>'provider', to_jsonb(OLD)->>'provider') <> 'resend'
     AND NOT has_axis_feature_access(record_org_id, 'connections') THEN
    RAISE EXCEPTION 'Connections require an Advanced plan';
  ELSIF TG_TABLE_NAME IN ('job_order_costs', 'job_order_cost_types')
     AND NOT has_axis_feature_access(record_org_id, 'job_costing') THEN
    RAISE EXCEPTION 'Cost tracking and margin calculation require a Pro or Advanced plan';
  ELSIF TG_TABLE_NAME = 'job_order_statuses'
     AND TG_OP <> 'INSERT'
     AND NOT has_axis_feature_access(record_org_id, 'job_costing') THEN
    -- Editing/removing statuses is Pro+; the initial seeded set (inserted by
    -- seed_default_job_order_statuses via SECURITY DEFINER, not by a
    -- gated end-user write) remains available to every plan.
    RAISE EXCEPTION 'Configurable job order statuses require a Pro or Advanced plan';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'quotations', 'quotation_items', 'job_order_statuses', 'job_order_cost_types',
    'job_orders', 'job_order_costs', 'delivery_forms', 'delivery_form_items'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_entitlement_write ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_entitlement_write BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_axis_write_access()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;

-- seed_default_job_order_statuses runs as SECURITY DEFINER via the
-- organisations AFTER INSERT trigger (not through the authenticated role's
-- own INSERT on job_order_statuses), so it bypasses this entitlement check
-- and every plan gets its initial default statuses regardless of tier.
