-- The "Members can view fellow org members" policy on organisation_members
-- checks membership by querying organisation_members itself (as
-- my_membership). Under RLS, that subquery triggers the same policy again,
-- which queries the table again, recursing infinitely. Postgres detects
-- this and throws "infinite recursion detected in policy for relation
-- organisation_members" instead of hanging.
--
-- This error wasn't surfacing visibly in the app — Supabase's client just
-- returned an empty/failed result for the query in useOrg(), which is why
-- the organisation dropdown appeared empty even though the underlying data
-- (org, membership) was correct. This affected every user, not just one
-- broken account — it would have blocked every future client (Tekowa,
-- Excom, Etihad) from ever seeing their organisation.
--
-- Standard fix: a SECURITY DEFINER helper function bypasses RLS internally
-- (it runs with the privileges of the function owner, not the calling
-- user), so it can safely check membership without re-triggering the
-- policy it's used inside of.

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

-- The "organisations" and "audit_log" policies reference organisation_members
-- directly (not itself), so they don't recurse — but they're rewritten here
-- too, using the same helper, for consistency and to avoid the same class
-- of bug if organisation_members' policy structure changes again later.

DROP POLICY IF EXISTS "Members can view their organisations" ON organisations;
CREATE POLICY "Members can view their organisations" ON organisations
    FOR SELECT USING (is_org_member(id));

DROP POLICY IF EXISTS "Members can view their org audit logs" ON audit_log;
CREATE POLICY "Members can view their org audit logs" ON audit_log
    FOR SELECT USING (is_org_member(org_id));
