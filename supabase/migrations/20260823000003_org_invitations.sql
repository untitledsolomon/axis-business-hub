-- Team invitations
-- Created: 2026-08-23
-- Scope: Section 4 of the Aug 2026 implementation brief — "Invite Member"
-- was a disabled button. This adds a code-based invite flow: an
-- owner/admin generates an invite code + assigns a role, shares the code
-- out-of-band (there's no transactional email service wired into this
-- project yet), and the invitee redeems it after signing in to join the
-- org with that role. This avoids depending on an email-sending Edge
-- Function that doesn't exist in this codebase, while still giving a real,
-- working "add someone to my org" flow rather than a disabled button.

CREATE TABLE org_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email TEXT NOT NULL, -- who this invite is intended for (informational; redemption is by code, not enforced against the redeemer's email, since we don't control signup email verification flow here)
    role org_role NOT NULL DEFAULT 'staff',
    code TEXT NOT NULL UNIQUE, -- short shareable code
    invited_by UUID REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'revoked'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_by UUID REFERENCES profiles(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Only owner/admin can see or manage invitations for their org (invitee
-- redeems by code via a SECURITY DEFINER RPC below, not via direct table
-- access, so no read policy for arbitrary users is needed).
CREATE POLICY "Owners and admins can view their org invitations" ON org_invitations
    FOR SELECT USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = org_invitations.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "Owners and admins can revoke their org invitations" ON org_invitations
    FOR UPDATE USING (EXISTS (SELECT 1 FROM organisation_members WHERE org_id = org_invitations.org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE INDEX idx_org_invitations_org ON org_invitations (org_id, status);
CREATE INDEX idx_org_invitations_code ON org_invitations (code) WHERE status = 'pending';

CREATE TRIGGER audit_org_invitations
  AFTER INSERT OR UPDATE OR DELETE ON org_invitations
  FOR EACH ROW EXECUTE FUNCTION process_audit_log();

-- create_org_invitation_v1: owner/admin generates an invite code for an
-- email + role.
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

-- revoke_org_invitation_v1: owner/admin cancels a pending invite.
CREATE OR REPLACE FUNCTION revoke_org_invitation_v1(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM org_invitations WHERE id = p_invitation_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM organisation_members
    WHERE org_id = v_org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized to revoke this invitation';
  END IF;

  UPDATE org_invitations SET status = 'revoked' WHERE id = p_invitation_id AND status = 'pending';
END;
$$;

-- accept_org_invitation_v1: the signed-in invitee redeems a code, joining
-- the org with the invited role.
CREATE OR REPLACE FUNCTION accept_org_invitation_v1(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite org_invitations%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM org_invitations WHERE code = upper(trim(p_code)) FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invite code not found';
  END IF;

  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'This invite has already been used or revoked';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'This invite has expired';
  END IF;

  IF EXISTS (SELECT 1 FROM organisation_members WHERE org_id = v_invite.org_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'You are already a member of this organisation';
  END IF;

  INSERT INTO organisation_members (org_id, user_id, role)
  VALUES (v_invite.org_id, auth.uid(), v_invite.role);

  UPDATE org_invitations
  SET status = 'accepted', accepted_by = auth.uid(), accepted_at = NOW()
  WHERE id = v_invite.id;

  RETURN v_invite.org_id;
END;
$$;
