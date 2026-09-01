-- Inventory Foundation Migration
-- Created: 2026-08-23
-- Scope: Shared stock model for Phase 2. This is intentionally simple but
-- flexible enough to support retail stock, custody tracking, and asset lifecycle
-- views without creating three separate schemas.

CREATE TYPE item_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE item_movement_type AS ENUM ('sale', 'purchase', 'adjustment', 'issue', 'return', 'transfer');

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    unit TEXT NOT NULL DEFAULT 'unit',
    status item_status NOT NULL DEFAULT 'active',
    current_quantity INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    cost_price BIGINT NOT NULL DEFAULT 0,
    selling_price BIGINT NOT NULL DEFAULT 0,
    location TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, sku)
);

CREATE TABLE item_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    movement_type item_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost BIGINT NOT NULL DEFAULT 0,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their org items" ON items
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = items.org_id AND user_id = auth.uid()));

CREATE POLICY "Inventory-capable roles can manage their org items" ON items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_members
            WHERE org_id = items.org_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'inventory_manager', 'accountant')
        )
    );

CREATE POLICY "Members can view their org item movements" ON item_movements
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = item_movements.org_id AND user_id = auth.uid()));

CREATE POLICY "Inventory-capable roles can manage their org item movements" ON item_movements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organisation_members
            WHERE org_id = item_movements.org_id
              AND user_id = auth.uid()
              AND role IN ('owner', 'admin', 'inventory_manager', 'accountant')
        )
    );

CREATE TRIGGER audit_items
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_item_movements
  AFTER INSERT OR UPDATE OR DELETE ON item_movements
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE OR REPLACE FUNCTION update_item_quantity_v1(
    p_org_id UUID,
    p_item_id UUID,
    p_quantity_change INTEGER,
    p_movement_type item_movement_type,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_unit_cost BIGINT DEFAULT 0
) RETURNS items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item items;
    v_new_quantity INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM organisation_members
        WHERE org_id = p_org_id
          AND user_id = auth.uid()
          AND role IN ('owner', 'admin', 'inventory_manager', 'accountant')
    ) THEN
        RAISE EXCEPTION 'Not authorized to manage inventory for this organisation';
    END IF;

    SELECT * INTO v_item
    FROM items
    WHERE id = p_item_id AND org_id = p_org_id
    FOR UPDATE;

    IF v_item IS NULL THEN
        RAISE EXCEPTION 'Item not found in this organisation';
    END IF;

    v_new_quantity := v_item.current_quantity + p_quantity_change;
    IF v_new_quantity < 0 THEN
        RAISE EXCEPTION 'Inventory would go negative for %', v_item.name;
    END IF;

    UPDATE items
    SET current_quantity = v_new_quantity,
        cost_price = COALESCE(NULLIF(p_unit_cost, 0), cost_price),
        updated_at = NOW()
    WHERE id = p_item_id;

    INSERT INTO item_movements (
        org_id,
        item_id,
        movement_type,
        quantity,
        unit_cost,
        reference,
        notes
    ) VALUES (
        p_org_id,
        p_item_id,
        p_movement_type,
        p_quantity_change,
        COALESCE(p_unit_cost, 0),
        p_reference,
        p_notes
    );

    RETURN (SELECT * FROM items WHERE id = p_item_id);
END;
$$;
