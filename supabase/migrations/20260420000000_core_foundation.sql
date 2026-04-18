-- Core Foundation Migration
-- Created: 2026-04-20

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organisations table
CREATE TABLE organisations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    registration_number TEXT,
    tax_id TEXT,
    base_currency TEXT NOT NULL DEFAULT 'UGX',
    fiscal_year_start_month INTEGER NOT NULL DEFAULT 1,
    country TEXT NOT NULL DEFAULT 'Uganda',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Organisation Members (RBAC)
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'accountant', 'hr_manager', 'inventory_manager', 'sales', 'staff', 'read_only');

CREATE TABLE organisation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role org_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 4. Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Profiles: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organisations: Users can only see organisations they belong to
CREATE POLICY "Members can view their organisations" ON organisations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organisation_members
            WHERE org_id = organisations.id AND user_id = auth.uid()
        )
    );

-- Organisation Members: Users can see fellow members in the same org
CREATE POLICY "Members can view fellow org members" ON organisation_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organisation_members AS my_membership
            WHERE my_membership.org_id = organisation_members.org_id AND my_membership.user_id = auth.uid()
        )
    );

-- Audit Log: Members can see audit logs for their org
CREATE POLICY "Members can view their org audit logs" ON audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organisation_members
            WHERE org_id = audit_log.org_id AND user_id = auth.uid()
        )
    );

-- 7. Audit Logging Trigger Function
CREATE OR REPLACE FUNCTION process_audit_log() RETURNS TRIGGER AS $$
DECLARE
    current_org_id UUID;
BEGIN
    -- This assumes we have a way to set the current org_id in the session
    -- In Supabase/Postgres, we can use a custom setting or pull it from the record being changed

    IF (TG_OP = 'DELETE') THEN
        -- Try to get org_id from the old record
        BEGIN
            current_org_id := OLD.org_id;
        EXCEPTION WHEN OTHERS THEN
            current_org_id := NULL;
        END;

        INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        BEGIN
            current_org_id := NEW.org_id;
        EXCEPTION WHEN OTHERS THEN
            current_org_id := NULL;
        END;

        INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        BEGIN
            current_org_id := NEW.org_id;
        EXCEPTION WHEN OTHERS THEN
            current_org_id := NULL;
        END;

        INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Triggers will be added to specific tables as they are created in subsequent migrations.
-- Example for organisations table (though it doesn't have org_id itself, we might handle it specially)
-- CREATE TRIGGER audit_organisations AFTER INSERT OR UPDATE OR DELETE ON organisations FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 8. Helper function for creating new orgs (atomic)
-- 8. Profile creation trigger on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Attach Audit Triggers
CREATE TRIGGER audit_organisations
  AFTER INSERT OR UPDATE OR DELETE ON organisations
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

CREATE TRIGGER audit_organisation_members
  AFTER INSERT OR UPDATE OR DELETE ON organisation_members
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- 10. Helper function for creating new orgs (atomic)
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

    RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
