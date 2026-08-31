-- Check seat capacity at invite-creation time, not just at acceptance
-- time. accept_org_invitation_v1 already hits the organisation_members
-- insert trigger (trg_organisation_members_limit) as the real backstop,
-- but without this check an org at its user cap could generate unlimited
-- pending invite codes that only fail once someone tries to redeem them —
-- confusing for both the inviter and the invitee. This gives the inviter
-- a clear error immediately, before a code is even generated.
--
-- Pending invites are counted alongside current members so an org can't
-- over-invite past its seat cap by stacking up unaccepted codes: current
-- members (via get_counted_resource_usage, inside has_capacity_for) +
-- already-pending invites + the 1 new invite being created must fit
-- under the plan's 'users' limit.

CREATE OR REPLACE FUNCTION create_org_invitation_v1(
  p_org_id UUID,
  p_email TEXT,
  p_role org_role
)
RETURNS TABLE(id UUID, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
  new_code TEXT;
  v_pending_invites INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to invite members to this organisation';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot invite someone directly as owner';
  END IF;

  SELECT COUNT(*) INTO v_pending_invites
  FROM org_invitations
  WHERE org_id = p_org_id AND status = 'pending';

  IF NOT has_capacity_for(p_org_id, 'users', 1 + v_pending_invites) THEN
    RAISE EXCEPTION 'Plan limit reached for users';
  END IF;

  -- 8-character uppercase alphanumeric code, collision-checked.
  LOOP
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM org_invitations WHERE code = new_code);
  END LOOP;

  INSERT INTO org_invitations (org_id, email, role, code, invited_by)
  VALUES (p_org_id, lower(trim(p_email)), p_role, new_code, auth.uid())
  RETURNING org_invitations.id INTO new_id;

  RETURN QUERY SELECT new_id, new_code;
END;
$$;
