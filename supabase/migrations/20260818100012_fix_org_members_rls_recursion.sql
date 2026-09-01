-- Placeholder for remote Supabase migration
-- Remote version: 20260818100012
-- Remote name: fix_org_members_rls_recursion
-- IMPORTANT: Replace this placeholder with the exact SQL from the Supabase project.
-- Suggested ways to obtain the SQL:
-- 1) Locally with supabase CLI (example -- adjust for your CLI version):
--    supabase migrations download --project-ref <PROJECT_REF> --name 'fix_org_members_rls_recursion' --output 'D:\\Projects\\copilot-worktrees\\axis-business-hub\\dawnagent80-verbose-memory\\supabase\\migrations\20260818100012_fix_org_members_rls_recursion.sql'
-- 2) From Supabase Studio: Project -> Database -> Migrations -> find the migration and download the SQL.
-- After replacing, commit and push. Do NOT change the filename; Supabase tracks migrations by filename/version.

CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = check_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Members can view fellow org members" ON organisation_members;
CREATE POLICY "Members can view fellow org members" ON organisation_members
    FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "Members can view their organisations" ON organisations;
CREATE POLICY "Members can view their organisations" ON organisations
    FOR SELECT USING (is_org_member(id));

DROP POLICY IF EXISTS "Members can view their org audit logs" ON audit_log;
CREATE POLICY "Members can view their org audit logs" ON audit_log
    FOR SELECT USING (is_org_member(org_id));


