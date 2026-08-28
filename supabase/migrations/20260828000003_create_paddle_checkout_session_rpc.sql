CREATE OR REPLACE FUNCTION public.create_paddle_checkout_session(
  p_token_hash TEXT,
  p_org_id UUID,
  p_user_id UUID,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organisation_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Organisation access denied';
  END IF;

  INSERT INTO public.paddle_checkout_sessions (token_hash, org_id, user_id, expires_at)
  VALUES (p_token_hash, p_org_id, p_user_id, p_expires_at);
END;
$$;

REVOKE ALL ON FUNCTION public.create_paddle_checkout_session(TEXT, UUID, UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_paddle_checkout_session(TEXT, UUID, UUID, TIMESTAMPTZ) TO authenticated;
