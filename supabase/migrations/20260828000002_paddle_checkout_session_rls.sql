DROP POLICY IF EXISTS "Organisation members can create checkout sessions" ON public.paddle_checkout_sessions;

CREATE POLICY "Organisation members can create checkout sessions"
  ON public.paddle_checkout_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.organisation_members
      WHERE organisation_members.org_id = paddle_checkout_sessions.org_id
        AND organisation_members.user_id = auth.uid()
    )
  );
