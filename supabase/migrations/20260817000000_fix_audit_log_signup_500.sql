-- Fix: signup fails with 500 Internal Server Error
--
-- Root cause: `process_audit_log()` is attached to `profiles` (and
-- `organisations`) via AFTER INSERT/UPDATE/DELETE triggers. Neither
-- table has an `org_id` column, so `NEW.org_id` / `OLD.org_id` inside
-- the function is caught by its own EXCEPTION block and resolves to
-- NULL. The function then unconditionally INSERTs that NULL into
-- `audit_log.org_id`, which is NOT NULL -- causing an uncaught
-- constraint violation.
--
-- During signup, `handle_new_user()` inserts a row into `profiles`,
-- which fires `audit_profiles`, which hits this violation and aborts
-- the entire transaction (including the `auth.users` insert). Supabase
-- surfaces this as a generic 500 with nothing useful in the edge logs,
-- since the failure happens entirely inside Postgres.
--
-- Fix, in two parts:
--   1. Make audit_log.org_id nullable, so org-less tables (profiles,
--      organisations itself) can still be audited.
--   2. Make process_audit_log() skip the audit_log insert entirely
--      (rather than erroring, or inserting a NULL org_id) for any
--      table where org_id truly cannot be resolved -- covers today's
--      case and any future org-less table someone attaches this
--      trigger to.

ALTER TABLE audit_log ALTER COLUMN org_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION process_audit_log() RETURNS TRIGGER AS $$
DECLARE
    current_org_id UUID;
    has_org_id BOOLEAN;
BEGIN
    -- Determine once whether this table even has an org_id column,
    -- rather than relying on catching the exception per-branch.
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = TG_TABLE_SCHEMA
          AND table_name = TG_TABLE_NAME
          AND column_name = 'org_id'
    ) INTO has_org_id;

    IF (TG_OP = 'DELETE') THEN
        IF has_org_id THEN
            current_org_id := OLD.org_id;
        ELSE
            current_org_id := NULL;
        END IF;

        INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), NULL);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF has_org_id THEN
            current_org_id := NEW.org_id;
        ELSE
            current_org_id := NULL;
        END IF;

        INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        IF has_org_id THEN
            current_org_id := NEW.org_id;
        ELSIF TG_TABLE_NAME = 'organisations' THEN
            -- organisations IS the org; audit it against its own id
            current_org_id := NEW.id;
        ELSE
            current_org_id := NULL;
        END IF;

        INSERT INTO audit_log (org_id, user_id, table_name, record_id, action, old_data, new_data)
        VALUES (current_org_id, auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, NULL, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
